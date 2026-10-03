import { Prisma, type RequestStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import type { OrderRequestDto, OrderSummaryDto } from "../../types/order";
import { AppError } from "../middleware/error-handler";
import type { SubmitOrderInput } from "../validators/order";
import { notifyOrderEvent } from "./order-notifications";
import { isConfirmed, statusLabel } from "./order-status";
import { loadForParty, REQUEST_INCLUDE, type RequestRow, toDecimal, toDto } from "./order-core";

/**
 * Order request submission and history (FR-28 – FR-30, FR-36).
 *
 * Rules enforced here rather than in the UI:
 * - one seller per request (ER §6),
 * - products must be live and available, and quantities must meet the
 *   seller's stated MOQ (BR-07, BR-09),
 * - product details are snapshotted so later edits cannot rewrite history
 *   (BR-08),
 * - every total is computed from validated quantities and prices — client
 *   totals are never trusted (BR-11),
 * - only the two parties can see a request.
 */

/** Human-facing reference, e.g. REQ-7K2QX4. */
function newReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `REQ-${suffix}`;
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/**
 * Creates a request for the signed-in buyer (FR-28, FR-29).
 * Throws 400 with field details when a product is not requestable or the
 * quantity misses the seller's MOQ.
 */
export async function submitOrderRequest(
  buyer: AuthUser,
  input: SubmitOrderInput
): Promise<OrderRequestDto> {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { seller: true, variants: { select: { name: true, value: true } } },
  });

  const byId = new Map(products.map((product) => [product.id, product]));
  const missing = productIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new AppError(400, "PRODUCT_NOT_FOUND", "One of the selected products no longer exists.");
  }

  // One seller per request: split multi-seller baskets client-side.
  const sellerIds = new Set(products.map((product) => product.sellerId));
  if (sellerIds.size > 1) {
    throw new AppError(
      400,
      "ONE_SELLER_PER_REQUEST",
      "Submit a separate request for each seller you want to order from."
    );
  }
  const sellerId = products[0]!.sellerId;

  const unavailable = products.filter(
    (product) => product.status !== "ACTIVE" || !product.isAvailable
  );
  if (unavailable.length > 0) {
    throw new AppError(
      400,
      "PRODUCT_UNAVAILABLE",
      "Some products are no longer open for orders. Remove them and try again.",
      { products: unavailable.map((product) => product.name) }
    );
  }

  // The seller must still be able to receive requests (BR-02).
  const seller = products[0]!.seller;
  if (seller.status !== "ACTIVE" || seller.role !== "SELLER") {
    throw new AppError(
      409,
      "SELLER_UNAVAILABLE",
      "This seller is not currently accepting order requests."
    );
  }
  const sellerProfile = await db.businessProfile.findUnique({ where: { userId: sellerId } });
  if (!sellerProfile) {
    throw new AppError(
      409,
      "SELLER_UNAVAILABLE",
      "This seller has not completed their business profile yet."
    );
  }

  // MOQ (BR-07) and variant sanity checks.
  const details: Array<{ path: string; message: string }> = [];
  for (const [index, item] of input.items.entries()) {
    const product = byId.get(item.productId)!;
    if (product.minimumOrderQuantity && item.quantity < product.minimumOrderQuantity) {
      details.push({
        path: `items.${index}.quantity`,
        message: `The seller requires a minimum of ${product.minimumOrderQuantity} units for ${product.name}.`,
      });
    }
    if (item.variantLabel) {
      const match = product.variants.some(
        (variant) =>
          variant.value.toLowerCase() === item.variantLabel!.toLowerCase() ||
          `${variant.name}: ${variant.value}`.toLowerCase() === item.variantLabel!.toLowerCase()
      );
      if (!match) {
        details.push({
          path: `items.${index}.variantLabel`,
          message: `Choose one of the listed options for ${product.name}.`,
        });
      }
    }
  }
  if (details.length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "The request contains invalid fields.", details);
  }

  const created = await db.$transaction(async (tx) => {
    // Retry on the unlikely reference collision.
    let reference = newReference();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const clash = await tx.orderRequest.findUnique({ where: { reference } });
      if (!clash) break;
      reference = newReference();
    }

    const request = await tx.orderRequest.create({
      data: {
        reference,
        buyerId: buyer.id,
        sellerId,
        status: "PENDING_SELLER",
        deliveryAddress: input.deliveryAddress,
        buyerNotes: input.buyerNotes,
        items: {
          create: input.items.map((item) => {
            const product = byId.get(item.productId)!;
            return {
              productId: product.id,
              productNameSnapshot: product.name,
              variantSnapshot: item.variantLabel ?? null,
              quantity: item.quantity,
              requestedUnitPrice: item.requestedUnitPrice
                ? toDecimal(item.requestedUnitPrice)
                : null,
            };
          }),
        },
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: "PENDING_SELLER",
            changedById: buyer.id,
            note: "Request submitted by buyer",
          },
        },
      },
      include: REQUEST_INCLUDE,
    });
    return request;
  });

  const dto = toDto(created);
  await notifyOrderEvent({
    order: {
      id: created.id,
      reference: created.reference,
      buyerId: created.buyerId,
      sellerId: created.sellerId,
    },
    nextStatus: created.status,
    actorId: buyer.id,
    itemSummary: dto.items.map((item) => `${item.productName} ×${item.quantity}`).join(", "),
    note: null,
  });
  return dto;
}

export async function getOrderRequest(user: AuthUser, requestId: string): Promise<OrderRequestDto> {
  return toDto(await loadForParty(user, requestId), user);
}

function toSummary(row: RequestRow, viewer: AuthUser): OrderSummaryDto {
  const first = row.items[0];
  const counterparty = viewer.id === row.buyerId ? row.seller : row.buyer;
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    statusLabel: statusLabel(row.status),
    confirmed: isConfirmed(row.status),
    itemSummary: first
      ? `${first.productNameSnapshot} ×${first.proposedQuantity ?? first.quantity}${
          row.items.length > 1 ? ` +${row.items.length - 1} more` : ""
        }`
      : "No items",
    itemCount: row.items.length,
    total: (row.agreedTotal ?? row.proposedTotal)?.toString() ?? null,
    counterpartyName: counterparty.businessProfile?.businessName ?? counterparty.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Requests where the user is the buyer or the seller, newest first. */
export async function listOrderRequests(
  user: AuthUser,
  options: { status?: RequestStatus; page?: number; pageSize?: number } = {}
): Promise<{ items: OrderSummaryDto[]; total: number; counts: Record<string, number> }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const where: Prisma.OrderRequestWhereInput = {
    ...(user.role === "BUYER" ? { buyerId: user.id } : { sellerId: user.id }),
    ...(options.status ? { status: options.status } : {}),
  };

  const [rows, total, grouped] = await Promise.all([
    db.orderRequest.findMany({
      where: { ...where, status: options.status },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: REQUEST_INCLUDE,
    }),
    db.orderRequest.count({ where }),
    db.orderRequest.groupBy({
      by: ["status"],
      where: {
        ...(user.role === "BUYER" ? { buyerId: user.id } : { sellerId: user.id }),
      },
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const group of grouped) counts[group.status] = group._count._all;

  return { items: rows.map((row) => toSummary(row, user)), total, counts };
}

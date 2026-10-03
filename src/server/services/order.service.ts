import { randomBytes } from "node:crypto";
import { Prisma, type RequestStatus } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import type { OrderItemDto, OrderRequestDto, OrderSummaryDto } from "../../types/order";
import { AppError, NotFoundError } from "../middleware/error-handler";
import type { AcceptOrderInput, ProposeChangesInput, SubmitOrderInput } from "../validators/order";
import {
  assertTransition,
  isConfirmed,
  statusLabel,
  type OrderAction,
  type OrderActor,
} from "./order-status";

/**
 * Order request workflow (FR-28 – FR-37).
 *
 * Rules enforced here rather than in the UI:
 * - one seller per request (ER §6),
 * - products must be live and available, and quantities must meet the
 *   seller's stated MOQ (BR-07, BR-09),
 * - product details are snapshotted so later edits cannot rewrite history
 *   (BR-08),
 * - every total is computed from validated quantities and prices — client
 *   totals are never trusted (BR-11),
 * - only the two parties can see or act on a request,
 * - every transition goes through the status machine and is written to the
 *   history table.
 */

type RequestRow = Prisma.OrderRequestGetPayload<{
  include: {
    items: { include: { product: { select: { name: true; status: true } } } };
    statusHistory: { include: { changedBy: { select: { name: true; role: true } } } };
    buyer: { include: { businessProfile: { select: { businessName: true; city: true } } } };
    seller: { include: { businessProfile: { select: { businessName: true; city: true } } } };
  };
}>;

const REQUEST_INCLUDE = {
  items: { include: { product: { select: { name: true, status: true } } }, orderBy: { id: "asc" } },
  statusHistory: {
    include: { changedBy: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  },
  buyer: { include: { businessProfile: { select: { businessName: true, city: true } } } },
  seller: { include: { businessProfile: { select: { businessName: true, city: true } } } },
} satisfies Prisma.OrderRequestInclude;

/** Line-level term update applied atomically with the status transition. */
interface ItemUpdate {
  id: string;
  data: Prisma.OrderItemUpdateManyMutationInput;
}

function actorFor(user: AuthUser): OrderActor {
  return user.role === "BUYER" ? "BUYER" : "SELLER";
}

/** Human-facing reference, e.g. REQ-7K2QX4. */
function newReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `REQ-${suffix}`;
}

function toDecimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Sum of quantity × price; returns null when any line lacks a price. */
function computeTotal(
  lines: Array<{ quantity: number; unitPrice: Prisma.Decimal | null }>
): Prisma.Decimal | null {
  if (lines.length === 0 || lines.some((line) => line.unitPrice === null)) return null;
  return lines.reduce(
    (total, line) =>
      total.add(toDecimal(String(line.quantity)).mul(line.unitPrice as Prisma.Decimal)),
    new Prisma.Decimal(0)
  );
}

function itemDto(row: RequestRow["items"][number]): OrderItemDto {
  const proposedQuantity = row.proposedQuantity;
  const proposedUnitPrice = row.proposedUnitPrice?.toString() ?? null;
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productNameSnapshot,
    variant: row.variantSnapshot,
    productActive: row.product.status === "ACTIVE",
    quantity: row.quantity,
    requestedUnitPrice: row.requestedUnitPrice?.toString() ?? null,
    agreedUnitPrice: row.agreedUnitPrice?.toString() ?? null,
    proposedQuantity,
    proposedUnitPrice,
    effectiveQuantity: proposedQuantity ?? row.quantity,
    effectiveUnitPrice: proposedUnitPrice ?? row.agreedUnitPrice?.toString() ?? null,
  };
}

function toDto(row: RequestRow): OrderRequestDto {
  const proposalEntry = [...row.statusHistory]
    .reverse()
    .find((entry) => entry.newStatus === "SELLER_PROPOSED" || entry.newStatus === "AWAITING_BUYER");
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    statusLabel: statusLabel(row.status),
    confirmed: isConfirmed(row.status),
    deliveryAddress: row.deliveryAddress,
    buyerNotes: row.buyerNotes,
    proposedTotal: row.proposedTotal?.toString() ?? null,
    agreedTotal: row.agreedTotal?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(itemDto),
    buyer: {
      id: row.buyer.id,
      name: row.buyer.name,
      businessName: row.buyer.businessProfile?.businessName ?? null,
      city: row.buyer.businessProfile?.city ?? null,
    },
    seller: {
      id: row.seller.id,
      name: row.seller.name,
      businessName: row.seller.businessProfile?.businessName ?? null,
      city: row.seller.businessProfile?.city ?? null,
    },
    proposalNote: proposalEntry?.note ?? null,
    history: row.statusHistory.map((entry) => ({
      id: entry.id,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      statusLabel: statusLabel(entry.newStatus),
      note: entry.note,
      changedByName: entry.changedBy.name,
      changedByRole:
        entry.changedBy.role === "BUYER"
          ? "BUYER"
          : entry.changedBy.role === "SELLER"
            ? "SELLER"
            : "ADMIN",
      createdAt: entry.createdAt.toISOString(),
    })),
  };
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

  return toDto(created);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Loads a request only if the caller is one of its two parties. */
async function loadForParty(user: AuthUser, requestId: string): Promise<RequestRow> {
  const request = await db.orderRequest.findUnique({
    where: { id: requestId },
    include: REQUEST_INCLUDE,
  });
  if (!request) throw new NotFoundError("Order request");
  if (request.buyerId !== user.id && request.sellerId !== user.id) {
    // Do not confirm that someone else's request exists.
    throw new NotFoundError("Order request");
  }
  return request;
}

export async function getOrderRequest(user: AuthUser, requestId: string): Promise<OrderRequestDto> {
  return toDto(await loadForParty(user, requestId));
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

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Applies a status transition and records it in the history table
 * (BR-10: only permitted transitions, always recorded).
 */
async function applyTransition(
  request: RequestRow,
  user: AuthUser,
  action: OrderAction,
  options: {
    note?: string | null;
    agreedTotal?: Prisma.Decimal | null;
    proposedTotal?: Prisma.Decimal | null;
    itemUpdates?: ItemUpdate[];
  } = {}
): Promise<OrderRequestDto> {
  const actor = actorFor(user);
  const nextStatus = assertTransition(request.status, action, actor);

  const updated = await db.$transaction(async (tx) => {
    for (const update of options.itemUpdates ?? []) {
      await tx.orderItem.update({ where: { id: update.id }, data: update.data });
    }
    return tx.orderRequest.update({
      where: { id: request.id },
      data: {
        status: nextStatus,
        ...(options.agreedTotal !== undefined ? { agreedTotal: options.agreedTotal } : {}),
        ...(options.proposedTotal !== undefined ? { proposedTotal: options.proposedTotal } : {}),
        statusHistory: {
          create: {
            previousStatus: request.status,
            newStatus: nextStatus,
            changedById: user.id,
            note: options.note ?? null,
          },
        },
      },
      include: REQUEST_INCLUDE,
    });
  });

  return toDto(updated);
}

/** Seller confirms stock, price, and delivery feasibility (FR-31). */
export async function acceptOrderRequest(
  seller: AuthUser,
  requestId: string,
  input: AcceptOrderInput
): Promise<OrderRequestDto> {
  const request = await loadForParty(seller, requestId);
  if (seller.id !== request.sellerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the receiving seller can accept this request.");
  }

  const prices = new Map(input.items.map((item) => [item.itemId, item.agreedUnitPrice]));
  const unknown = input.items.filter(
    (item) => !request.items.some((row) => row.id === item.itemId)
  );
  if (unknown.length > 0) {
    throw new AppError(400, "INVALID_ITEM", "One of the items is not part of this request.");
  }
  const missing = request.items.filter((item) => !prices.has(item.id));
  if (missing.length > 0) {
    throw new AppError(
      400,
      "PRICE_REQUIRED",
      "Confirm a final unit price for every requested product before accepting.",
      { products: missing.map((item) => item.productNameSnapshot) }
    );
  }

  // Availability is re-checked at confirmation time (BR-09).
  const productIds = request.items.map((item) => item.productId);
  const products = await db.product.findMany({ where: { id: { in: productIds } } });
  const closed = products.filter((product) => product.status !== "ACTIVE");
  if (closed.length > 0) {
    throw new AppError(
      409,
      "PRODUCT_UNAVAILABLE",
      "Some products are no longer live. Ask the buyer to submit a new request.",
      { products: closed.map((product) => product.name) }
    );
  }

  const itemUpdates: ItemUpdate[] = request.items.map((item) => {
    const price = toDecimal(prices.get(item.id)!);
    const quantity = item.proposedQuantity ?? item.quantity;
    return {
      id: item.id,
      data: {
        quantity,
        agreedUnitPrice: price,
        proposedQuantity: null,
        proposedUnitPrice: null,
      },
    };
  });

  const agreedTotal = computeTotal(
    request.items.map((item) => ({
      quantity: item.proposedQuantity ?? item.quantity,
      unitPrice: toDecimal(prices.get(item.id)!),
    }))
  );

  return applyTransition(request, seller, "ACCEPT", {
    note: input.note ?? "Terms confirmed by seller",
    agreedTotal,
    proposedTotal: null,
    itemUpdates,
  });
}

/** Seller declines the request (FR-32). */
export async function rejectOrderRequest(
  seller: AuthUser,
  requestId: string,
  note?: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(seller, requestId);
  if (seller.id !== request.sellerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the receiving seller can reject this request.");
  }
  return applyTransition(request, seller, "REJECT", { note: note ?? null });
}

/**
 * Seller proposes different quantities and/or prices (FR-33). The proposal
 * stays private to the seller until it is sent, so figures can be corrected
 * before the buyer sees them.
 */
export async function proposeOrderChanges(
  seller: AuthUser,
  requestId: string,
  input: ProposeChangesInput
): Promise<OrderRequestDto> {
  const request = await loadForParty(seller, requestId);
  if (seller.id !== request.sellerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the receiving seller can propose changes.");
  }

  const proposals = new Map(
    input.items.map((item) => [
      item.itemId,
      {
        quantity: item.proposedQuantity,
        price: item.proposedUnitPrice,
      },
    ])
  );
  const unknown = input.items.filter(
    (item) => !request.items.some((row) => row.id === item.itemId)
  );
  if (unknown.length > 0) {
    throw new AppError(400, "INVALID_ITEM", "One of the items is not part of this request.");
  }

  const itemUpdates: ItemUpdate[] = request.items.map((item) => {
    const proposal = proposals.get(item.id);
    const quantity = proposal?.quantity ?? item.proposedQuantity ?? item.quantity;
    const price = proposal
      ? toDecimal(proposal.price)
      : (item.proposedUnitPrice ?? item.agreedUnitPrice);
    return {
      id: item.id,
      data: {
        proposedQuantity: quantity,
        proposedUnitPrice: price,
      },
    };
  });

  const proposedTotal = computeTotal(
    request.items.map((item) => {
      const proposal = proposals.get(item.id);
      return {
        quantity: proposal?.quantity ?? item.proposedQuantity ?? item.quantity,
        unitPrice: proposal
          ? toDecimal(proposal.price)
          : (item.proposedUnitPrice ?? item.agreedUnitPrice),
      };
    })
  );

  const action: OrderAction = request.status === "SELLER_PROPOSED" ? "REVISE_PROPOSAL" : "PROPOSE";
  return applyTransition(request, seller, action, {
    note: input.note ?? null,
    proposedTotal,
    itemUpdates,
  });
}

/** Sends the drafted proposal to the buyer for a decision (FR-33). */
export async function sendProposalToBuyer(
  seller: AuthUser,
  requestId: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(seller, requestId);
  if (seller.id !== request.sellerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the receiving seller can send this proposal.");
  }
  if (!request.proposedTotal && !request.items.some((item) => item.proposedUnitPrice !== null)) {
    throw new AppError(409, "NO_PROPOSAL", "Add proposed terms before sending them to the buyer.");
  }
  const note = [...request.statusHistory]
    .reverse()
    .find((entry) => entry.newStatus === "SELLER_PROPOSED")?.note;
  return applyTransition(request, seller, "SEND_PROPOSAL", { note: note ?? null });
}

/**
 * Buyer accepts the seller's terms (FR-34): the proposed figures become the
 * agreed terms and the request becomes a confirmed order (BR-05).
 */
export async function acceptProposal(
  buyer: AuthUser,
  requestId: string,
  note?: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(buyer, requestId);
  if (buyer.id !== request.buyerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the buyer can accept the proposed terms.");
  }
  if (request.status !== "AWAITING_BUYER") {
    throw new AppError(
      409,
      "NO_PROPOSAL",
      "There are no proposed terms waiting for your response."
    );
  }

  const itemUpdates: ItemUpdate[] = request.items.map((item) => {
    const price = item.proposedUnitPrice ?? item.agreedUnitPrice;
    if (!price) {
      throw new AppError(
        409,
        "PROPOSAL_INCOMPLETE",
        `The seller has not confirmed a price for ${item.productNameSnapshot}.`
      );
    }
    return {
      id: item.id,
      data: {
        quantity: item.proposedQuantity ?? item.quantity,
        agreedUnitPrice: price,
        proposedQuantity: null,
        proposedUnitPrice: null,
      },
    };
  });

  const agreedTotal = computeTotal(
    request.items.map((item) => ({
      quantity: item.proposedQuantity ?? item.quantity,
      unitPrice: item.proposedUnitPrice ?? item.agreedUnitPrice,
    }))
  );

  return applyTransition(request, buyer, "ACCEPT_PROPOSAL", {
    note: note ?? "Proposed terms accepted by buyer",
    agreedTotal,
    itemUpdates,
  });
}

/** Buyer declines the seller's counter-offer (FR-34). */
export async function declineProposal(
  buyer: AuthUser,
  requestId: string,
  note?: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(buyer, requestId);
  if (buyer.id !== request.buyerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the buyer can decline the proposed terms.");
  }
  return applyTransition(request, buyer, "DECLINE_PROPOSAL", { note: note ?? null });
}

/** Buyer withdraws a request that has not been accepted (FR-37). */
export async function cancelOrderRequest(
  buyer: AuthUser,
  requestId: string,
  note?: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(buyer, requestId);
  if (buyer.id !== request.buyerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the buyer can cancel this request.");
  }
  return applyTransition(request, buyer, "CANCEL", { note: note ?? null });
}

/** Seller marks the confirmed order as fulfilled (FR-35). */
export async function completeOrderRequest(
  seller: AuthUser,
  requestId: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(seller, requestId);
  if (seller.id !== request.sellerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the seller can mark the order complete.");
  }
  return applyTransition(request, seller, "COMPLETE", { note: "Fulfillment completed" });
}

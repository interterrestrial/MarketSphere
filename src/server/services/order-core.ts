import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import type { OrderItemDto, OrderRequestDto } from "../../types/order";
import { NotFoundError } from "../middleware/error-handler";
import {
  assertTransition,
  isConfirmed,
  statusLabel,
  type OrderAction,
  type OrderActor,
} from "./order-status";

/**
 * Internals shared across the order request workflow: party-checked loading,
 * DTO mapping, money maths, and the transactional status transition that
 * always writes a history entry. Business rules stay in the public services.
 */

export type RequestRow = Prisma.OrderRequestGetPayload<{
  include: {
    items: { include: { product: { select: { name: true; status: true } } } };
    statusHistory: { include: { changedBy: { select: { name: true; role: true } } } };
    buyer: { include: { businessProfile: { select: { businessName: true; city: true } } } };
    seller: { include: { businessProfile: { select: { businessName: true; city: true } } } };
  };
}>;

export const REQUEST_INCLUDE = {
  items: { include: { product: { select: { name: true, status: true } } }, orderBy: { id: "asc" } },
  statusHistory: {
    include: { changedBy: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  },
  buyer: { include: { businessProfile: { select: { businessName: true, city: true } } } },
  seller: { include: { businessProfile: { select: { businessName: true, city: true } } } },
} satisfies Prisma.OrderRequestInclude;

/** Line-level term update applied atomically with the status transition. */
export interface ItemUpdate {
  id: string;
  data: Prisma.OrderItemUpdateManyMutationInput;
}

export function actorFor(user: AuthUser): OrderActor {
  return user.role === "BUYER" ? "BUYER" : "SELLER";
}

export function toDecimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Sum of quantity × price; returns null when any line lacks a price. */
export function computeTotal(
  lines: Array<{ quantity: number; unitPrice: Prisma.Decimal | null }>
): Prisma.Decimal | null {
  if (lines.length === 0 || lines.some((line) => line.unitPrice === null)) return null;
  return lines.reduce(
    (total, line) =>
      total.add(toDecimal(String(line.quantity)).mul(line.unitPrice as Prisma.Decimal)),
    new Prisma.Decimal(0)
  );
}

export function itemDto(row: RequestRow["items"][number], hideProposal = false): OrderItemDto {
  // A drafted proposal stays private to the seller until it is sent to the
  // buyer, so nothing here can be mistaken for agreed terms.
  const proposedQuantity = hideProposal ? null : row.proposedQuantity;
  const proposedUnitPrice = hideProposal ? null : (row.proposedUnitPrice?.toString() ?? null);
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

export function toDto(row: RequestRow, viewer?: AuthUser): OrderRequestDto {
  const hideProposal = viewer?.role === "BUYER" && row.status === "SELLER_PROPOSED";
  const proposalEntry = hideProposal
    ? undefined
    : [...row.statusHistory]
        .reverse()
        .find(
          (entry) => entry.newStatus === "SELLER_PROPOSED" || entry.newStatus === "AWAITING_BUYER"
        );
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    statusLabel: statusLabel(row.status),
    confirmed: isConfirmed(row.status),
    deliveryAddress: row.deliveryAddress,
    buyerNotes: row.buyerNotes,
    proposedTotal: hideProposal ? null : (row.proposedTotal?.toString() ?? null),
    agreedTotal: row.agreedTotal?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => itemDto(item, hideProposal)),
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

export async function loadForParty(user: AuthUser, requestId: string): Promise<RequestRow> {
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

export async function applyTransition(
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

  return toDto(updated, user);
}

import type { RequestStatus } from "@prisma/client";

/**
 * Order request DTOs for the buyer and seller UIs. Prices are strings
 * (PostgreSQL numeric), dates ISO strings.
 */

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  variant: string | null;
  /** True when the listing is still visible to buyers (archived listings drop out). */
  productActive: boolean;
  quantity: number;
  requestedUnitPrice: string | null;
  agreedUnitPrice: string | null;
  proposedQuantity: number | null;
  proposedUnitPrice: string | null;
  /** Effective quantity the seller will act on (proposal wins until accepted). */
  effectiveQuantity: number;
  effectiveUnitPrice: string | null;
}

export interface OrderHistoryEntryDto {
  id: string;
  previousStatus: RequestStatus | null;
  newStatus: RequestStatus;
  statusLabel: string;
  note: string | null;
  changedByName: string;
  changedByRole: "BUYER" | "SELLER" | "ADMIN";
  createdAt: string;
}

export interface OrderPartyDto {
  id: string;
  name: string;
  businessName: string | null;
  city: string | null;
}

export interface OrderRequestDto {
  id: string;
  reference: string;
  status: RequestStatus;
  statusLabel: string;
  /** True while the seller has not confirmed — the UI must not imply a sale. */
  confirmed: boolean;
  deliveryAddress: string | null;
  buyerNotes: string | null;
  proposedTotal: string | null;
  agreedTotal: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
  buyer: OrderPartyDto;
  seller: OrderPartyDto;
  /** Note attached to the seller's most recent proposal, if any. */
  proposalNote: string | null;
  history: OrderHistoryEntryDto[];
}

/** Row used in dashboards, where the item list is not needed. */
export interface OrderSummaryDto {
  id: string;
  reference: string;
  status: RequestStatus;
  statusLabel: string;
  confirmed: boolean;
  itemSummary: string;
  itemCount: number;
  total: string | null;
  counterpartyName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Statuses in which the buyer may still withdraw a request (FR-37). Kept
 * here so the status machine and the UI agree on one list.
 */
export const BUYER_CANCELLABLE_STATUSES: RequestStatus[] = [
  "PENDING_SELLER",
  "SELLER_PROPOSED",
  "AWAITING_BUYER",
];

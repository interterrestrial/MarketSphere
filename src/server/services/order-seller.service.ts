import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import type { OrderRequestDto } from "../../types/order";
import { AppError } from "../middleware/error-handler";
import type { AcceptOrderInput, ProposeChangesInput } from "../validators/order";
import {
  applyTransition,
  computeTotal,
  type ItemUpdate,
  loadForParty,
  toDecimal,
} from "./order-core";
import type { OrderAction } from "./order-status";

/**
 * Seller responses to an incoming request (FR-30 – FR-33): confirm the order,
 * decline it, or counter with different quantities and prices.
 */

function assertSellerParty(seller: AuthUser, request: { sellerId: string }): void {
  if (seller.id !== request.sellerId) {
    throw new AppError(
      403,
      "ROLE_FORBIDDEN",
      "Only the receiving seller can respond to this request."
    );
  }
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

/** Seller marks the confirmed order as fulfilled (FR-35). */
export async function completeOrderRequest(
  seller: AuthUser,
  requestId: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(seller, requestId);
  assertSellerParty(seller, request);
  return applyTransition(request, seller, "COMPLETE", { note: "Fulfillment completed" });
}

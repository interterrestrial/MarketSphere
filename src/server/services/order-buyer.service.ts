import type { AuthUser } from "../../types/auth";
import type { OrderRequestDto } from "../../types/order";
import { AppError } from "../middleware/error-handler";
import { applyTransition, computeTotal, type ItemUpdate, loadForParty } from "./order-core";

/**
 * Buyer responses to the seller's counter-offer (FR-34) and withdrawal of a
 * request that has not been accepted (FR-37).
 */

function assertBuyerParty(buyer: AuthUser, request: { buyerId: string }): void {
  if (buyer.id !== request.buyerId) {
    throw new AppError(403, "ROLE_FORBIDDEN", "Only the buyer can respond to this request.");
  }
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
  assertBuyerParty(buyer, request);
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
  assertBuyerParty(buyer, request);
  return applyTransition(request, buyer, "DECLINE_PROPOSAL", { note: note ?? null });
}

/** Buyer withdraws a request that has not been accepted (FR-37). */
export async function cancelOrderRequest(
  buyer: AuthUser,
  requestId: string,
  note?: string
): Promise<OrderRequestDto> {
  const request = await loadForParty(buyer, requestId);
  assertBuyerParty(buyer, request);
  return applyTransition(request, buyer, "CANCEL", { note: note ?? null });
}

import type { RequestStatus } from "@prisma/client";
import { formatMoney } from "../../lib/format";
import type { OrderRequestDto } from "../../types/order";
import { notify } from "./notification.service";

/**
 * Turns order workflow events into in-app notifications (FR-39).
 *
 * Rules:
 * - the counterparty is notified, never the actor,
 * - a drafted proposal (`SELLER_PROPOSED`) notifies nobody — the buyer must
 *   not learn about terms the seller has not sent yet,
 * - notices always name the request reference so both sides can talk about
 *   the same request.
 */
export async function notifyOrderEvent(params: {
  order: Pick<OrderRequestDto, "id" | "reference"> & { buyerId: string; sellerId: string };
  nextStatus: RequestStatus;
  actorId: string;
  itemSummary: string;
  agreedTotal?: string | null;
  note?: string | null;
}): Promise<void> {
  const { order, nextStatus, actorId } = params;

  // A proposal the seller is still drafting stays private.
  if (nextStatus === "SELLER_PROPOSED") return;

  const buyerIsActor = actorId === order.buyerId;
  const recipientId =
    nextStatus === "PENDING_SELLER"
      ? order.sellerId
      : buyerIsActor
        ? order.sellerId
        : order.buyerId;
  if (recipientId === actorId) return;

  const who = buyerIsActor ? "The buyer" : "The seller";
  const reference = order.reference;
  const note = params.note?.trim() ? ` Note: ${params.note.trim()}` : "";

  switch (nextStatus) {
    case "PENDING_SELLER":
      await notify({
        userId: recipientId,
        type: "ORDER_REQUEST",
        title: `New order request ${reference}`,
        message: `${who} requested ${params.itemSummary}. Review the quantities and respond.`,
        orderRequestId: order.id,
      });
      return;
    case "AWAITING_BUYER":
      await notify({
        userId: recipientId,
        type: "ORDER_UPDATE",
        title: `Proposed changes for ${reference}`,
        message: `${who} proposed different terms. Review them and accept or decline.${note}`,
        orderRequestId: order.id,
      });
      return;
    case "ACCEPTED": {
      const total = formatMoney(params.agreedTotal);
      await notify({
        userId: recipientId,
        type: "ORDER_RESPONSE",
        title: buyerIsActor
          ? `Your terms were accepted for ${reference}`
          : `Your request ${reference} was accepted`,
        message: total
          ? `Agreed total ${total}. Arrange delivery and payment directly with the other party.`
          : "Terms are agreed. Arrange delivery and payment directly with the other party.",
        orderRequestId: order.id,
      });
      return;
    }
    case "REJECTED":
      await notify({
        userId: recipientId,
        type: "ORDER_RESPONSE",
        title: buyerIsActor
          ? `${reference} was declined`
          : `Your request ${reference} was declined`,
        message: `${who} declined the request.${note}`,
        orderRequestId: order.id,
      });
      return;
    case "CANCELLED":
      await notify({
        userId: recipientId,
        type: "ORDER_UPDATE",
        title: `Request ${reference} was cancelled`,
        message: `${who} withdrew the request.${note}`,
        orderRequestId: order.id,
      });
      return;
    case "COMPLETED":
      await notify({
        userId: recipientId,
        type: "ORDER_UPDATE",
        title: `Order ${reference} is completed`,
        message: `${who} marked the order as fulfilled.`,
        orderRequestId: order.id,
      });
      return;
    default:
      return;
  }
}

import type { RequestStatus } from "@prisma/client";
import { AppError } from "../middleware/error-handler";

/**
 * Order request status machine (FR-35, BR-05, BR-10).
 *
 * Every state change in the platform goes through `assertTransition`, so an
 * invalid or out-of-order transition is refused on the backend rather than
 * hidden in the UI. A submitted request is never treated as an accepted
 * order until a seller confirms or a buyer accepts proposed terms.
 *
 * Lifecycle:
 *
 *   submit            PENDING_SELLER
 *   seller accepts    ACCEPTED
 *   seller rejects    REJECTED
 *   seller proposes   SELLER_PROPOSED --(send)--> AWAITING_BUYER
 *   buyer accepts     ACCEPTED
 *   buyer declines    REJECTED
 *   buyer cancels     CANCELLED   (any time before terms are agreed)
 *   either completes  COMPLETED   (from ACCEPTED)
 */

export type OrderAction =
  | "ACCEPT"
  | "REJECT"
  | "PROPOSE"
  | "REVISE_PROPOSAL"
  | "SEND_PROPOSAL"
  | "ACCEPT_PROPOSAL"
  | "DECLINE_PROPOSAL"
  | "CANCEL"
  | "COMPLETE";

export type OrderActor = "BUYER" | "SELLER";

interface Transition {
  to: RequestStatus;
  actor: OrderActor;
  /** Human wording used in status history and notifications. */
  label: string;
}

/** Which transitions are legal from each status. */
const TRANSITIONS: Record<RequestStatus, Partial<Record<OrderAction, Transition>>> = {
  PENDING_SELLER: {
    ACCEPT: { to: "ACCEPTED", actor: "SELLER", label: "Seller accepted the request" },
    REJECT: { to: "REJECTED", actor: "SELLER", label: "Seller declined the request" },
    PROPOSE: {
      to: "SELLER_PROPOSED",
      actor: "SELLER",
      label: "Seller proposed changes",
    },
    CANCEL: { to: "CANCELLED", actor: "BUYER", label: "Buyer cancelled the request" },
  },
  SELLER_PROPOSED: {
    // The buyer keeps the right to withdraw while terms are still being drafted.
    CANCEL: { to: "CANCELLED", actor: "BUYER", label: "Buyer cancelled the request" },
    REVISE_PROPOSAL: {
      to: "SELLER_PROPOSED",
      actor: "SELLER",
      label: "Seller revised the proposed terms",
    },
    SEND_PROPOSAL: {
      to: "AWAITING_BUYER",
      actor: "SELLER",
      label: "Proposed terms sent to buyer",
    },
    REJECT: { to: "REJECTED", actor: "SELLER", label: "Seller withdrew the request" },
  },
  AWAITING_BUYER: {
    ACCEPT_PROPOSAL: { to: "ACCEPTED", actor: "BUYER", label: "Buyer accepted the proposed terms" },
    DECLINE_PROPOSAL: {
      to: "REJECTED",
      actor: "BUYER",
      label: "Buyer declined the proposed terms",
    },
    CANCEL: { to: "CANCELLED", actor: "BUYER", label: "Buyer cancelled the request" },
    REJECT: { to: "REJECTED", actor: "SELLER", label: "Seller withdrew the request" },
  },
  ACCEPTED: {
    COMPLETE: { to: "COMPLETED", actor: "SELLER", label: "Order marked complete" },
  },
  REJECTED: {},
  CANCELLED: {},
  COMPLETED: {},
};

/** Statuses that mean "the seller has not accepted yet" (BR-04). */
export const UNCONFIRMED_STATUSES: RequestStatus[] = [
  "PENDING_SELLER",
  "SELLER_PROPOSED",
  "AWAITING_BUYER",
];

export function isConfirmed(status: RequestStatus): boolean {
  return status === "ACCEPTED" || status === "COMPLETED";
}

/** Terminal statuses have no further actions. */
export function isTerminal(status: RequestStatus): boolean {
  return status === "REJECTED" || status === "CANCELLED" || status === "COMPLETED";
}

/**
 * Returns the legal transition for an action, throwing a 409/403 when the
 * action is not allowed from the current status or not allowed for this role.
 */
export function assertTransition(
  status: RequestStatus,
  action: OrderAction,
  actor: OrderActor
): RequestStatus {
  const transition = TRANSITIONS[status]?.[action];
  if (!transition) {
    throw new AppError(
      409,
      "INVALID_TRANSITION",
      isTerminal(status)
        ? `This request is ${statusLabel(status).toLowerCase()} and cannot be changed.`
        : `The action "${action}" is not available while the request is ${statusLabel(status).toLowerCase()}.`,
      { status, action }
    );
  }
  if (transition.actor !== actor) {
    throw new AppError(
      403,
      "ROLE_FORBIDDEN",
      `Only the ${transition.actor.toLowerCase()} can ${actionLabel(action).toLowerCase()} this request.`,
      { action, requiredRole: transition.actor }
    );
  }
  return transition.to;
}

/** The actions a given party may take right now — drives the UI action set. */
export function availableActions(
  status: RequestStatus,
  actor: OrderActor
): Array<{ action: OrderAction; to: RequestStatus; label: string }> {
  return Object.entries(TRANSITIONS[status] ?? {})
    .filter(([, transition]) => transition?.actor === actor)
    .map(([action, transition]) => ({
      action: action as OrderAction,
      to: (transition as Transition).to,
      label: (transition as Transition).label,
    }));
}

export function statusLabel(status: RequestStatus): string {
  switch (status) {
    case "PENDING_SELLER":
      return "Pending seller response";
    case "SELLER_PROPOSED":
      return "Seller proposed changes";
    case "AWAITING_BUYER":
      return "Awaiting buyer response";
    case "ACCEPTED":
      return "Accepted";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
  }
}

export function actionLabel(action: OrderAction): string {
  switch (action) {
    case "ACCEPT":
      return "Accept request";
    case "REJECT":
      return "Reject request";
    case "PROPOSE":
      return "Propose changes";
    case "REVISE_PROPOSAL":
      return "Revise proposal";
    case "SEND_PROPOSAL":
      return "Send to buyer";
    case "ACCEPT_PROPOSAL":
      return "Accept proposed terms";
    case "DECLINE_PROPOSAL":
      return "Decline proposed terms";
    case "CANCEL":
      return "Cancel request";
    case "COMPLETE":
      return "Mark complete";
  }
}

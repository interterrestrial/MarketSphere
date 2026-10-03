import type { RequestStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";

/**
 * Order status pill (Design.md §8). The label always states the real status —
 * a pending request must never read as an accepted order (BR-04).
 */
const labels: Record<
  RequestStatus,
  { text: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  PENDING_SELLER: { text: "Pending seller response", tone: "warning" },
  SELLER_PROPOSED: { text: "Seller proposed changes", tone: "info" },
  AWAITING_BUYER: { text: "Awaiting your response", tone: "info" },
  ACCEPTED: { text: "Accepted", tone: "success" },
  REJECTED: { text: "Rejected", tone: "danger" },
  CANCELLED: { text: "Cancelled", tone: "neutral" },
  COMPLETED: { text: "Completed", tone: "success" },
};

export function OrderStatusBadge({
  status,
  viewerRole,
}: {
  status: RequestStatus;
  /** Buyer-facing wording for the shared "awaiting buyer" status. */
  viewerRole?: "BUYER" | "SELLER";
}) {
  const entry = labels[status];
  const text =
    status === "AWAITING_BUYER" && viewerRole === "SELLER" ? "Awaiting buyer response" : entry.text;
  return <StatusBadge tone={entry.tone}>{text}</StatusBadge>;
}

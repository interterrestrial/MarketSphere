import type { ProductStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";

/** Catalogue status with text labels, never colour alone (Design.md §8). */
const labels: Record<
  ProductStatus,
  { text: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  DRAFT: { text: "Draft", tone: "neutral" },
  PENDING_REVIEW: { text: "Awaiting admin review", tone: "warning" },
  ACTIVE: { text: "Live", tone: "success" },
  REJECTED: { text: "Changes requested", tone: "danger" },
  INACTIVE: { text: "Archived", tone: "neutral" },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { text, tone } = labels[status];
  return <StatusBadge tone={tone}>{text}</StatusBadge>;
}

/** Availability as seller-provided information, not a stock guarantee (BR-09). */
export function AvailabilityBadge({
  isAvailable,
  note,
}: {
  isAvailable: boolean;
  note?: string | null;
}) {
  if (!isAvailable) return <StatusBadge tone="neutral">Currently unavailable</StatusBadge>;
  return (
    <StatusBadge tone="success">{note?.trim() ? `Available — ${note}` : "Available"}</StatusBadge>
  );
}

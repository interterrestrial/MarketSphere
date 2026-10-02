import type { VerificationStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";

/**
 * Verification state shown on profiles. Design.md §7.7: verification is an
 * identity review only and must never read as a quality guarantee.
 */
const labels: Record<
  VerificationStatus,
  { text: string; tone: "neutral" | "warning" | "success" | "danger" }
> = {
  NOT_SUBMITTED: { text: "Verification not started", tone: "neutral" },
  PENDING: { text: "Verification in review", tone: "warning" },
  APPROVED: { text: "Business details reviewed", tone: "success" },
  REJECTED: { text: "Verification needs attention", tone: "danger" },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const { text, tone } = labels[status];
  return <StatusBadge tone={tone}>{text}</StatusBadge>;
}

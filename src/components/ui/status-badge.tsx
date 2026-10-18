import type { ReactNode } from "react";

/**
 * Status pill. Design.md §8: status is always communicated with a text label,
 * never colour alone, and the tint keeps badges legible on a light canvas.
 */
const tones = {
  neutral: "border-subtle bg-neutral-soft text-secondary",
  success: "border-success bg-success-soft text-success",
  warning: "border-warning bg-warning-soft text-warning",
  danger: "border-danger bg-danger-soft text-danger",
  info: "border-info bg-info-soft text-info",
} as const;

export type BadgeTone = keyof typeof tones;

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-normal ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

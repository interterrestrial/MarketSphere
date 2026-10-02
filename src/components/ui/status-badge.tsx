import type { ReactNode } from "react";

/**
 * Status pill. Design.md §8: status is always communicated with a text label,
 * never colour alone.
 */
const toneClasses: Record<string, string> = {
  neutral: "border-subtle text-secondary",
  success: "border-success text-success",
  warning: "border-warning text-warning",
  danger: "border-danger text-danger",
  info: "border-info text-info",
};

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof toneClasses;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

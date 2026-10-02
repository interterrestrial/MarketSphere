import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button variants from Design.md §8: one visually dominant action per page,
 * destructive actions confirmed by the caller before firing.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-background hover:opacity-90",
  secondary: "border border-subtle text-secondary hover:text-body",
  ghost: "text-secondary hover:text-body",
  danger: "border border-danger text-danger hover:bg-danger hover:text-background",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

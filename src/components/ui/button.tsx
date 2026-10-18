import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button variants from Design.md §8: one visually dominant action per page,
 * destructive actions confirmed by the caller before firing, and a visible
 * keyboard focus ring inherited from the global :focus-visible rule.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong",
  secondary: "border border-subtle bg-surface text-secondary hover:border-primary hover:text-body",
  ghost: "text-secondary hover:bg-neutral-soft hover:text-body",
  danger: "border border-danger bg-surface text-danger hover:bg-danger hover:text-on-primary",
};

// `sm` is for dense toolbars; `md` keeps a 44px touch target on phones
// (Design.md §5) while staying compact from the `sm` breakpoint up.
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm min-h-9",
  md: "px-4 py-2 text-sm min-h-11 sm:min-h-0",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-normal transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

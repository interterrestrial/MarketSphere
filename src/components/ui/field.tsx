import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Design.md form primitives: persistent labels (never placeholder-only),
 * visible focus (the global :focus-visible ring, not `outline-none`), a
 * 44px touch-friendly height on small screens, and errors tied to the control
 * through aria-describedby.
 */

const baseControl =
  "w-full rounded-md border bg-surface px-3 py-2 text-body placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 sm:py-2";
const okControl = "border-subtle hover:border-primary";
const errorControl = "border-danger";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}

export function Field({ id, label, hint, error, optional, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-secondary">
        {label}
        {optional ? <span className="text-muted"> (optional)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, invalid: boolean | undefined) {
  return invalid ? `${id}-error` : undefined;
}

export function Input({
  id,
  invalid,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { id: string; invalid?: boolean }) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, invalid)}
      className={`${baseControl} min-h-11 sm:min-h-0 ${invalid ? errorControl : okControl} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  id,
  invalid,
  className = "",
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { id: string; invalid?: boolean }) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, invalid)}
      className={`${baseControl} min-h-24 ${invalid ? errorControl : okControl} ${className}`}
      {...props}
    />
  );
}

export function Select({
  id,
  invalid,
  className = "",
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & { id: string; invalid?: boolean }) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, invalid)}
      className={`${baseControl} min-h-11 sm:min-h-0 ${invalid ? errorControl : okControl} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

import type { ReactNode } from "react";

/**
 * Design.md form primitives: persistent labels (never placeholder-only),
 * visible focus, associated error messages, and adequate touch targets.
 */

const baseControl =
  "w-full rounded-md border bg-surface px-3 py-2 text-body placeholder:text-muted focus:outline-none disabled:opacity-60";
const okControl = "border-subtle focus:border-primary";
const errorControl = "border-danger focus:border-danger";

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
      {hint && !error ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  id,
  invalid,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={`${baseControl} ${invalid ? errorControl : okControl} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  id,
  invalid,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={`${baseControl} min-h-24 ${invalid ? errorControl : okControl} ${className}`}
      {...props}
    />
  );
}

export function Select({
  id,
  invalid,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={`${baseControl} ${invalid ? errorControl : okControl} ${className}`}
      {...props}
    />
  );
}

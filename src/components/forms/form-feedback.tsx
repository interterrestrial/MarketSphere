"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";

/**
 * Inline form feedback (Design.md §9).
 *
 * - `FormAlert` announces the outcome politely / assertively.
 * - `useFormSubmit` keeps the submit-pending state and the "focus the first
 *   invalid field" behaviour consistent across every form in the app.
 */
export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "warning" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    error: "border-danger bg-danger-soft text-danger",
    success: "border-success bg-success-soft text-success",
    warning: "border-warning bg-warning-soft text-warning",
    info: "border-info bg-info-soft text-secondary",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

/**
 * Wraps a submit handler: guards against double submits, and focuses the first
 * invalid control when validation fails.
 */
export function useFormSubmit(
  validate: () => boolean,
  submit: () => Promise<void>,
  onInvalid?: () => void
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const messageId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!validate()) {
      onInvalid?.();
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        invalid?.focus();
        invalid?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }

    setSubmitting(true);
    try {
      await submit();
    } finally {
      setSubmitting(false);
    }
  }

  return { formRef, submitting, handleSubmit, messageId };
}

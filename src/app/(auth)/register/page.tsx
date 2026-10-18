"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth, roleHome } from "@/components/auth/auth-provider";
import { FormAlert } from "@/components/forms/form-feedback";
import { ApiError } from "@/lib/api-client";
import { focusFirstInvalidField } from "@/lib/forms";
import { Field, Input } from "@/components/ui/field";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const local = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid business email address.";
    }
    if (phone.trim() && !/^\+?[0-9][0-9\s-]{5,19}$/.test(phone.trim())) {
      errors.phone = "Enter a valid phone number.";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = "Include at least one letter and one number.";
    }
    return errors;
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const errors = local();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields.");
      focusFirstInvalidField(event.currentTarget);
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
      router.push(roleHome(user.role));
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const fields: Record<string, string> = {};
        for (const field of caught.fields) {
          if (!(field.path in fields)) fields[field.path] = field.message;
        }
        setFieldErrors(fields);
        setError(caught.fields.length > 0 ? "Please fix the highlighted fields." : caught.message);
        focusFirstInvalidField(event.currentTarget);
      } else {
        setError("We could not create your account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <h1 className="font-heading text-2xl text-body sm:text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-secondary">
        Buyers can start trading immediately. Seller accounts open after approval.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <FormAlert tone="error">{error}</FormAlert> : null}

        <Field id="name" label="Full name" error={fieldErrors.name}>
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            invalid={Boolean(fieldErrors.name)}
            onChange={(e) => setName(e.target.value)}
            placeholder="Asha Sharma"
          />
        </Field>

        <Field id="email" label="Business email" error={fieldErrors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            invalid={Boolean(fieldErrors.email)}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
          />
        </Field>

        <Field id="phone" label="Phone" error={fieldErrors.phone} optional>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            invalid={Boolean(fieldErrors.phone)}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
        </Field>

        <Field
          id="password"
          label="Password"
          hint="At least 8 characters, including a letter and a number."
          error={fieldErrors.password}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            invalid={Boolean(fieldErrors.password)}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="mb-1 text-sm text-secondary">I am joining as a</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "BUYER", label: "Buyer", hint: "I buy in bulk" },
                { value: "SELLER", label: "Seller", hint: "I supply products" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-md border px-3 py-2.5 text-center ${
                  role === option.value
                    ? "border-primary bg-info-soft"
                    : "border-subtle bg-surface hover:border-primary"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <span className="text-sm text-body">{option.label}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </label>
            ))}
          </div>
          {role === "SELLER" ? (
            <p className="mt-2 text-xs text-warning">
              Seller accounts require approval before products can be published.
            </p>
          ) : null}
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm text-on-primary hover:bg-primary-strong disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}

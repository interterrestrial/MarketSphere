"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useAuth, roleHome } from "@/components/auth/auth-provider";
import { FormAlert } from "@/components/forms/form-feedback";
import { ApiError } from "@/lib/api-client";
import { focusFirstInvalidField } from "@/lib/forms";
import { Field, Input } from "@/components/ui/field";

function messageFor(code: string | null, fallback: string): string {
  switch (code) {
    case "ACCOUNT_PENDING":
      return "Your seller account is awaiting approval. You will be notified once it is reviewed.";
    case "ACCOUNT_INACTIVE":
      return "This account is no longer active. Contact support for help.";
    case "INVALID_CREDENTIALS":
      return "Email or password is incorrect.";
    case "RATE_LIMITED":
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return fallback;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length === 0) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields.");
      focusFirstInvalidField(event.currentTarget);
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : roleHome(user.role));
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors({});
        setError(messageFor(caught.code, caught.message || "We could not sign you in."));
      } else {
        setError("We could not sign you in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <h1 className="font-heading text-2xl text-body sm:text-3xl">Sign in</h1>
      <p className="mt-2 text-sm text-secondary">Access your MarketSphere business account.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <FormAlert tone="error">{error}</FormAlert> : null}

        <Field id="email" label="Email" error={fieldErrors.email}>
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

        <Field id="password" label="Password" error={fieldErrors.password}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              invalid={Boolean(fieldErrors.password)}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-secondary hover:text-body"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm text-on-primary hover:bg-primary-strong disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-secondary">
        New to MarketSphere?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

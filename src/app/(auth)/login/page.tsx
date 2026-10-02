"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useAuth, roleHome } from "@/components/auth/auth-provider";
import { ApiError } from "@/lib/api-client";

function fieldMessage(code: string | null, fallback: string): string {
  switch (code) {
    case "ACCOUNT_PENDING":
      return "Your seller account is awaiting approval. You will be notified once it is reviewed.";
    case "ACCOUNT_INACTIVE":
      return "This account is no longer active. Contact support for help.";
    case "INVALID_CREDENTIALS":
      return "Email or password is incorrect.";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login({ email, password });
      const next = searchParams.get("next");
      router.push(next ?? roleHome(user.role));
      router.refresh();
    } catch (err) {
      setError(
        fieldMessage(
          err instanceof ApiError ? err.code : null,
          err instanceof Error ? err.message : "Sign-in failed."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-heading text-2xl text-body">Sign in</h1>
      <p className="mt-2 text-sm text-secondary">Access your MarketSphere business account.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-body placeholder:text-muted focus:border-primary focus:outline-none"
            placeholder="you@business.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-body placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm text-background disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-secondary">
        New to MarketSphere?{" "}
        <Link href="/register" className="text-primary">
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth, roleHome } from "@/components/auth/auth-provider";
import { ApiError } from "@/lib/api-client";

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const user = await register({
        name,
        email,
        phone: phone.trim() === "" ? undefined : phone,
        password,
        role,
      });
      router.push(roleHome(user.role));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const fields: Record<string, string> = {};
        for (const field of err.fields) {
          if (!(field.path in fields)) fields[field.path] = field.message;
        }
        setFieldErrors(fields);
        setError(err.fields.length > 0 ? "Please fix the highlighted fields." : err.message);
      } else {
        setError(err instanceof Error ? err.message : "Registration failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-subtle bg-surface px-3 py-2 text-body placeholder:text-muted focus:border-primary focus:outline-none";

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-heading text-2xl text-body">Create your account</h1>
      <p className="mt-2 text-sm text-secondary">
        Buyers start trading immediately. Seller accounts open after approval.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm text-secondary">
            Full name
          </label>
          <input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Asha Sharma"
          />
          {fieldErrors["name"] ? (
            <p className="mt-1 text-xs text-danger">{fieldErrors["name"]}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-secondary">
            Business email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@business.com"
          />
          {fieldErrors["email"] ? (
            <p className="mt-1 text-xs text-danger">{fieldErrors["email"]}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm text-secondary">
            Phone <span className="text-muted">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+91 98765 43210"
          />
          {fieldErrors["phone"] ? (
            <p className="mt-1 text-xs text-danger">{fieldErrors["phone"]}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 8 characters, with a letter and a number"
          />
          {fieldErrors["password"] ? (
            <p className="mt-1 text-xs text-danger">{fieldErrors["password"]}</p>
          ) : null}
        </div>
        <fieldset>
          <legend className="mb-1 text-sm text-secondary">I am joining as a</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["BUYER", "SELLER"] as const).map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm ${
                  role === option ? "border-primary text-body" : "border-subtle text-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  className="sr-only"
                />
                {option === "BUYER" ? "Buyer" : "Seller"}
              </label>
            ))}
          </div>
          {role === "SELLER" ? (
            <p className="mt-2 text-xs text-warning">
              Seller accounts require approval before listing products.
            </p>
          ) : null}
        </fieldset>
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-primary">
          Sign in
        </Link>
      </p>
    </main>
  );
}

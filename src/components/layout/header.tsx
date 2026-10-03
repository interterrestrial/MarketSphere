"use client";

import Link from "next/link";
import { useAuth, roleHome } from "@/components/auth/auth-provider";
import { NotificationIndicator } from "@/components/notifications/notification-indicator";

/**
 * Role-aware top navigation. Links reflect what the signed-in account type
 * may use — backend routes enforce this independently, this only hides
 * irrelevant navigation (never a security boundary).
 */
export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-subtle bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-lg text-body">
          MarketSphere
        </Link>
        <nav className="flex items-center gap-4 text-sm" aria-label="Primary">
          {loading ? null : user ? (
            <>
              <Link href={roleHome(user.role)} className="text-secondary hover:text-primary">
                Overview
              </Link>
              {user.role === "ADMIN" ? (
                <>
                  <Link href="/admin/verifications" className="text-secondary hover:text-primary">
                    Verifications
                  </Link>
                  <Link href="/admin/products" className="text-secondary hover:text-primary">
                    Moderation
                  </Link>
                  <Link href="/admin/users" className="text-secondary hover:text-primary">
                    Users
                  </Link>
                  <Link href="/admin/reports" className="text-secondary hover:text-primary">
                    Reports
                  </Link>
                  <Link href="/admin/audit" className="text-secondary hover:text-primary">
                    Audit
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={user.role === "SELLER" ? "/seller/profile" : "/buyer/profile"}
                    className="text-secondary hover:text-primary"
                  >
                    Business profile
                  </Link>
                  {user.role === "SELLER" ? (
                    <Link href="/seller/products" className="text-secondary hover:text-primary">
                      Products
                    </Link>
                  ) : null}
                  <Link
                    href={user.role === "SELLER" ? "/seller/requests" : "/buyer/requests"}
                    className="text-secondary hover:text-primary"
                  >
                    Order requests
                  </Link>
                  <Link href="/products" className="text-secondary hover:text-primary">
                    Explore
                  </Link>
                </>
              )}
              <NotificationIndicator />
              <span
                className="hidden text-muted sm:inline"
                aria-label={`Signed in as ${user.name}`}
              >
                {user.name}
              </span>
              {user.status === "PENDING" ? (
                <span className="text-warning">Awaiting approval</span>
              ) : null}
              <button
                type="button"
                onClick={() => void logout().then(() => (window.location.href = "/"))}
                className="rounded-md border border-subtle px-3 py-1.5 text-secondary hover:text-body"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-secondary hover:text-primary">
                Sign in
              </Link>
              <Link href="/register" className="rounded-md bg-primary px-3 py-1.5 text-background">
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NotificationIndicator } from "@/components/notifications/notification-indicator";
import { navItemsFor } from "@/components/layout/nav-items";
import { useAuth } from "@/components/auth/auth-provider";

/**
 * Application header (Design.md §5).
 *
 * Desktop shows an inline role-aware bar; below `md` the links collapse into a
 * panel controlled by a toggle button. The panel is keyboard operable:
 * `aria-expanded`/`aria-controls`, Escape closes it, focus moves in on open and
 * returns to the toggle on close.
 */
export function Header() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const items = user ? navItemsFor(user.role) : [];

  // Escape closes the panel and returns focus to the toggle.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const signOut = () => {
    void logout().then(() => {
      setOpen(false);
      window.location.href = "/";
    });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-subtle bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="font-heading text-lg text-body">
          MarketSphere
        </Link>

        <div className="flex items-center gap-2">
          {user ? <NotificationIndicator /> : null}

          {loading ? (
            <span className="text-sm text-muted" aria-hidden="true">
              …
            </span>
          ) : user ? (
            <>
              <nav className="hidden items-center gap-4 text-sm md:flex" aria-label="Primary">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-secondary hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden items-center gap-3 md:flex">
                {user.status === "PENDING" ? (
                  <span className="rounded-md border border-warning bg-warning-soft px-2 py-0.5 text-xs text-warning">
                    Awaiting approval
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-md border border-subtle px-3 py-1.5 text-sm text-secondary hover:border-primary hover:text-body"
                >
                  Sign out
                </button>
              </div>

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "Close menu" : "Open menu"}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-subtle text-secondary hover:text-body md:hidden"
              >
                {/* Hamburger / close glyph drawn in CSS — no icon font. */}
                <span aria-hidden="true" className="flex w-4 flex-col gap-1">
                  <span
                    className={`block h-0.5 w-full bg-current transition-transform ${
                      open ? "translate-y-1.5 rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-full bg-current transition-opacity ${
                      open ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-full bg-current transition-transform ${
                      open ? "-translate-y-1.5 -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>
            </>
          ) : (
            <nav className="flex items-center gap-3 text-sm" aria-label="Primary">
              <Link href="/login" className="text-secondary hover:text-primary">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3 py-2 text-on-primary hover:bg-primary-strong"
              >
                Join
              </Link>
            </nav>
          )}
        </div>
      </div>

      {open && user ? (
        <div ref={panelRef} id="mobile-nav" className="border-t border-subtle bg-surface md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-2 py-2" aria-label="Primary">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-body hover:bg-neutral-soft"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-subtle px-3 pt-3 pb-2">
              <span className="truncate text-sm text-muted">
                {user.name}
                {user.status === "PENDING" ? " · awaiting approval" : ""}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="shrink-0 rounded-md border border-subtle px-3 py-2 text-sm text-secondary hover:text-body"
              >
                Sign out
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

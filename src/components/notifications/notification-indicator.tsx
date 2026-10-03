"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-provider";

/**
 * Header bell with an unread indicator (Design.md §8: never colour alone —
 * the count is text and the control carries an accessible label).
 *
 * The initial count comes from the server, so the badge is correct on the
 * first paint. It re-checks when the tab regains focus and after the user
 * marks notifications read, so no polling loop is needed.
 */
export function NotificationIndicator() {
  const { user, unread, setUnread } = useAuth();

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ unread: number }>("/api/notifications/unread-count");
      setUnread(data.unread);
    } catch {
      // A failed badge refresh must not break navigation.
    }
  }, [setUnread]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refresh]);

  if (!user) return null;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread"}
      className="relative flex h-9 w-9 items-center justify-center rounded-md border border-subtle text-secondary hover:text-body"
    >
      {/* Bell drawn in CSS so no icon font or emoji is needed (Design.md §8). */}
      <span aria-hidden="true" className="relative block h-4 w-4">
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-t-full border-2 border-current border-b-0" />
        <span className="absolute bottom-0 left-1/2 h-2 w-3 -translate-x-1/2 rounded-b-full border-2 border-current border-t-0" />
      </span>
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-background">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

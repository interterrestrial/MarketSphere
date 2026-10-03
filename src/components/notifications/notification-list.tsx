"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import type { NotificationDto } from "@/types/notification";

/**
 * Notification list (FR-39, FR-40, Design.md §7).
 *
 * Unread items are marked with a label as well as a visual cue, notices about
 * an order link straight to it, and both "mark as read" actions update the
 * header badge immediately.
 */
export function NotificationList({
  initialItems,
  viewerRole,
  unreadOnly,
}: {
  initialItems: NotificationDto[];
  viewerRole: "BUYER" | "SELLER";
  unreadOnly: boolean;
}) {
  const { setUnread } = useAuth();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const orderBase = viewerRole === "SELLER" ? "/seller/requests" : "/buyer/requests";

  function applyRead(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    setUnread(Math.max(0, items.filter((item) => !item.isRead).length - 1));
  }

  async function markOneRead(notification: NotificationDto) {
    if (notification.isRead) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/notifications/${notification.id}/read`, { method: "POST" });
      applyRead(notification.id);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "We could not update that notification."
      );
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={unreadOnly ? "Nothing unread" : "No notifications yet"}
        description={
          unreadOnly
            ? "You have read everything. Switch to all notifications to see earlier updates."
            : "Updates about your order requests, and account changes, will appear here."
        }
        action={
          unreadOnly ? (
            <Link
              href="/notifications"
              className="rounded-md border border-subtle px-4 py-2 text-sm text-secondary"
            >
              View all notifications
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-md border border-danger px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {items.map((notification) => (
          <li
            key={notification.id}
            className={`rounded-lg border p-4 ${
              notification.isRead ? "border-subtle bg-surface" : "border-primary bg-surface"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={notification.isRead ? "neutral" : "info"}>
                    {notification.typeLabel}
                  </StatusBadge>
                  {notification.isRead ? null : (
                    <span className="text-xs text-primary">Unread</span>
                  )}
                </p>
                <p className="mt-2 text-sm text-body">{notification.title}</p>
                <p className="mt-1 text-sm text-secondary">{notification.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(notification.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {notification.orderRequestId ? (
                <Link
                  href={`${orderBase}/${notification.orderRequestId}`}
                  onClick={() => void markOneRead(notification)}
                  className="rounded-md border border-subtle px-3 py-1.5 text-sm text-secondary hover:text-body"
                >
                  View request
                  {notification.orderReference ? ` ${notification.orderReference}` : ""}
                </Link>
              ) : null}
              {notification.isRead ? null : (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void markOneRead(notification)}
                >
                  Mark as read
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

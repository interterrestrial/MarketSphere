"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminUserRow } from "@/server/services/admin-user.service";

/** Suspend or reinstate one account (FR-43). */
export function UserStatusActions({ user }: { user: AdminUserRow }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const suspended = user.status === "SUSPENDED";

  async function run(action: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${user.id}/${action}`, { method: "POST" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (user.role === "ADMIN") {
    return (
      <span className="text-xs text-muted">
        Administrator accounts cannot be suspended from this screen
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {suspended ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void run("reactivate", `Reactivate ${user.email}?`)}
        >
          Reactivate
        </Button>
      ) : (
        <Button
          variant="danger"
          disabled={busy}
          onClick={() =>
            void run(
              "suspend",
              `Suspend ${user.email}? They will be signed out of the marketplace.`
            )
          }
        >
          Suspend
        </Button>
      )}
    </span>
  );
}

/** Role and status pill pair used in the user table. */
export function UserBadges({ user }: { user: AdminUserRow }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusBadge tone="neutral">{user.role.toLowerCase()}</StatusBadge>
      <StatusBadge
        tone={
          user.status === "ACTIVE"
            ? "success"
            : user.status === "SUSPENDED"
              ? "danger"
              : user.status === "PENDING"
                ? "warning"
                : "neutral"
        }
      >
        {user.status.toLowerCase()}
      </StatusBadge>
    </span>
  );
}

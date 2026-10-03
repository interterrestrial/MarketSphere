"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

/** Marks every notification read and clears the header badge (FR-40). */
export function MarkAllReadButton() {
  const router = useRouter();
  const { setUnread } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function markAll() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      setUnread(0);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "We could not update your notifications."
      );
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <Button variant="ghost" disabled={busy} onClick={() => void markAll()}>
        {busy ? "Working…" : "Mark all as read"}
      </Button>
    </span>
  );
}

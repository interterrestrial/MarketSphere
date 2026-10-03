"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

/**
 * Publication controls (Design.md §7.9): saving a draft and publishing a
 * listing are deliberately separate actions, and destructive ones confirm.
 */
export function ProductActions({
  productId,
  status,
}: {
  productId: string;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "INACTIVE";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "publish" | "archive", confirmFirst?: string) {
    if (confirmFirst && !window.confirm(confirmFirst)) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/products/${productId}/${action}`, { method: "POST" });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this draft permanently? This cannot be undone.")) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/products/${productId}`, { method: "DELETE" });
      router.push("/seller/products");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "That action could not be completed.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === "ACTIVE" ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void run(
              "archive",
              "Archive this listing? Buyers will stop finding it, and existing order history is kept."
            )
          }
        >
          Archive listing
        </Button>
      ) : (
        <Button variant="secondary" disabled={busy} onClick={() => void run("publish")}>
          {status === "INACTIVE" ? "Resubmit for review" : "Submit for review"}
        </Button>
      )}
      {status === "DRAFT" ? (
        <Button variant="danger" disabled={busy} onClick={() => void remove()}>
          Delete draft
        </Button>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}

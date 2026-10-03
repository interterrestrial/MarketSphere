"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import type { OrderRequestDto } from "@/types/order";

/**
 * Buyer actions on a request (FR-34, FR-37): accept or decline the seller's
 * proposed terms, or withdraw the request before anything is agreed.
 */
export function BuyerOrderActions({ order }: { order: OrderRequestDto }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canRespondToProposal = order.status === "AWAITING_BUYER";
  const canCancel = ["PENDING_SELLER", "AWAITING_BUYER"].includes(order.status);
  if (!canRespondToProposal && !canCancel) return null;

  async function run(action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/orders/${order.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(note.trim() ? { note: note.trim() } : {}),
      });
      setNote("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-subtle bg-surface p-4">
      <h2 className="font-heading text-base text-body">Your response</h2>
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {canRespondToProposal && order.proposalNote ? (
        <p className="mt-2 rounded-md border border-info px-3 py-2 text-sm text-secondary">
          Seller note: {order.proposalNote}
        </p>
      ) : null}

      <Field id="buyerNote" label="Add a note" optional>
        <Textarea
          id="buyerNote"
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            canRespondToProposal
              ? "Anything the seller should know about these terms."
              : "Reason for cancelling."
          }
        />
      </Field>

      <div className="mt-4 flex flex-wrap gap-3">
        {canRespondToProposal ? (
          <>
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  "accept-proposal",
                  "Accept these terms? They become the agreed terms for this order."
                )
              }
            >
              {busy ? "Working…" : "Accept proposed terms"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run("decline-proposal", "Decline these terms? The request will be closed.")
              }
            >
              Decline
            </Button>
          </>
        ) : null}
        {canCancel ? (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => void run("cancel", "Cancel this request? This cannot be undone.")}
          >
            Cancel request
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** Seller marks an accepted order as fulfilled. */
export function CompleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function complete() {
    if (!window.confirm("Mark this order as completed?")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/orders/${orderId}/complete`, { method: "POST" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That action could not be completed.");
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
      <Button disabled={busy} onClick={() => void complete()}>
        {busy ? "Working…" : "Mark as completed"}
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { formatMoney } from "@/lib/format";
import type { OrderRequestDto } from "@/types/order";

/**
 * Seller response panel (FR-30 – FR-33, Design.md §7.11).
 *
 * Three ways to respond, matching the status machine: confirm the order at a
 * final price, decline it, or counter with different quantities and prices.
 * Nothing here implies payment — settlement happens outside the platform.
 */
export function SellerResponsePanel({ order }: { order: OrderRequestDto }) {
  const router = useRouter();
  const [mode, setMode] = useState<"accept" | "propose" | "reject">("accept");
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((item) => [item.id, item.effectiveUnitPrice ?? item.requestedUnitPrice ?? ""])
    )
  );
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.map((item) => [item.id, String(item.effectiveQuantity)]))
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isProposalDraft = order.status === "SELLER_PROPOSED";

  async function run(action: string, body?: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/orders/${order.id}/${action}`, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      setMessage(
        action === "accept"
          ? "Order accepted. Agreed terms are now recorded."
          : action === "propose"
            ? "Proposed terms saved. Send them to the buyer when ready."
            : action === "send-proposal"
              ? "Proposal sent. The buyer has been asked to respond."
              : "Request declined."
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function acceptPayload() {
    return {
      items: order.items.map((item) => ({
        itemId: item.id,
        agreedUnitPrice: prices[item.id]?.trim() || "0",
      })),
      note: note.trim() || undefined,
    };
  }

  function proposePayload() {
    return {
      items: order.items.map((item) => ({
        itemId: item.id,
        proposedQuantity: Number(quantities[item.id]) || item.effectiveQuantity,
        proposedUnitPrice: prices[item.id]?.trim() || "0",
      })),
      note: note.trim() || undefined,
    };
  }

  const proposalTotal = order.items.reduce((sum, item) => {
    const price = Number(prices[item.id]);
    const quantity = Number(quantities[item.id]) || item.effectiveQuantity;
    return sum + (Number.isFinite(price) ? price * quantity : 0);
  }, 0);

  return (
    <section className="rounded-lg border border-subtle bg-surface p-4">
      <h2 className="font-heading text-base text-body">Your response</h2>
      <p className="mt-1 text-xs text-muted">
        Review stock and minimum order quantities before confirming. Payment and delivery are
        arranged outside MarketSphere.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mt-3 rounded-md border border-success px-3 py-2 text-sm text-success"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            { key: "accept", label: isProposalDraft ? "Confirm agreed terms" : "Accept request" },
            { key: "propose", label: isProposalDraft ? "Revise proposal" : "Propose changes" },
            { key: "reject", label: "Reject request" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMode(option.key)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              mode === option.key ? "border-primary text-body" : "border-subtle text-secondary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode !== "reject" ? (
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-md border border-subtle bg-background p-3">
              <p className="text-sm text-body">{item.productName}</p>
              <p className="mt-0.5 text-xs text-muted">
                Buyer requested {item.quantity}
                {item.requestedUnitPrice
                  ? ` at ${formatMoney(item.requestedUnitPrice)} each`
                  : " with no price stated"}
                {item.variant ? ` · ${item.variant}` : ""}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {mode === "propose" ? (
                  <Field id={`qty-${item.id}`} label="Quantity you can supply">
                    <Input
                      id={`qty-${item.id}`}
                      inputMode="numeric"
                      value={quantities[item.id] ?? ""}
                      onChange={(e) =>
                        setQuantities((current) => ({
                          ...current,
                          [item.id]: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                    />
                  </Field>
                ) : null}
                <Field
                  id={`price-${item.id}`}
                  label={mode === "propose" ? "Proposed unit price" : "Final unit price"}
                >
                  <Input
                    id={`price-${item.id}`}
                    inputMode="decimal"
                    value={prices[item.id] ?? ""}
                    onChange={(e) =>
                      setPrices((current) => ({ ...current, [item.id]: e.target.value }))
                    }
                    placeholder="1250.00"
                  />
                </Field>
              </div>
            </div>
          ))}

          <Field id="sellerNote" label="Note to the buyer" optional>
            <Textarea
              id="sellerNote"
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === "propose"
                  ? "Explain the change, e.g. only 30 units available from this lot."
                  : "Confirm dispatch timing or packaging details."
              }
            />
          </Field>

          {mode === "propose" ? (
            <p className="text-sm text-secondary">
              Proposal total:{" "}
              <span className="text-body">{formatMoney(String(proposalTotal)) ?? "—"}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {mode === "accept" ? (
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    "accept",
                    acceptPayload(),
                    "Accept this request and record the agreed terms?"
                  )
                }
              >
                {busy ? "Working…" : "Accept and confirm terms"}
              </Button>
            ) : (
              <Button disabled={busy} onClick={() => void run("propose", proposePayload())}>
                {busy ? "Working…" : isProposalDraft ? "Save revised terms" : "Save proposal"}
              </Button>
            )}
            {isProposalDraft ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    "send-proposal",
                    undefined,
                    "Send these terms to the buyer? They will be asked to accept or decline."
                  )
                }
              >
                Send to buyer
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <Field id="rejectNote" label="Reason" optional>
            <Textarea
              id="rejectNote"
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For example: material unavailable, or quantity below minimum."
            />
          </Field>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() =>
              void run(
                "reject",
                { note: note.trim() || undefined },
                "Reject this request? The buyer will see the status change."
              )
            }
          >
            {busy ? "Working…" : "Reject request"}
          </Button>
        </div>
      )}
    </section>
  );
}

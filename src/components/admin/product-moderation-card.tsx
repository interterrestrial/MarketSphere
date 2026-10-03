"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { formatMoney, moqLabel } from "@/lib/format";
import { ProductStatusBadge } from "@/components/products/product-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminProductRow } from "@/server/services/admin-product.service";

/**
 * Listing moderation (FR-44). Sellers cannot make their own listings visible,
 * so this is the only path to the buyer-facing catalogue.
 */
export function ProductModerationCard({ product }: { product: AdminProductRow }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/admin/products/${product.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(note.trim() ? { note: note.trim() } : {}),
      });
      setMessage(
        action === "approve"
          ? "Listing approved. Buyers can now find it."
          : action === "reject"
            ? "Listing rejected. The seller was notified with your reason."
            : "Listing archived and hidden from buyers."
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-subtle bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-background">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-muted">
                No image
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-heading text-base text-body">{product.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {product.categoryName ?? "Uncategorised"} ·{" "}
              {product.sellerBusinessName ?? product.sellerName}
            </p>
            <p className="mt-1 text-sm text-secondary">
              {formatMoney(product.indicativePrice) ?? "No indicative price"}
              {moqLabel(product.minimumOrderQuantity)
                ? ` · ${moqLabel(product.minimumOrderQuantity)}`
                : ""}
              {` · ${product.imageCount} image${product.imageCount === 1 ? "" : "s"}`}
              {` · ${product.variantCount} variant${product.variantCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ProductStatusBadge status={product.status} />
          <StatusBadge tone={product.isAvailable ? "success" : "neutral"}>
            {product.isAvailable ? "Available" : "Unavailable"}
          </StatusBadge>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 text-sm text-success">
          {message}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <Field
          id={`note-${product.id}`}
          label="Note to the seller"
          hint="Required when rejecting. Stored in the audit history."
        >
          <Textarea
            id={`note-${product.id}`}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add the missing material and size details before resubmitting."
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {product.status === "PENDING_REVIEW" ? (
            <>
              <Button
                disabled={busy}
                onClick={() =>
                  void run("approve", `Approve "${product.name}"? Buyers will be able to see it.`)
                }
              >
                Approve listing
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  void run("reject", `Reject "${product.name}"? The seller will be notified.`)
                }
              >
                Reject listing
              </Button>
            </>
          ) : null}
          {product.status === "ACTIVE" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run("archive", `Archive "${product.name}"? Buyers will stop finding it.`)
              }
            >
              Archive listing
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductVariantDto } from "@/types/product";

/**
 * Variant manager (FR-16): flexible name/value options so one model covers
 * size, colour, and fabric variants of home-textile products.
 */
export function VariantManager({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariantDto[];
}) {
  const router = useRouter();
  const [name, setName] = useState("size");
  const [value, setValue] = useState("");
  const [sku, setSku] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addVariant() {
    if (!name.trim() || !value.trim()) {
      setError("Both an option name and a value are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          value: value.trim(),
          sku: sku.trim() || undefined,
        }),
      });
      setValue("");
      setSku("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not add that variant.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVariant(variant: ProductVariantDto) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/products/${productId}/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !variant.isAvailable }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not update that variant.");
    } finally {
      setBusy(false);
    }
  }

  async function removeVariant(variantId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/products/${productId}/variants/${variantId}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not remove that variant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="font-heading text-base text-body">Variants</h2>
      <p className="mt-1 text-xs text-muted">
        Add options such as size, colour, or fabric. Buyers only see available ones.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {variants.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No variants"
            description="Add variants when a product comes in multiple sizes, colours, or fabrics."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {variants.map((variant) => (
            <li
              key={variant.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
            >
              <span className="text-secondary">
                {variant.name}: <span className="text-body">{variant.value}</span>
              </span>
              {variant.sku ? (
                <span className="font-mono text-xs text-muted">{variant.sku}</span>
              ) : null}
              <StatusBadge tone={variant.isAvailable ? "success" : "neutral"}>
                {variant.isAvailable ? "Available" : "Hidden"}
              </StatusBadge>
              <span className="ml-auto flex gap-2">
                <Button variant="ghost" disabled={busy} onClick={() => void toggleVariant(variant)}>
                  {variant.isAvailable ? "Hide" : "Show"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void removeVariant(variant.id)}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field id="variantName" label="Option">
          <Input
            id="variantName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="size"
          />
        </Field>
        <Field id="variantValue" label="Value">
          <Input
            id="variantValue"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="King"
          />
        </Field>
        <Field id="variantSku" label="SKU" optional>
          <Input
            id="variantSku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="LC-KING-01"
          />
        </Field>
      </div>
      <Button type="button" className="mt-3" disabled={busy} onClick={() => void addVariant()}>
        {busy ? "Working…" : "Add variant"}
      </Button>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatMoney } from "@/lib/format";
import type { OrderRequestDto } from "@/types/order";
import type { ProductDetailDto } from "@/types/product";

/**
 * Order request form (FR-28, Design.md §7.10).
 *
 * A request belongs to exactly one seller, so once the first product is chosen
 * only that seller's other listings can be added. The screen states plainly
 * that submitting is not an order and involves no payment (BR-04).
 */
export function OrderRequestForm({
  initialProduct,
  sellerCatalogue,
  defaultDeliveryAddress,
}: {
  initialProduct: ProductDetailDto;
  /** Other requestable listings from the same seller. */
  sellerCatalogue: Array<Pick<ProductDetailDto, "id" | "name" | "minimumOrderQuantity">>;
  defaultDeliveryAddress: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState([
    {
      productId: initialProduct.id,
      productName: initialProduct.name,
      minimumOrderQuantity: initialProduct.minimumOrderQuantity,
      indicativePrice: initialProduct.indicativePrice,
      variant: initialProduct.variants[0]
        ? `${initialProduct.variants[0].name}: ${initialProduct.variants[0].value}`
        : "",
      quantity: initialProduct.minimumOrderQuantity ?? 1,
      requestedUnitPrice: "",
    },
  ]);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultDeliveryAddress ?? "");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addedIds = useMemo(() => rows.map((row) => row.productId), [rows]);
  const addable = sellerCatalogue.filter((product) => !addedIds.includes(product.id));

  function updateRow(index: number, patch: Partial<(typeof rows)[number]>) {
    setRows((current) =>
      current.map((row, position) => (position === index ? { ...row, ...patch } : row))
    );
  }

  function addRow(productId: string) {
    const product = sellerCatalogue.find((item) => item.id === productId);
    if (!product) return;
    setRows((current) => [
      ...current,
      {
        productId: product.id,
        productName: product.name,
        minimumOrderQuantity: product.minimumOrderQuantity,
        indicativePrice: null,
        variant: "",
        quantity: product.minimumOrderQuantity ?? 1,
        requestedUnitPrice: "",
      },
    ]);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (deliveryAddress.trim().length < 5) {
      errors.deliveryAddress = "Enter a complete delivery address.";
    }
    rows.forEach((row, index) => {
      if (!Number.isInteger(row.quantity) || row.quantity < 1) {
        errors[`items.${index}.quantity`] = "Enter a quantity of at least 1.";
      } else if (row.minimumOrderQuantity && row.quantity < row.minimumOrderQuantity) {
        errors[`items.${index}.quantity`] =
          `This seller requires a minimum of ${row.minimumOrderQuantity} units.`;
      }
      if (
        row.requestedUnitPrice.trim() &&
        !/^\d{1,9}(\.\d{1,2})?$/.test(row.requestedUnitPrice.trim())
      ) {
        errors[`items.${index}.requestedUnitPrice`] = "Enter a price with up to 2 decimal places.";
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api<OrderRequestDto>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          deliveryAddress,
          buyerNotes,
          items: rows.map((row) => ({
            productId: row.productId,
            quantity: row.quantity,
            variantLabel: row.variant || undefined,
            requestedUnitPrice: row.requestedUnitPrice || undefined,
          })),
        }),
      });
      router.push(`/buyer/requests/${created.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const fields: Record<string, string> = {};
        for (const field of error.fields) {
          if (!(field.path in fields)) fields[field.path] = field.message;
        }
        setFieldErrors(fields);
        setFormError(
          error.fields.length > 0 ? "Please fix the highlighted fields." : error.message
        );
      } else {
        setFormError("We could not submit your request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="rounded-lg border border-subtle bg-surface p-4">
        <p className="text-sm text-secondary">
          This sends a <strong className="text-body">request</strong>, not an order. Nothing is
          charged and no payment is collected. The seller confirms availability, final pricing, and
          delivery before an order is accepted.
        </p>
      </div>

      {formError ? (
        <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-base text-body">Requested products</h2>
        {rows.map((row, index) => (
          <div key={row.productId} className="rounded-lg border border-subtle bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-heading text-base text-body">{row.productName}</p>
              {rows.length > 1 ? (
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-danger"
                  onClick={() =>
                    setRows((current) => current.filter((_, position) => position !== index))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted">
              {row.minimumOrderQuantity
                ? `Minimum order quantity ${row.minimumOrderQuantity}`
                : "No minimum order quantity set"}
              {row.indicativePrice ? ` · indicative price ${formatMoney(row.indicativePrice)}` : ""}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field
                id={`quantity-${index}`}
                label="Quantity"
                error={fieldErrors[`items.${index}.quantity`]}
              >
                <Input
                  id={`quantity-${index}`}
                  inputMode="numeric"
                  min={row.minimumOrderQuantity ?? 1}
                  value={String(row.quantity)}
                  invalid={Boolean(fieldErrors[`items.${index}.quantity`])}
                  onChange={(e) =>
                    updateRow(index, {
                      quantity: Number(e.target.value.replace(/\D/g, "")) || 0,
                    })
                  }
                />
              </Field>
              <Field
                id={`variant-${index}`}
                label="Option"
                optional
                error={fieldErrors[`items.${index}.variantLabel`]}
              >
                <Input
                  id={`variant-${index}`}
                  value={row.variant}
                  onChange={(e) => updateRow(index, { variant: e.target.value })}
                  placeholder="size: King"
                />
              </Field>
              <Field
                id={`price-${index}`}
                label="Your expected price"
                hint="Optional."
                error={fieldErrors[`items.${index}.requestedUnitPrice`]}
                optional
              >
                <Input
                  id={`price-${index}`}
                  inputMode="decimal"
                  value={row.requestedUnitPrice}
                  invalid={Boolean(fieldErrors[`items.${index}.requestedUnitPrice`])}
                  onChange={(e) => updateRow(index, { requestedUnitPrice: e.target.value })}
                  placeholder="1200.00"
                />
              </Field>
            </div>
          </div>
        ))}

        {addable.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64">
              <Field id="addProduct" label="Add another product from this seller" optional>
                <Select
                  id="addProduct"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addRow(e.target.value);
                  }}
                >
                  <option value="">Select a product</option>
                  {addable.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base text-body">Delivery</h2>
        <Field
          id="deliveryAddress"
          label="Delivery address"
          hint="Where the seller should deliver this order."
          error={fieldErrors.deliveryAddress}
        >
          <Textarea
            id="deliveryAddress"
            required
            maxLength={300}
            value={deliveryAddress}
            invalid={Boolean(fieldErrors.deliveryAddress)}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Shop 4, Sector 18 Market, Noida, Uttar Pradesh 201301"
          />
        </Field>
        <Field id="buyerNotes" label="Notes for the seller" optional error={fieldErrors.buyerNotes}>
          <Textarea
            id="buyerNotes"
            maxLength={1000}
            value={buyerNotes}
            invalid={Boolean(fieldErrors.buyerNotes)}
            onChange={(e) => setBuyerNotes(e.target.value)}
            placeholder="Dispatch date preference, packaging requirements, or labelling details."
          />
        </Field>
      </section>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}

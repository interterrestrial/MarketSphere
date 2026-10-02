"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { CategoryOption, ProductDetailDto } from "@/types/product";

/**
 * Product create/edit form (Design.md §7.9): fields grouped into basic
 * information, product details, and commercial details, with inline
 * validation that preserves everything entered after a recoverable failure.
 */
export function ProductForm({
  categories,
  product,
}: {
  categories: CategoryOption[];
  /** Present when editing; carries the real stored values (no placeholders). */
  product?: ProductDetailDto;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [values, setValues] = useState({
    name: product?.name ?? "",
    categoryId: product?.categoryId ?? "",
    description: product?.description ?? "",
    indicativePrice: product?.indicativePrice ?? "",
    minimumOrderQuantity:
      product?.minimumOrderQuantity === null || product?.minimumOrderQuantity === undefined
        ? ""
        : String(product.minimumOrderQuantity),
    availabilityNote: product?.availabilityNote ?? "",
    isAvailable: product?.isAvailable ?? true,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function set(field: keyof typeof values, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function localValidation(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (values.name.trim().length < 3) errors.name = "Product name must be at least 3 characters.";
    if (!values.categoryId) errors.categoryId = "Choose a product category.";
    if (
      values.indicativePrice.trim() &&
      !/^\d{1,9}(\.\d{1,2})?$/.test(values.indicativePrice.trim())
    ) {
      errors.indicativePrice = "Enter a price with up to 2 decimal places.";
    }
    if (
      values.minimumOrderQuantity.trim() &&
      !/^[1-9]\d{0,5}$/.test(values.minimumOrderQuantity.trim())
    ) {
      errors.minimumOrderQuantity = "Minimum order quantity must be a whole number above zero.";
    }
    return errors;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);
    const local = localValidation();
    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      if (product) {
        await api(`/api/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...values,
          }),
        });
      } else {
        const created = await api<{ id: string }>("/api/products", {
          method: "POST",
          body: JSON.stringify(values),
        });
        router.push(`/seller/products/${created.id}/edit`);
      }
      setSaved(true);
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
        setFormError("We could not save this product. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {formError ? (
        <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      {saved ? (
        <p
          role="status"
          className="rounded-md border border-success px-3 py-2 text-sm text-success"
        >
          {isEdit ? "Product updated." : "Draft product created."}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-base text-body">Basic information</h2>
        <Field id="name" label="Product name" error={fieldErrors.name}>
          <Input
            id="name"
            required
            value={values.name}
            invalid={Boolean(fieldErrors.name)}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Cotton Bedsheet — King"
          />
        </Field>
        <Field id="categoryId" label="Category" error={fieldErrors.categoryId}>
          <Select
            id="categoryId"
            required
            value={values.categoryId}
            invalid={Boolean(fieldErrors.categoryId)}
            onChange={(e) => set("categoryId", e.target.value)}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parentId ? "— " : ""}
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base text-body">Product details</h2>
        <Field
          id="description"
          label="Description"
          hint="Material, weave, design, and finishing details buyers compare."
          error={fieldErrors.description}
        >
          <Textarea
            id="description"
            maxLength={4000}
            value={values.description}
            invalid={Boolean(fieldErrors.description)}
            onChange={(e) => set("description", e.target.value)}
            placeholder="300 TC cotton with a printed design, machine washable."
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base text-body">Commercial details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="indicativePrice"
            label="Indicative price (INR)"
            hint="Shown to buyers as indicative only. Leave blank to invite contact."
            error={fieldErrors.indicativePrice}
            optional
          >
            <Input
              id="indicativePrice"
              inputMode="decimal"
              value={values.indicativePrice}
              invalid={Boolean(fieldErrors.indicativePrice)}
              onChange={(e) => set("indicativePrice", e.target.value)}
              placeholder="1250.00"
            />
          </Field>
          <Field
            id="minimumOrderQuantity"
            label="Minimum order quantity"
            hint="Buyers see this before they request an order."
            error={fieldErrors.minimumOrderQuantity}
            optional
          >
            <Input
              id="minimumOrderQuantity"
              inputMode="numeric"
              value={values.minimumOrderQuantity}
              invalid={Boolean(fieldErrors.minimumOrderQuantity)}
              onChange={(e) => set("minimumOrderQuantity", e.target.value.replace(/\D/g, ""))}
              placeholder="25"
            />
          </Field>
        </div>
        <Field
          id="availabilityNote"
          label="Availability note"
          hint="Seller-provided information, not a stock guarantee."
          error={fieldErrors.availabilityNote}
          optional
        >
          <Input
            id="availabilityNote"
            value={values.availabilityNote}
            invalid={Boolean(fieldErrors.availabilityNote)}
            onChange={(e) => set("availabilityNote", e.target.value)}
            placeholder="Ready to dispatch in 7 days"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={values.isAvailable}
            onChange={(e) => set("isAvailable", e.target.checked)}
            className="h-4 w-4 rounded border-subtle bg-surface"
          />
          Buyers can currently request this product
        </label>
      </section>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : isEdit ? "Save changes" : "Save as draft"}
      </Button>
    </form>
  );
}

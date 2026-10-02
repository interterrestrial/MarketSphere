"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { BusinessProfileDto, ProfilePayload } from "@/types/business-profile";
import { BUYER_BUSINESS_TYPES, SELLER_BUSINESS_TYPES } from "@/server/validators/business-profile";
import type { ProfileRole } from "@/server/validators/business-profile";

const TYPE_LABELS: Record<string, string> = {
  MANUFACTURER: "Manufacturer",
  WHOLESALER: "Wholesaler",
  RETAILER: "Retailer",
  DISTRIBUTOR: "Distributor",
  RESELLER: "Reseller",
  INSTITUTIONAL: "Institutional buyer",
};

export const FIELD_LABELS: Record<string, string> = {
  businessName: "Business name",
  businessType: "Business type",
  address: "Address",
  city: "City",
  state: "State",
  pincode: "PIN code",
  contactName: "Contact person",
  contactPhone: "Contact phone",
  gstNumber: "GSTIN",
  serviceArea: "Service area",
  description: "Business description",
};

/** Client-side mirror of the server rules for immediate feedback. */
function localErrors(values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.businessName.trim().length < 2) {
    errors.businessName = "Business name must be at least 2 characters.";
  }
  if (!values.businessType) errors.businessType = "Choose a business type.";
  if (values.address.trim().length < 5) errors.address = "Enter a complete address.";
  if (!values.city.trim()) errors.city = "City is required.";
  if (!values.state.trim()) errors.state = "State is required.";
  if (!/^\d{6}$/.test(values.pincode.trim())) errors.pincode = "Enter a valid 6-digit PIN code.";
  if (values.contactPhone.trim() && !/^\+?[0-9][0-9\s-]{5,19}$/.test(values.contactPhone.trim())) {
    errors.contactPhone = "Enter a valid phone number.";
  }
  if (
    values.gstNumber.trim() &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9]Z[A-Z0-9]$/.test(values.gstNumber.trim().toUpperCase())
  ) {
    errors.gstNumber = "Enter a valid GSTIN (e.g. 06AABCA1234C1Z5).";
  }
  return errors;
}

function toFormState(profile: BusinessProfileDto | null): Record<string, string> {
  return {
    businessName: profile?.businessName ?? "",
    businessType: profile?.businessType ?? "",
    description: profile?.description ?? "",
    address: profile?.address ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    pincode: profile?.pincode ?? "",
    contactName: profile?.contactName ?? "",
    contactPhone: profile?.contactPhone ?? "",
    gstNumber: profile?.gstNumber ?? "",
    serviceArea: profile?.serviceArea ?? "",
  };
}

/**
 * Business profile form used for both onboarding (no profile yet) and
 * editing. Server validation stays authoritative (BR-11); this only gives
 * immediate feedback, preserves entered values on recoverable errors, and
 * blocks duplicate submissions while saving.
 */
export function ProfileForm({
  role,
  profile,
}: {
  role: ProfileRole;
  profile: BusinessProfileDto | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState(() => toFormState(profile));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCreate = profile === null;
  const typeOptions = role === "SELLER" ? SELLER_BUSINESS_TYPES : BUYER_BUSINESS_TYPES;

  function set(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);

    const local = localErrors(values);
    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      await api<ProfilePayload>("/api/business-profile", {
        method: isCreate ? "POST" : "PATCH",
        body: JSON.stringify(values),
      });
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
        setFormError("We could not save your profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
          Profile saved.
        </p>
      ) : null}

      <Field id="businessName" label="Business name" error={fieldErrors.businessName}>
        <Input
          id="businessName"
          name="businessName"
          autoComplete="organization"
          required
          value={values.businessName}
          invalid={Boolean(fieldErrors.businessName)}
          onChange={(e) => set("businessName", e.target.value)}
          placeholder={role === "SELLER" ? "Sonipat Textiles" : "Noida Home Store"}
        />
      </Field>

      <Field id="businessType" label="Business type" error={fieldErrors.businessType}>
        <Select
          id="businessType"
          name="businessType"
          required
          value={values.businessType}
          invalid={Boolean(fieldErrors.businessType)}
          onChange={(e) => set("businessType", e.target.value)}
        >
          <option value="">Select a business type</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {TYPE_LABELS[option] ?? option}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="description"
        label="Business description"
        hint={
          role === "SELLER"
            ? "Buyers see this on your public profile. Describe what you supply."
            : "Optional: describe what you buy and how you source."
        }
        error={fieldErrors.description}
        optional={role === "BUYER"}
      >
        <Textarea
          id="description"
          name="description"
          maxLength={1000}
          value={values.description}
          invalid={Boolean(fieldErrors.description)}
          onChange={(e) => set("description", e.target.value)}
          placeholder={
            role === "SELLER"
              ? "Manufacturer of bedsheets, blankets, and cushion covers with 15 years of experience."
              : "Home furnishings retailer sourcing from regional manufacturers."
          }
        />
      </Field>

      <Field
        id="address"
        label={role === "SELLER" ? "Business address" : "Delivery address"}
        error={fieldErrors.address}
      >
        <Textarea
          id="address"
          name="address"
          required
          maxLength={300}
          value={values.address}
          invalid={Boolean(fieldErrors.address)}
          onChange={(e) => set("address", e.target.value)}
          placeholder={role === "SELLER" ? "Industrial Area, Phase 2" : "Shop 4, Sector 18 Market"}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="city" label="City" error={fieldErrors.city}>
          <Input
            id="city"
            name="city"
            required
            value={values.city}
            invalid={Boolean(fieldErrors.city)}
            onChange={(e) => set("city", e.target.value)}
            placeholder={role === "SELLER" ? "Sonipat" : "Noida"}
          />
        </Field>
        <Field id="state" label="State" error={fieldErrors.state}>
          <Input
            id="state"
            name="state"
            required
            value={values.state}
            invalid={Boolean(fieldErrors.state)}
            onChange={(e) => set("state", e.target.value)}
            placeholder={role === "SELLER" ? "Haryana" : "Uttar Pradesh"}
          />
        </Field>
        <Field id="pincode" label="PIN code" error={fieldErrors.pincode}>
          <Input
            id="pincode"
            name="pincode"
            inputMode="numeric"
            maxLength={6}
            required
            value={values.pincode}
            invalid={Boolean(fieldErrors.pincode)}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
            placeholder="131001"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contactName" label="Contact person" error={fieldErrors.contactName} optional>
          <Input
            id="contactName"
            name="contactName"
            autoComplete="name"
            value={values.contactName}
            invalid={Boolean(fieldErrors.contactName)}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Who should buyers contact?"
          />
        </Field>
        <Field
          id="contactPhone"
          label="Contact phone"
          hint="Not shown publicly."
          error={fieldErrors.contactPhone}
          optional
        >
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            autoComplete="tel"
            value={values.contactPhone}
            invalid={Boolean(fieldErrors.contactPhone)}
            onChange={(e) => set("contactPhone", e.target.value)}
            placeholder="+91 98765 43210"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="gstNumber"
          label="GSTIN"
          hint="Optional for now; used when verification opens."
          error={fieldErrors.gstNumber}
          optional
        >
          <Input
            id="gstNumber"
            name="gstNumber"
            value={values.gstNumber}
            invalid={Boolean(fieldErrors.gstNumber)}
            onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
            placeholder="06AABCA1234C1Z5"
          />
        </Field>
        {role === "SELLER" ? (
          <Field
            id="serviceArea"
            label="Service area"
            hint="Cities or regions you supply."
            error={fieldErrors.serviceArea}
          >
            <Input
              id="serviceArea"
              name="serviceArea"
              value={values.serviceArea}
              invalid={Boolean(fieldErrors.serviceArea)}
              onChange={(e) => set("serviceArea", e.target.value)}
              placeholder="Delhi-NCR"
            />
          </Field>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-4 py-2 text-sm text-background disabled:opacity-60"
      >
        {saving ? "Saving…" : isCreate ? "Create business profile" : "Save changes"}
      </button>
    </form>
  );
}

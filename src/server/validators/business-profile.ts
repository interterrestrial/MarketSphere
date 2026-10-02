import { z } from "zod";

/**
 * Business profile schemas (FR-07, FR-11, FR-14).
 *
 * `businessType` is role-scoped: sellers register as manufacturers or
 * wholesalers, buyers as retailers, distributors, resellers, or
 * institutional buyers (PRD §3.4, §4).
 */
export const SELLER_BUSINESS_TYPES = ["MANUFACTURER", "WHOLESALER"] as const;
export const BUYER_BUSINESS_TYPES = [
  "RETAILER",
  "DISTRIBUTOR",
  "RESELLER",
  "INSTITUTIONAL",
] as const;

export type ProfileRole = "BUYER" | "SELLER";

export function businessTypesForRole(role: ProfileRole): readonly string[] {
  return role === "SELLER" ? SELLER_BUSINESS_TYPES : BUYER_BUSINESS_TYPES;
}

/** Empty strings from HTML forms become undefined instead of empty values. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

function baseFields(role: ProfileRole) {
  return {
    businessName: z
      .string()
      .trim()
      .min(2, "Business name must be at least 2 characters.")
      .max(160, "Must be 160 characters or fewer."),
    businessType: z.string().refine((value) => businessTypesForRole(role).includes(value), {
      message:
        role === "SELLER"
          ? "Sellers can register as a manufacturer or wholesaler."
          : "Buyers can register as a retailer, distributor, reseller, or institutional buyer.",
    }),
    description: optionalText(1000),
    address: z
      .string()
      .trim()
      .min(5, "Enter a complete address.")
      .max(300, "Must be 300 characters or fewer."),
    city: z.string().trim().min(1, "City is required.").max(80),
    state: z.string().trim().min(1, "State is required.").max(80),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
    contactName: optionalText(120),
    contactPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{5,19}$/, "Enter a valid phone number.")
      .optional()
      .transform((value) => (value === "" ? undefined : value)),
    gstNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9]Z[A-Z0-9]$/,
        "Enter a valid GSTIN (e.g. 06AABCA1234C1Z5)."
      )
      .optional()
      .transform((value) => (value === "" ? undefined : value)),
    serviceArea: optionalText(200),
  };
}

/** Create payload — core business details are required up front. */
export function createProfileSchema(role: ProfileRole) {
  return z.object(baseFields(role));
}

/** Update payload — every field optional so sellers can save progress. */
export function updateProfileSchema(role: ProfileRole) {
  return z.object(baseFields(role)).partial();
}

export type CreateProfileInput = z.infer<ReturnType<typeof createProfileSchema>>;
export type UpdateProfileInput = z.input<ReturnType<typeof updateProfileSchema>>;

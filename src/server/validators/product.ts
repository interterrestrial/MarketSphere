import { z } from "zod";

/**
 * Product catalog schemas (FR-16 – FR-25).
 *
 * `indicativePrice` is a *display* price only — the backend treats it as
 * indicative and never as an agreed order price (BR-06). Leaving it empty
 * means "contact the seller" in the UI.
 */

const price = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a price with up to 2 decimal places.")
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

const moq = z
  .string()
  .trim()
  .regex(/^\d{1,6}$/, "Minimum order quantity must be a whole number.")
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine((value) => value === undefined || Number(value) > 0, {
    message: "Minimum order quantity must be greater than zero.",
  });

/** Create payload — used by both the seller form and any API client. */
export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Product name must be at least 3 characters.")
    .max(160, "Must be 160 characters or fewer."),
  description: optionalText(4000),
  categoryId: z.uuid("Choose a product category.").optional().or(z.literal("")),
  indicativePrice: price,
  minimumOrderQuantity: moq,
  isAvailable: z.boolean().optional(),
  availabilityNote: optionalText(200),
});

/** Update payload — every field optional so a draft can be saved in parts. */
export const updateProductSchema = createProductSchema.partial();

export const variantSchema = z.object({
  name: z.string().trim().min(1, "Give the option a name (size, colour, fabric).").max(60),
  value: z.string().trim().min(1, "Enter the option value.").max(120),
  sku: optionalText(60),
  isAvailable: z.boolean().optional(),
});

export const updateVariantSchema = variantSchema.partial();

export const productImageSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .url("Enter a valid image URL.")
    .max(500, "Must be 500 characters or fewer."),
  displayOrder: z.coerce.number().int().min(0).max(50).optional(),
});

/** Sort options for discovery (FR-24). */
export const productSortSchema = z.enum([
  "newest",
  "name_asc",
  "name_desc",
  "price_asc",
  "price_desc",
]);
export type ProductSort = z.infer<typeof productSortSchema>;

/** Buyer discovery query (FR-22 – FR-24): keyword, filters, sort, paging. */
export const productSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, "Search text is too long.")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  category: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  minPrice: price,
  maxPrice: price,
  sellerCity: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  availability: z.enum(["any", "available", "unavailable"]).default("any"),
  sort: productSortSchema.default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;

import { z } from "zod";

/**
 * Order request schemas (FR-28 – FR-37). Quantities, money, and status
 * transitions are validated server-side (BR-07, BR-11); totals are never
 * accepted from the client.
 */

const quantity = z.coerce
  .number()
  .int("Quantity must be a whole number.")
  .positive("Quantity must be greater than zero.")
  .max(1_000_000, "Quantity is unrealistically large.");

const unitPrice = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a price with up to 2 decimal places.");

const optionalUnitPrice = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : value))
  .refine((value) => value === undefined || /^\d{1,9}(\.\d{1,2})?$/.test(value), {
    message: "Enter a price with up to 2 decimal places.",
  });

/**
 * FR-28: a request covers one or more products, and because a request belongs
 * to exactly one seller, all items must resolve to the same seller.
 */
export const submitOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid("Choose a product."),
        quantity,
        variantLabel: z
          .string()
          .trim()
          .max(120)
          .optional()
          .transform((value) => (value === "" ? undefined : value)),
        requestedUnitPrice: optionalUnitPrice,
      })
    )
    .min(1, "Add at least one product to the request.")
    .max(20, "A request can include at most 20 products."),
  deliveryAddress: z
    .string()
    .trim()
    .min(5, "Enter a complete delivery address.")
    .max(300, "Must be 300 characters or fewer."),
  buyerNotes: z
    .string()
    .trim()
    .max(1000, "Must be 1000 characters or fewer.")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;

/** FR-31: the seller confirms a final unit price for every line. */
export const acceptOrderSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.uuid(),
        agreedUnitPrice: unitPrice,
      })
    )
    .min(1, "Confirm a price for every requested product."),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>;

/** FR-33: the seller proposes different quantities and/or prices. */
export const proposeChangesSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.uuid(),
        proposedQuantity: quantity.optional(),
        proposedUnitPrice: unitPrice,
      })
    )
    .min(1, "Propose terms for at least one product."),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type ProposeChangesInput = z.infer<typeof proposeChangesSchema>;

/** Optional reason attached to reject, decline, or cancel actions. */
export const reasonSchema = z.object({
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const orderListQuerySchema = z.object({
  status: z
    .enum([
      "PENDING_SELLER",
      "SELLER_PROPOSED",
      "AWAITING_BUYER",
      "ACCEPTED",
      "REJECTED",
      "CANCELLED",
      "COMPLETED",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

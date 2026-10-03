import { z } from "zod";

/** Admin query filters and decision payloads (FR-42 – FR-46). */

export const sellerReviewQuerySchema = z.object({
  status: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const productModerationQuerySchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const userListQuerySchema = z.object({
  role: z.enum(["BUYER", "SELLER", "ADMIN"]).optional(),
  status: z.enum(["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const reportListQuerySchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const auditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/** Note attached to a decision; required for rejections and report outcomes. */
export const decisionNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(1000, "Must be 1000 characters or fewer.")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const resolutionSchema = z.object({
  resolution: z
    .string()
    .trim()
    .min(3, "Record what was done.")
    .max(1000, "Must be 1000 characters or fewer."),
});

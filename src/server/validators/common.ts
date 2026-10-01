import { z } from "zod";

/**
 * Shared request schemas (validators). Import these in route definitions via
 * the `validate` middleware instead of re-declaring ad-hoc rules per route.
 */

/** Standard `?page=&pageSize=` pagination query (1-based page, capped size). */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

/** Route params carrying a single UUID resource id, e.g. `/products/:id`. */
export const uuidParams = z.object({
  id: z.uuid(),
});

export type UuidParams = z.infer<typeof uuidParams>;

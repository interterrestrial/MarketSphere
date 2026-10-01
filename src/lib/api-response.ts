/**
 * Shared API response envelope (Task 4: API conventions).
 *
 * Used by both the standalone Express API and Next.js route handlers so
 * every endpoint speaks the same shape:
 *
 * Success (2xx):
 *   { "success": true, "data": <payload>, "meta": { ... }? }
 *
 * Failure (4xx/5xx):
 *   { "success": false, "error": { "code": "UPPER_SNAKE", "message": "...", "details"?: ... } }
 *
 * Rules:
 * - `success` always mirrors the HTTP outcome (2xx => true).
 * - `error.code` is a stable machine-readable string; `error.message` is
 *   human-readable and safe to display.
 * - `details` carries field-level validation problems or safe context, and
 *   must never leak secrets, stack traces, or raw SQL.
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function paginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number
): ApiSuccess<T[]> {
  return {
    success: true,
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function fail(code: string, message: string, details?: unknown): ApiErrorBody {
  const error: ApiErrorBody["error"] =
    details === undefined ? { code, message } : { code, message, details };
  return { success: false, error };
}

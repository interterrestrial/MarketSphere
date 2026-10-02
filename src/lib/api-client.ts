/**
 * Typed client for the same-origin Next.js API (`/api/...`).
 * Throws ApiError carrying the envelope code/message/field details.
 */
export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: FieldError[];

  constructor(code: string, message: string, status: number, fields: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => null)) as {
    success: boolean;
    data?: T;
    error?: { code: string; message: string; details?: FieldError[] };
  } | null;
  if (res.ok && body?.success) {
    return (body.data ?? {}) as T;
  }
  throw new ApiError(
    body?.error?.code ?? "REQUEST_FAILED",
    body?.error?.message ?? `Request failed (${res.status}).`,
    res.status,
    Array.isArray(body?.error?.details) ? (body?.error?.details as FieldError[]) : []
  );
}

# MarketSphere — API Conventions

Phase 1, Tasks 3–4. Both the standalone Express API and Next.js route
handlers follow these conventions. Helpers live in `src/lib/api-response.ts`;
Express error handling in `src/server/middleware/error-handler.ts`.

## 1. Response envelope

Success (`2xx`):

```json
{ "success": true, "data": { "...": "..." }, "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
```

- `meta` appears only on paginated list responses (`paginated()` helper).
- `success` always mirrors the HTTP outcome (`2xx` => `true`).

Failure (`4xx`/`5xx`):

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "path": "quantity", "message": "..." }] } }
```

- `error.code`: stable `UPPER_SNAKE` string for client branching.
- `error.message`: human-readable, safe to display.
- `error.details`: field errors or safe context only — never secrets,
  stack traces, or raw SQL.

## 2. HTTP status codes

| Code | Meaning | Used for |
| ---- | ------- | -------- |
| 200 | OK | Reads, updates, health (healthy) |
| 201 | Created | Successful `POST` creating a record |
| 400 | Bad request | Validation failures, `BAD_JSON`, bad references |
| 401 | Unauthorized | Missing/invalid credentials (later phases) |
| 403 | Forbidden | Wrong role for the action (later phases) |
| 404 | Not found | Unknown endpoint or record (`NOT_FOUND`) |
| 409 | Conflict | Unique-constraint violations (`CONFLICT`, Prisma P2002) |
| 503 | Unavailable | Health probe when the database is unreachable |
| 500 | Server error | Anything unexpected (`INTERNAL_ERROR`, no internals leaked) |

## 3. Endpoint naming

- Business resources are versioned and plural: `/api/v1/products`, `/api/v1/order-requests`.
- Infrastructure stays unversioned: `/api/health`.
- Nested reads use path nesting (`/api/v1/order-requests/:id/items`);
  actions on a resource use verbs sparingly and explicitly
  (e.g. `POST /api/v1/order-requests/:id/accept`).
- Pagination everywhere on lists: `?page=&pageSize=` (defaults 1 / 20, max 100).

## 4. Validation and errors

- All input is validated server-side with zod schemas via the `validate`
  middleware (`body` / `query` / `params`); parsed values replace the
  originals so handlers only see trusted data (BR-11).
- Controllers throw `AppError` (or subclasses); Express 4 async handlers
  are wrapped in `asyncHandler` so rejections reach the central handler.
- Known Prisma failures map to HTTP semantics (P2002 → 409, P2025 → 404,
  P2003 → 400); `5xx` responses are logged server-side with the stack,
  clients only see `INTERNAL_ERROR`.

## 5. Logging

- One line per request: `METHOD path -> STATUS durationMs` (`requestLogger`).
- Levels via `LOG_LEVEL` (`debug|info|warn|error`, default `info`).
- `4xx` log at warn, `5xx` at error with stack; request bodies are never logged.

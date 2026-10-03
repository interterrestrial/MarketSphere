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
| 429 | Too many requests | Rate-limited auth attempts (`RATE_LIMITED`) |
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

## 6. Authentication (Phase 2)

- One service layer (`src/server/services/auth.service.ts`), two thin
  transports sharing logic, validation, and the envelope:
  - Express (API clients): `POST /api/v1/auth/register|login|logout`, `GET /api/v1/auth/me`.
  - Next.js (browser, same-origin cookies): `POST /api/auth/register|login|logout`, `GET /api/auth/me`.
- Sessions are HS256 JWTs in the `ms_session` httpOnly cookie
  (`SameSite=lax`, `Secure` in production, 7-day expiry). The token carries
  only `{ sub, role }`; account status is re-read from the database on every
  authenticated request, so suspending a user takes effect immediately.
- Registration is buyer/seller only (admins are created out-of-band):
  buyers start `ACTIVE`, sellers start `PENDING` until admin approval (FR-09).
- Auth error codes: `INVALID_CREDENTIALS` (401), `UNAUTHENTICATED` (401),
  `ACCOUNT_PENDING` / `ACCOUNT_INACTIVE` (403), `ROLE_FORBIDDEN` (403).
- Login/register are rate-limited (20 attempts / 10 min per client) and
  passwords require ≥8 chars with a letter and a number (bcrypt cost 12).
- Seller accounts start `PENDING` but **may still sign in** so they can finish
  onboarding (Phase 3). `rejected`/`suspended` accounts are refused with
  `ACCOUNT_INACTIVE`. Business operations add `requireActiveAccount`, so a
  pending seller can only work on their own profile (BR-02).

## 7. Business profiles (Phase 3)

- `GET /api/v1/business-profile` — own profile + derived onboarding status
  (`{ completed, percent, missingFields }`), 404 when not created yet.
- `POST /api/v1/business-profile` — creates the account's single profile;
  409 `PROFILE_EXISTS` on a second attempt (1:1 `user_id`).
- `PATCH /api/v1/business-profile` — partial update of own profile.
- `GET /api/v1/business-profile/public/:userId` — business-facing seller view.
- Next.js mirrors these as `GET|POST|PATCH /api/business-profile`.
- `businessType` is role-scoped: sellers `MANUFACTURER|WHOLESALER`, buyers
  `RETAILER|DISTRIBUTOR|RESELLER|INSTITUTIONAL`; a mismatch is a 400.
- Onboarding completion is derived from real data — sellers additionally need
  `description` + `serviceArea`, buyers need a delivery location.
- Ownership: writes are always scoped to the session user's `userId`, so no
  account can edit another profile. `verificationStatus` is never client
  writable (administrator decision, FR-09).
- The public view omits `contactPhone`, `gstNumber`, street `address`, and
  `pincode` until PRD §14.2 settles contact visibility.

## 8. Product catalog (Phase 4)

- Discovery (any signed-in account): `GET /api/v1/products` with `q`,
  `category` (id or slug), `minPrice`, `maxPrice`, `sellerCity`,
  `availability` (`any|available|unavailable`), `sort`
  (`newest|name_asc|name_desc|price_asc|price_desc`), `page`, `pageSize`.
- `GET /api/v1/products/categories` — filter options with visible-product counts.
- `GET /api/v1/products/:id` — detail with MOQ, indicative price, images,
  available variants, and the seller's public business summary.
- Seller-only (`SELLER` + `ACTIVE` account): `POST /api/v1/products`,
  `PATCH|DELETE /:id`, `POST /:id/publish`, `POST /:id/archive`,
  `GET /products/mine`, plus `POST|DELETE` image and variant sub-resources.
- Next.js mirrors the same surface under `/api/products/**`.
- Ownership: every mutation loads the product scoped to the caller's
  `sellerId` and answers 404 otherwise, so ids cannot be probed.
- Lifecycle: new listings are `DRAFT`; publishing requires an active account
  **and** a business profile. `DELETE` only removes drafts — published
  listings must be archived (`409 ARCHIVE_REQUIRED`) so order history keeps
  its references (BR-08).
- Visibility (BR-02/BR-03): buyers only ever see `ACTIVE` products whose
  seller is `ACTIVE` and has a business profile.
- Availability is seller-provided information (`isAvailable` +
  `availabilityNote`), never a stock guarantee (BR-09); it is re-checked when
  an order request is submitted in the next phase.
- Prices are stored as `numeric(12,2)` and always surfaced as *indicative*
  until a seller accepts a request (BR-06).

## 9. Order requests (Phase 5)

Endpoints (Express `/api/v1/orders/**`, mirrored by Next `/api/orders/**`):

| Method | Path | Party | Purpose |
| ------ | ---- | ----- | ------- |
| GET | `/orders` | both | Requests where the caller is buyer or seller, with per-status counts in `meta.counts` |
| POST | `/orders` | buyer | Submit a request (FR-28) |
| GET | `/orders/:id` | both | Request with items and full status history |
| POST | `/orders/:id/accept` | seller | Confirm a final unit price per line (FR-31) |
| POST | `/orders/:id/reject` | seller | Decline the request (FR-32) |
| POST | `/orders/:id/propose` | seller | Counter with new quantities/prices (FR-33) |
| POST | `/orders/:id/send-proposal` | seller | Ask the buyer to respond |
| POST | `/orders/:id/accept-proposal` | buyer | Accept proposed terms (FR-34) |
| POST | `/orders/:id/decline-proposal` | buyer | Decline proposed terms (FR-34) |
| POST | `/orders/:id/cancel` | buyer | Withdraw before anything is agreed (FR-37) |
| POST | `/orders/:id/complete` | seller | Mark an accepted order fulfilled |

- Every action takes an optional `{ "note": "..." }`; notes are stored on the
  history entry they belong to.
- **State machine** (`src/server/services/order-status.ts`): all changes go
  through `assertTransition`, which refuses invalid moves with
  `409 INVALID_TRANSITION` and wrong-role moves with `403 ROLE_FORBIDDEN`.
  Terminal states (`REJECTED`, `CANCELLED`, `COMPLETED`) accept nothing.
- Lifecycle: `PENDING_SELLER → ACCEPTED | REJECTED | SELLER_PROPOSED`,
  `SELLER_PROPOSED → AWAITING_BUYER`, `AWAITING_BUYER → ACCEPTED | REJECTED`,
  `ACCEPTED → COMPLETED`, with `CANCEL` available to the buyer before terms
  are agreed.
- A drafted proposal is private to the seller: while the status is
  `SELLER_PROPOSED` the buyer's payload omits the proposed figures entirely,
  so nothing can be mistaken for agreed terms.
- Submission validates: products exist, all belong to **one seller**
  (`ONE_SELLER_PER_REQUEST`), listings are `ACTIVE` and `isAvailable`,
  quantities meet the stated MOQ, and any chosen variant exists
  (`PRODUCT_UNAVAILABLE`, `VALIDATION_ERROR` with per-item details).
- Product name, variant, quantity, and prices are snapshotted onto
  `ORDER_ITEM`, so later catalogue edits never rewrite a request (BR-08).
- `proposedTotal` / `agreedTotal` are always recomputed server-side from
  validated quantities × prices; a line without a price yields `null` rather
  than a guess (BR-11).
- Only the two parties can read or act on a request; anyone else receives
  `404` so request ids cannot be probed.
- Acceptance re-checks that every product is still live (`PRODUCT_UNAVAILABLE`),
  because availability is seller-provided information (BR-09).
- No payment step exists anywhere in this flow (BR-14).

## 10. Notifications (Phase 6)

Endpoints (Express `/api/v1/notifications/**`, mirrored by Next
`/api/notifications/**`):

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/notifications` | Own notifications, newest first; `?page=&pageSize=&unreadOnly=true`, unread count in `meta.unread` |
| GET | `/notifications/unread-count` | Badge count for the header |
| POST | `/notifications/:id/read` | Mark one notification read |
| POST | `/notifications/read-all` | Mark every unread notification read |

- Notifications are private: every query is scoped by `userId`, and marking
  one read uses `updateMany({ where: { id, userId } })`, so another account's
  id yields `404` rather than a leak.
- Types follow the ER diagram: `ORDER_REQUEST`, `ORDER_RESPONSE`,
  `ORDER_UPDATE`, `ACCOUNT_UPDATE`, `SYSTEM`.
- Events currently delivered (`order-notifications.ts` writes the
  counterparty's notice, never the actor's):

  | Event | Recipient | Type |
  | ----- | --------- | ---- |
  | Request submitted | seller | `ORDER_REQUEST` |
  | Proposal sent to buyer | buyer | `ORDER_UPDATE` |
  | Seller accepted | buyer | `ORDER_RESPONSE` |
  | Buyer accepted proposal | seller | `ORDER_RESPONSE` |
  | Declined by either party | counterparty | `ORDER_RESPONSE` |
  | Buyer cancelled | seller | `ORDER_UPDATE` |
  | Order completed | buyer | `ORDER_UPDATE` |
  | Account created | new user | `SYSTEM` |
  | Business profile saved | owner | `ACCOUNT_UPDATE` |

- A **drafted** proposal (`SELLER_PROPOSED`) notifies nobody — the buyer must
  not learn about terms the seller has not sent yet.
- Notices carry `orderRequestId` (nullable FK, `ON DELETE SET NULL`) so the UI
  can link straight to the related request for the reader's role.
- Notice creation never blocks or rolls back the business action that caused
  it: failures are logged and swallowed.
- The root layout resolves the session and unread count server-side, so the
  header badge is correct on the first paint; the client re-checks on window
  focus and after read actions. Email and push delivery are out of scope.

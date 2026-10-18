# Testing and Security

How the test suite is organised, what it guarantees, and what it deliberately
does not claim.

## Running the tests

```bash
npm run test              # everything
npm run test:unit         # pure business rules, no I/O
npm run test:integration  # services and HTTP against a real database
npm run test:frontend     # React components in jsdom
npm run test:watch        # watch mode
```

Integration and frontend tests need PostgreSQL running.

### The test database

Tests must never touch development or production data. They connect to
`marketsphere_test`, overridable with `TEST_DATABASE_URL`.

> **Never point the suite at Neon.** `resetDb()` truncates every domain table
> on connect; against the production database that destroys the marketplace.
> `test:db:setup` refuses to migrate any database whose name does not end in
> `_test`, but `DATABASE_URL` is still what Prisma connects to — keep the test
> environment pointing at a local PostgreSQL instance.

```bash
createdb marketsphere_test
npm run test:db:setup
```

`test:db:setup` refuses to run against any database whose name does not end in
`_test`, so it cannot migrate the development database by accident.

Every integration test starts with `resetDb()`, which truncates all domain
tables. Tests therefore never depend on leftovers from an earlier one.

## Layout

| Path | Contents |
| --- | --- |
| `tests/unit/` | Business rules with no I/O — the order state machine, validators, formatting. |
| `tests/integration/` | Services, middleware and real HTTP requests through Express (`supertest`). |
| `tests/frontend/` | Components in jsdom, focused on what a user actually sees and does. |
| `tests/helpers/db.ts` | `resetDb()` plus factories for users, sellers, buyers, admins, categories and products. |
| `tests/setup/` | Runs before any test module: database URL, test signing key, rate-limit switch. |

The signing key used by tests is fixed and defined in `tests/setup/`, never
inherited from `.env`, so a test can never sign a token with a real secret.

## What the suite protects

These are the rules that would cause real harm if they broke, and where each
one is pinned down:

| Rule | Covered by |
| --- | --- |
| A submitted request is never an order (BR-04) | `order-status`, `orders`, `order-display`, `order-request-form` |
| Only the two parties can see a request | `orders`, `authorization` |
| One seller per request (BR-03) | `orders`, `order-request-form` |
| Seller minimum order quantity (BR-07) | `orders`, `order-request-form` |
| Prices are agreed, never assumed by the client | `orders`, `order-request-form` |
| A seller's draft proposal stays private until sent (FR-33) | `orders` |
| Only an approved seller can publish (BR-02) | `authorization` |
| One seller cannot edit another's listing | `authorization` |
| Administrators cannot act as buyers or sellers | `authorization` |
| A suspended account loses access immediately | `authorization`, `orders` |
| Notifications stay with their owner | `orders` |
| Emails cannot be split by letter case | `auth` |

## Security measures in place

- **Passwords** are hashed with bcrypt (cost 12) and never returned by any
  endpoint. Verified in `auth.test.ts`.
- **Sessions** are HS256 JWTs in an `httpOnly`, `SameSite=Lax` cookie that is
  `Secure` in production. The account status is re-read from the database on
  every request, so a suspension takes effect immediately rather than at token
  expiry.
- **Cross-origin writes** are rejected. `SameSite=Lax` is the first layer;
  `requireTrustedOrigin` verifies `Origin` (falling back to `Referer`) against
  the configured app origin. A header that is present but unparseable is
  rejected rather than ignored, so a malformed value cannot skip the check.
- **Rate limiting** — 20 auth attempts per 10 minutes per IP, plus 300
  requests per minute across the rest of the API. The limiter can only be
  switched off through `RATE_LIMIT_DISABLED`, which is ignored in production.
- **Payloads** are capped at 1 MB. An oversized body returns `413
  PAYLOAD_TOO_LARGE` and malformed JSON returns `400 BAD_JSON`; neither is
  allowed to surface as a `500`.
- **Image references** are restricted to `http`/`https`. `z.url()` alone also
  accepts `javascript:`, `data:` and `file:`, any of which would be rendered
  back from seller-supplied data, so the scheme is constrained explicitly.
- **Response headers** on the API: `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, a `default-src 'none'` CSP, and HSTS in
  production. The Next.js app sets its own CSP in `next.config.ts`.
- **Errors** always use the `{ success: false, error: { code } }` envelope with
  a stable code; stack traces, Prisma messages and file paths are never sent
  to a client.
- **Emails** are normalised to lower case in the service layer and protected by
  a unique index on `lower(email)`, so two accounts for one address are not
  possible even through a path that forgets to normalise.

## What is not covered

Stated plainly, because a green suite is not proof of safety:

- **No penetration testing or external security review.** The checks above are
  the ones the suite can make; they are not an audit.
- **No load or stress testing.** The rate limiter is an in-memory sliding
  window, which is per-process and therefore correct for a single instance
  only. A multi-instance deployment needs a shared store (Redis) before the
  limits mean anything.
- **No file uploads.** Images are stored as external `http`/`https` URLs, so
  there is no upload endpoint, no parser, and no storage-bucket handling in
  scope yet. Adding uploads introduces a whole new attack surface.
- **Storage credentials** (`STORAGE_*`) are configured but unused, pending an
  upload feature.
- **Component tests** cover the request form and status display rather than
  every screen; the remaining screens are covered through their services.
- Browser behaviour is asserted in jsdom, not in a real browser, so layout and
  responsive behaviour still need manual checks on a physical device.
- **The Electron shell is untested.** `electron/main.js` is currently a
  minimal window that loads `http://localhost:3000`; it has no production URL,
  no preload script, and no test coverage. It is the next phase.

## Running the suite against a deployment

Tests run against a local database only. To verify a deployed instance, use
the smoke script instead — it makes no destructive writes:

```bash
./scripts/smoke-test.sh <frontend-url> <api-url>
```

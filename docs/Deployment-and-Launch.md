# MarketSphere — Phase 10: Deployment and Launch Preparation

Production deployment, infrastructure configuration, security headers, operational playbooks, and pilot execution for MarketSphere's initial release.

---

## Targeted Initial Scope

The pilot launch is deliberately constrained:

- **Category**: Home Textiles and Home Furnishings (bedsheets, quilts, towels, curtains, cushion covers, table linen).
- **Supply Region**: Sellers located in **Sonipat, Haryana**.
- **Demand Region**: Business buyers located in **Delhi-NCR** (retailers, distributors, boutique hotels, institutional buyers).

---

## 1. Production Architecture Overview

```
                    ┌──────────────────────────────────────────┐
   Browser /        │        Vercel — Next.js 15               │
   Electron app ───►│  - Web UI (Buyer, Seller, Admin)         │
                    │  - /api/* Route Handlers (same origin)   │
                    │    → call the service layer directly     │
                    └───────────────────┬──────────────────────┘
                                        │ Prisma (TLS, pooled)
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │        Neon PostgreSQL 16                │
                    │        region: ap-southeast-1 (Asia)    │
                    │  - Prisma schema, 13 tables              │
                    │  - Point-in-time recovery + branching    │
                    └───────────────────▲──────────────────────┘
                                        │ Prisma (TLS, pooled)
                    ┌───────────────────┴──────────────────────┐
   API clients ───►│        Render — Standalone Express API    │
   (optional)       │  - /api/v1/* over the same service layer │
                    │  - Health, smoke tests, non-browser use  │
                    └──────────────────────────────────────────┘
```

### What runs where, and why

One service layer (`src/server/services/`) is exposed through **two transports**:

| Transport | Base path | Who uses it | Notes |
| :--- | :--- | :--- | :--- |
| Next.js Route Handlers | `/api/*` | The browser and the Electron app | Same-origin, so the session cookie is first-party. Calls services in-process. |
| Express | `/api/v1/*` | API clients, smoke tests, `supertest` integration tests | Separate deployment, same services and same validators. |

This is intentional: the browser never makes a cross-origin call to the API,
so there is no cross-site cookie to protect and no CORS preflight on the hot
path. The Express deployment is optional — the app is fully functional with
Vercel and Neon alone. It exists for non-browser clients (the upcoming
Electron build) and for operational smoke testing.

> **Consequence to keep in mind:** both transports enforce identical rules,
> because they share the services and validators. If you ever find a rule
> enforced in only one, that is a bug, not a deployment difference.

### The database is Neon, not Render

The production database is a **Neon** instance (region `ap-southeast-1`).
`render.yaml` therefore provisions **only the Express service** — there is no
Render-managed PostgreSQL. Do not re-add one: two databases would drift.

Neon specifics that matter:

- Use the **pooled** connection string (host contains `-pooler`) for runtime
  traffic from Vercel and Render, so many serverless invocations share a
  bounded number of Postgres backends.
- Use the **direct** (non-pooler) connection string for `prisma migrate
  deploy`, `pg_dump`, and `npm run db:seed`, because migrations and DDL are
  not safe through a transaction pooler.
- TLS is mandatory: keep `sslmode=require` in the URL.

---

## 2. Environment Variables Configuration

### Production Variables Checklist

| Variable | Set on | Purpose | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Vercel, Render, local CLI | Pooled Postgres connection string | `postgresql://USER:PASS@ep-…-pooler.…neon.tech/neondb?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | Vercel, Render | Public app origin; also the CSRF allow-list default | `https://marketsphere.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Vercel (build time) | Express origin allowed by the CSP `connect-src` | `https://marketsphere-api.onrender.com` |
| `AUTH_SECRET` | Vercel, Render | JWT session signing secret | 64 random bytes as hex |
| `CSRF_ALLOWED_ORIGINS` | Render | Extra origins allowed to make state-changing calls | `https://marketsphere.vercel.app` |
| `PORT` | Render | Server listen port | `3001` or Render's `$PORT` |
| `LOG_LEVEL` | Vercel, Render | Logging verbosity | `info` |
| `NODE_ENV` | Vercel, Render | Environment indicator; gates HSTS and the rate-limit bypass | `production` |
| `RATE_LIMIT_DISABLED` | **tests only** | Disables request limiting. Ignored when `NODE_ENV=production`. | `true` |

> [!IMPORTANT]
> Vercel and Render **must** share the identical `AUTH_SECRET` and
> `DATABASE_URL`. A mismatch does not error — it silently invalidates every
> session cookie, so users appear logged out at random.

> [!WARNING]
> `NEXT_PUBLIC_*` variables are **inlined at build time** by Next.js. Changing
> `NEXT_PUBLIC_API_URL` requires a rebuild, not just a restart.

### Generating a Secure AUTH_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Rotating it invalidates all existing sessions. That is the desired behaviour
after any suspected exposure.

### Handling secrets

Set production values in the **Vercel** and **Render** dashboards, or in a
gitignored `.env.production` for local CLI work. Do not pass secrets as inline
`VAR=value` arguments in a terminal: they are recorded in shell history and in
any log or screenshot that captures the command.

---

## 3. Database Setup & Migrations (Neon)

### 3.1 Provisioning (completed)

1. Create a Neon project and a `neondb` database in region `ap-southeast-1`.
2. Copy both connection strings: **pooled** (runtime) and **direct**
   (migrations, dumps, seeding).
3. Set `DATABASE_URL` to the **pooled** string in Vercel and Render.

### 3.2 Running Migrations & Seeding

`scripts/render-build.sh` applies migrations and seeds categories during the
Render build. Vercel runs `prisma generate && next build`, so migrate the
database explicitly from a workstation:

```bash
DATABASE_URL="<NEON_DIRECT_URL>" npx prisma migrate deploy
DATABASE_URL="<NEON_DIRECT_URL>" npm run db:seed
```

Seeding is idempotent, so re-running it is safe.

### 3.3 Creating the Production Administrator

Administrators cannot self-register. Create one out-of-band:

```bash
ADMIN_NAME="Platform Ops" \
ADMIN_EMAIL="ops@example.com" \
ADMIN_PASSWORD="<a strong unique password>" \
npm run admin:create
```

Put `ADMIN_EMAIL` / `ADMIN_PASSWORD` in a gitignored file or export them from
a secret store, and run the command on its own. Two failure modes to avoid:

- **Smart quotes.** A curly closing quote (`”`) typed into a terminal becomes
  part of the password or email rather than closing the string. Verify with
  `printf '%s\n' "$ADMIN_EMAIL"` before running.
- **Password reuse.** This password must not appear in any other system.

The script is idempotent: if the account exists it reports the existing
account instead of creating a duplicate.

### 3.4 Connection behaviour

Vercel and Render scale to zero and spike, so each can open many short-lived
connections. Use Neon's pooled endpoint to keep the backend count bounded.
Prisma's own connection limit (`DATABASE_URL` query parameters
`connection_limit` / `pgbouncer`) is not required while a pooler sits in
front, but monitor `max_connections` during a launch spike.

---

## 4. Deploying the Services

### 4.1 Express API (Render Blueprint)

`render.yaml` defines the web service only — the database comes from Neon.

1. Render dashboard → **New +** → **Blueprint**.
2. Connect `interterrestrial/MarketSphere`.
3. Set `DATABASE_URL` to the Neon **pooled** string and set `AUTH_SECRET`
   (clear the "generate value" checkbox so it matches Vercel).
4. Set `NEXT_PUBLIC_APP_URL` and `CSRF_ALLOWED_ORIGINS` to the deployed app URL.

For a manual service instead:

- **Build Command**: `chmod +x scripts/render-build.sh && ./scripts/render-build.sh`
- **Start Command**: `npm run server`
- **Health Check Path**: `/api/health`

### 4.2 Frontend (Vercel)

1. Vercel → **Add New** → **Project** → import `interterrestrial/MarketSphere`.
2. Framework preset **Next.js**, root directory `./`.
3. Build command `prisma generate && next build` (preset in `package.json`).
4. Environment variables:
   - `DATABASE_URL`: Neon **pooled** string.
   - `AUTH_SECRET`: identical to Render's.
   - `NEXT_PUBLIC_APP_URL`: the Vercel domain.
   - `NEXT_PUBLIC_API_URL`: the Render API domain.
   - `NODE_ENV`: `production`.
5. Deploy, then copy the resulting domain into `CSRF_ALLOWED_ORIGINS` on Render
   and redeploy Render. **Browser writes fail until this matches.**

---

## 5. HTTPS and Security Headers

### 5.1 Enforced headers

`src/server/middleware/security.ts` (API) and `next.config.ts` (web app):

| Header | API | Web app |
| :--- | :--- | :--- |
| `X-Content-Type-Options: nosniff` | yes | yes |
| `X-Frame-Options: DENY` | yes | yes |
| `Referrer-Policy` | `no-referrer` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Opener-Policy` | `same-origin` | — |
| `Cross-Origin-Resource-Policy` | `same-origin` | — |
| `Permissions-Policy` | camera/mic/geolocation off | camera/mic/geolocation off |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` | see below |
| `Strict-Transport-Security` | production only | production only |

The API CSP reflects that the API returns JSON only. The web CSP is
`default-src 'self'` with `img-src` allowing `https:` (seller-supplied product
image URLs), Google Fonts, and `connect-src` limited to `'self'` plus
`NEXT_PUBLIC_API_URL`. `unsafe-eval` is allowed **only** outside production,
because Next.js Fast Refresh needs it.

### 5.2 Other protections

- **CSRF**: `SameSite=Lax` cookie plus `requireTrustedOrigin`, which compares
  `Origin` (falling back to `Referer`) against `NEXT_PUBLIC_APP_URL` and
  `CSRF_ALLOWED_ORIGINS` for `POST`/`PUT`/`PATCH`/`DELETE`. A header that is
  present but unparseable is rejected, not ignored.
- **Rate limiting**: 20 auth attempts / 10 min / IP, plus 300 requests /
  min / IP across the rest of the API. In-memory, therefore per-instance —
  see §8.
- **Payload limits**: 1 MB body cap; oversized bodies return
  `413 PAYLOAD_TOO_LARGE` and malformed JSON returns `400 BAD_JSON`.
- **Image references**: restricted to `http(s)`, so `javascript:`, `data:`
  and `file:` URLs are rejected at validation.
- **Email uniqueness**: normalised to lower case in the service layer and
  enforced by a unique index on `lower(email)`.

---

## 6. Error Monitoring and Logging

1. **Application logging** — structured JSON from `src/lib/logger.ts` and
   `src/server/middleware/request-logger.ts`. One line per request
   (`METHOD path -> STATUS durationMs`). Request bodies are never logged, so
   passwords cannot leak into logs. `4xx` at warn, `5xx` at error with stack.
2. **Health monitoring** — both stacks expose `/api/health`, returning
   `200` with `{ "status": "ok", "database": "connected" }` or `503` when the
   database is unreachable:
   - Web: `GET https://<vercel-domain>/api/health`
   - API: `GET https://<render-domain>/api/health`
   Point UptimeRobot or BetterStack at both, every 5 minutes. Alert on 503 —
   that is the signal the database or the Neon pool is exhausted.
3. **Audit trail** — admin moderation actions (seller approval, listing
   moderation, account suspension) are written to `AuditLog` with actor,
   entity, action, and reason.
4. **Neon** — enable point-in-time recovery and watch connection usage in the
   Neon console during the pilot.

---

## 7. Production Verification & Smoke Testing

```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh https://marketsphere.vercel.app https://marketsphere-api.onrender.com
```

The same automated suite that guards development runs against the code that
ships:

```bash
npm run test:unit
npm run test:integration   # needs a LOCAL postgres; never point this at Neon
npm run test:frontend
```

### Manual Workflow Verification Checklist

- [ ] **Home Page**: Brand aesthetics, category carousel, navigation bar render cleanly.
- [ ] **Admin Sign-in**: Confirm the out-of-band admin account reaches `/admin`.
- [ ] **Seller Registration**: Register a Sonipat seller with GSTIN, business profile, and phone number.
- [ ] **Admin Approval**: Approve the pending seller; confirm the badge flips to approved.
- [ ] **Catalogue Addition**: Create a product with MOQ and indicative price; confirm it stays hidden until approved.
- [ ] **Admin Listing Approval**: Approve the listing and confirm it becomes visible in `/products`.
- [ ] **Buyer Discovery**: Search and filter the Home Textiles catalogue.
- [ ] **Buyer Order Request**: Submit a request below the MOQ (rejected), then at or above it (accepted).
- [ ] **Seller Proposal**: Propose changed terms; confirm the buyer cannot see the draft until it is sent.
- [ ] **Cross-Origin Check**: With the app open in a browser, confirm writes succeed; then confirm `POST` with a foreign `Origin` returns `403 ORIGIN_REJECTED`.
- [ ] **Suspension**: Suspend a seller from `/admin`; confirm their session stops working on the next request.
- [ ] **Contact Hand-off**: Confirm contact details appear for both parties after acceptance.

---

## 8. Backup and Disaster Recovery

### 8.1 On-demand backup

Neon performs continuous WAL archiving and supports point-in-time recovery;
that is the primary safety net. For an independent copy:

```bash
./scripts/backup-db.sh "<NEON_DIRECT_URL>"
```

This writes `backups/marketsphere_YYYY-MM-DD_HHMMSS.sql.gz` and keeps the 10
most recent. Use the **direct** URL — a dump through the pooler can produce a
truncated file.

Restoring:

```bash
./scripts/restore-db.sh backups/marketsphere_2026-10-18_180000.sql.gz "<NEON_DIRECT_URL>"
```

For a rehearsal, restore into a Neon **branch** first and verify row counts
before touching production.

---

## 9. Known Deployment Limitations

Stated plainly, because they affect launch decisions:

- **Rate limiting is in-memory and per-instance.** Correct for one process; on
  a multi-instance deployment the effective limit multiplies by the instance
  count. Move to Redis before scaling the API horizontally.
- **Neon credentials and `AUTH_SECRET` were exposed in a terminal session.**
  Both must be rotated before go-live (see §10).
- **No file uploads.** Images are external `http(s)` URLs, so there is no
  storage bucket in play; `STORAGE_*` is reserved for that future work.
- **No automated CI.** The test suite is run manually; a bad commit can reach
  `main` without a gate.
- **The desktop app is unsigned.** Every `.dmg` build is ad-hoc signed and
  will not open on another Mac. Distribution needs an Apple Developer ID
  certificate and notarization credentials — see
  [`Desktop-App.md`](Desktop-App.md).
- **No external security review or load testing** — see
  [`Testing-and-Security.md`](Testing-and-Security.md).

---

## 10. Go-Live Blockers

Do not launch until all of these are ticked:

- [ ] **Rotate `AUTH_SECRET`.** The current value was exposed in a terminal
      session and transcript. Generate a new one, update Vercel **and**
      Render, redeploy both, and expect every user to be signed out once.
- [ ] **Reset the Neon database password.** Update `DATABASE_URL` on both
      services afterwards.
- [ ] `CSRF_ALLOWED_ORIGINS` on Render matches the live Vercel domain.
- [ ] `AUTH_SECRET` is byte-identical on Vercel and Render.
- [ ] Neon point-in-time recovery is enabled.
- [ ] `/api/health` returns 200 on both deployments and is monitored.
- [ ] The manual checklist in §7 is complete on the production URLs.
- [ ] A Neon branch restore has been rehearsed.

---

## 11. Controlled Pilot Launch Plan

### 11.1 Participant Cohort

- **Sellers (Sonipat)**: 3–5 verified home textile manufacturers/wholesalers
  in the Sonipat textile hub (Murthal / Kundli industrial zones).
- **Buyers (Delhi-NCR)**: 5–10 verified business buyers (retail shop owners in
  Chandni Chowk / Karol Bagh, boutique guesthouse operators in Gurugram /
  South Delhi).

### 11.2 Pilot Operations Protocol

1. **Day 1–2 (Onboarding)** — walk Sonipat sellers through business profile
   setup, GST verification, and 5–10 hero SKUs with clear indicative prices
   and MOQs. Admin verifies each profile within 2 hours of submission.
2. **Day 3–7 (Ordering & Negotiation)** — buyers submit real purchase
   requests. Observe the proposal flow, price adjustments, and note exchanges.
   Confirm contact hand-off happens immediately upon acceptance.
3. **Day 8–10 (Fulfillment & Feedback)** — offline fulfillment coordination
   between parties using displayed contact details; mark orders complete on
   the platform.

---

## 12. Post-Pilot Triage and Issue Resolution

| Severity | Issue Type | Resolution Workflow | Rollback Trigger |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Auth failure, data leakage, order state deadlock | Immediate hotfix branch → `npm run test` → push to `main` | Revert the commit on the Vercel/Render dashboard |
| **P1 (High)** | Verification lag, search error, UI regression | Triage within 4 hours, ship same day | Hotfix deploy |
| **P2 (Normal)** | Copy tweak, optional field, styling polish | Batch into the next release | Standard review |

---

## Summary Checklist for Go-Live

- [x] `.env.production.example` prepared (Neon-oriented)
- [x] `render.yaml` blueprint with the Express service configured
- [x] Pre-build Prisma generation in `package.json`
- [x] Migration & seeding script (`scripts/render-build.sh`)
- [x] Smoke test, backup and restore scripts
- [x] Security headers, dynamic CSP, HSTS, CSRF, rate limiting
- [x] Automated test suite (136 tests) and documented security posture
- [x] Pilot operating plan for Sonipat sellers and Delhi-NCR buyers
- [ ] **Rotate `AUTH_SECRET` and the Neon password** (§10)
- [ ] Production URLs confirmed in `CSRF_ALLOWED_ORIGINS` and `NEXT_PUBLIC_*`
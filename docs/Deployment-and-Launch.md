# MarketSphere — Phase 10: Deployment and Launch Preparation

This document details the production deployment, infrastructure configuration, security headers, operational playbooks, and pilot execution for MarketSphere's initial release.

---

## Targeted Initial Scope

Per the Phase 10 requirement, the pilot launch is deliberately constrained:
- **Category**: Home Textiles and Home Furnishings (bedsheets, quilts, towels, curtains, cushion covers, table linen).
- **Supply Region**: Sellers located in **Sonipat, Haryana**.
- **Demand Region**: Business buyers located in **Delhi-NCR** (retailers, distributors, boutique hotels, institutional buyers).

---

## 1. Production Architecture Overview

MarketSphere uses a split-deployment topology:

```
                      ┌──────────────────────────────────────┐
                      │          Vercel (Next.js 15)         │
                      │  - Web UI (Buyer, Seller, Admin)     │
                      │  - Same-origin Route Handlers        │
                      └──────────────────┬───────────────────┘
                                         │ (Database queries)
                                         ▼
┌────────────────────────────┐    ┌──────────────────────────┐
│  Render (Web Service)      │    │  Render (PostgreSQL 16)  │
│  - Standalone Express API  ├───►│  - Prisma Client & Schema│
│  - Health & Auth services  │    │  - Daily automated dumps │
└────────────────────────────┘    └──────────────────────────┘
```

---

## 2. Environment Variables Configuration

### Production Variables Checklist

| Variable | Target Service | Purpose | Value / Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Vercel & Render | Postgres connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | Vercel & Render | Public frontend URL | `https://marketsphere.vercel.app` (or custom domain) |
| `NEXT_PUBLIC_API_URL` | Vercel | Standalone API URL | `https://marketsphere-api.onrender.com` |
| `AUTH_SECRET` | Vercel & Render | JWT session signing secret (min 32 chars) | Generated 64-byte hex string |
| `CSRF_ALLOWED_ORIGINS`| Render | Allowed browser origins for state-changing calls | `https://marketsphere.vercel.app` |
| `PORT` | Render | Server listen port | `3001` (or Render's `$PORT`) |
| `LOG_LEVEL` | Vercel & Render | Logging verbosity | `info` (or `warn` in high volume) |
| `NODE_ENV` | Vercel & Render | Environment indicator | `production` |

> [!IMPORTANT]
> Both Vercel and Render **must** share the exact same `AUTH_SECRET` and `DATABASE_URL` so session cookies and database records remain consistent across frontend routes and API requests.

### Generating a Secure AUTH_SECRET
Run in your local terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 3. Database Setup & Migrations (PostgreSQL on Render)

### 3.1 Provisioning
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **PostgreSQL**.
3. Settings:
   - **Name**: `marketsphere-db`
   - **Database**: `marketsphere_prod`
   - **User**: `marketsphere`
   - **Region**: Oregon (or nearest available region)
   - **PostgreSQL Version**: `16`
   - **Plan**: `Free` (or `Starter` for persistent non-expiring storage)
4. Once provisioned, copy the **Internal Database URL** (for Render web service) and **External Database URL** (for local CLI migration and backup scripts).

### 3.2 Running Migrations & Seeding
Migrations are automatically applied during deployment via [`scripts/render-build.sh`](file:///Users/Deepak/Desktop/MarketSphere/scripts/render-build.sh).

To run manually or from your development workstation against production:
```bash
DATABASE_URL="<RENDER_EXTERNAL_DATABASE_URL>" npx prisma migrate deploy
DATABASE_URL="<RENDER_EXTERNAL_DATABASE_URL>" npm run db:seed
```

### 3.3 Creating the Production Administrator
Admin accounts cannot be self-registered through the public UI. Create the initial admin user using:
```bash
ADMIN_NAME="MarketSphere Ops" \
ADMIN_EMAIL="ops@marketsphere.in" \
ADMIN_PASSWORD="<A_SECURE_PASSWORD>" \
DATABASE_URL="<RENDER_EXTERNAL_DATABASE_URL>" \
AUTH_SECRET="<AUTH_SECRET>" \
npm run admin:create
```

---

## 4. Deploying the Services

### 4.1 Option A: Render Blueprint (Infrastructure-as-Code)
The repository includes [`render.yaml`](file:///Users/Deepak/Desktop/MarketSphere/render.yaml).
1. Go to **Render Dashboard** → **New +** → **Blueprint**.
2. Connect your GitHub repository (`interterrestrial/MarketSphere`).
3. Render reads `render.yaml` and provisions both `marketsphere-db` and `marketsphere-api`.
4. Add the missing environment variables (`NEXT_PUBLIC_APP_URL`, `CSRF_ALLOWED_ORIGINS`).

### 4.2 Option B: Manual Render Setup
1. **New Web Service** → Connect repo.
2. **Build Command**: `chmod +x scripts/render-build.sh && ./scripts/render-build.sh`
3. **Start Command**: `npm run server`
4. **Health Check Path**: `/api/health`
5. Configure the environment variables listed in Section 2.

### 4.3 Deploying Frontend to Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New** → **Project**.
2. Import `interterrestrial/MarketSphere`.
3. Framework Preset: **Next.js**.
4. Root Directory: `./`.
5. Build Command: `prisma generate && next build` (preset in `package.json`).
6. Environment Variables:
   - `DATABASE_URL`: Your Render PostgreSQL connection string (with `?sslmode=require`).
   - `AUTH_SECRET`: The identical secret string used on Render.
   - `NEXT_PUBLIC_APP_URL`: Your Vercel deployment URL (e.g., `https://marketsphere.vercel.app`).
   - `NEXT_PUBLIC_API_URL`: Your Render API URL (e.g., `https://marketsphere-api.onrender.com`).
   - `NODE_ENV`: `production`
7. Click **Deploy**.

---

## 5. HTTPS and Security Headers

### 5.1 Enforced Security Headers
The system automatically applies defense-in-depth headers in [`next.config.ts`](file:///Users/Deepak/Desktop/MarketSphere/next.config.ts) and [`src/server/middleware/security.ts`](file:///Users/Deepak/Desktop/MarketSphere/src/server/middleware/security.ts):
- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforced when `NODE_ENV=production`).
- **X-Content-Type-Options**: `nosniff`.
- **X-Frame-Options**: `DENY`.
- **Referrer-Policy**: `strict-origin-when-cross-origin` on web pages, `no-referrer` on API responses.
- **Content-Security-Policy (CSP)**:
  - Disallows unsafe inline scripts (no `unsafe-eval` in production).
  - Permits Google Fonts styles and font assets.
  - Whitelists image endpoints (`data:`, `blob:`, `https:`).
  - Restricts `connect-src` to `'self'` and the configured `NEXT_PUBLIC_API_URL`.
  - Blocks framing (`frame-ancestors 'none'`).
- **CSRF Protection**: State-changing requests (`POST`, `PATCH`, `DELETE`) validate `Origin` and `Referer` against `CSRF_ALLOWED_ORIGINS`.

---

## 6. Error Monitoring and Logging

1. **Application Logging**:
   - Structured JSON logging is implemented in [`src/lib/logger.ts`](file:///Users/Deepak/Desktop/MarketSphere/src/lib/logger.ts) and [`src/server/middleware/request-logger.ts`](file:///Users/Deepak/Desktop/MarketSphere/src/server/middleware/request-logger.ts).
   - In production, set `LOG_LEVEL=info`. Logs include HTTP status codes, latency, client IP, and contextual error stack traces.
2. **Health Monitoring**:
   - Web application health: `GET https://<your-vercel-domain>/api/health`
   - Express API health: `GET https://<your-render-domain>/api/health`
   - Both return `{ "status": "ok", "database": "connected", "timestamp": "..." }` with status 200, or status 503 if the database drops.
   - Recommended uptime monitor: UptimeRobot or BetterStack pinging `/api/health` every 5 minutes.
3. **Audit Log Trail**:
   - Admin moderation actions (approving sellers, rejecting listings, suspending accounts) are recorded in the `AuditLog` table with timestamp and actor ID.

---

## 7. Production Verification & Smoke Testing

Run the included automated smoke test suite against the deployed staging or production instances:

```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh https://marketsphere.vercel.app https://marketsphere-api.onrender.com
```

### Manual Workflow Verification Checklist
- [ ] **Home Page**: Brand aesthetics, category carousel, navigation bar render cleanly.
- [ ] **Seller Registration**: Register a Sonipat seller with GSTIN, business profile, and phone number.
- [ ] **Admin Approval**: Sign in as admin, navigate to `/admin/verifications`, approve the pending seller.
- [ ] **Catalogue Addition**: Sign in as the approved seller, create a product under "Bedsheets & Bedding Sets" with MOQ and indicative price.
- [ ] **Buyer Discovery**: Browse `/products` without logging in, search/filter by Home Textiles.
- [ ] **Buyer Order Request**: Sign in as a Delhi-NCR buyer, create an order request with quantity and delivery note.
- [ ] **Seller Proposal / Acceptance**: Sign in as the seller, review the request, propose terms or accept.
- [ ] **Contact Visibility Check**: Verify seller contact phone, email, and business address appear for the buyer, and buyer contact details appear for the seller.

---

## 8. Backup and Disaster Recovery

### 8.1 On-Demand Backup
Run the backup script pointing to your production database:
```bash
./scripts/backup-db.sh "postgresql://marketsphere:PASSWORD@HOST:5432/marketsphere_prod?sslmode=require"
```
The script:
1. Generates a timestamped, gzip-compressed SQL dump in `./backups/marketsphere_YYYY-MM-DD_HHMMSS.sql.gz`.
2. Automatically rotates local backups, retaining the 10 most recent snapshots.

### 8.2 Database Restore
In the event of database corruption or migration error:
```bash
./scripts/restore-db.sh backups/marketsphere_2026-10-18_180000.sql.gz "postgresql://..."
```

---

## 9. Controlled Pilot Launch Plan

### 9.1 Participant Cohort
- **Sellers (Sonipat)**: 3 to 5 verified home textile manufacturers/wholesalers in the Sonipat textile hub (Murthal / Kundli industrial zones).
- **Buyers (Delhi-NCR)**: 5 to 10 verified business buyers (retail shop owners in Chandni Chowk / Karol Bagh, boutique guesthouse operators in Gurugram / South Delhi).

### 9.2 Pilot Operations Protocol
1. **Day 1–2 (Onboarding)**:
   - Walk Sonipat sellers through business profile setup, GST verification, and listing 5–10 hero SKUs with clear indicative prices and MOQs.
   - Admin verifies each profile within 2 hours of submission.
2. **Day 3–7 (Ordering & Negotiation)**:
   - Buyers submit real purchase requests.
   - Observe negotiation flow (proposals, price adjustments, note exchanges).
   - Ensure contact information hand-off happens immediately upon acceptance.
3. **Day 8–10 (Fulfillment & Feedback)**:
   - Offline fulfillment coordination between parties using displayed contact details.
   - Order completion marked on the platform.

---

## 10. Post-Pilot Triage and Issue Resolution

| Severity | Issue Type | Resolution Workflow | Rollback Trigger |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Auth failure, data leakage, order state deadlock | Immediate hotfix branch → local test suite (`npm run test`) → emergency git push to `main` | Revert commit on Vercel/Render dashboard in < 1 minute |
| **P1 (High)** | Verification lag, search indexing error, mobile UI glitch | Triage within 4 hours, deploy fix within same business day | No rollback; hotfix deploy |
| **P2 (Normal)** | Copy tweak, optional field clarification, styling polish | Batch into next scheduled release | Standard PR cycle |

---

## Summary Checklist for Go-Live

- [x] Environment template prepared (`.env.production.example`)
- [x] `render.yaml` blueprint with PostgreSQL and Web Service configured
- [x] Pre-build Prisma generation integrated into `package.json`
- [x] Production database migration & seeding script (`scripts/render-build.sh`)
- [x] Production smoke test suite (`scripts/smoke-test.sh`)
- [x] Automated backup and recovery scripts (`scripts/backup-db.sh`, `scripts/restore-db.sh`)
- [x] Security headers, CSP with dynamic API origin, HSTS, and CSRF protection active
- [x] Pilot operating plan drafted for Sonipat sellers and Delhi-NCR buyers

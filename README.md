# MarketSphere

**A B2B marketplace connecting micro and small enterprises with business buyers.**

MarketSphere is a digital marketplace designed to help micro and small enterprises (MSEs) expand their market reach by connecting directly with retailers, distributors, resellers, and institutional buyers.

The initial version focuses on **home textiles and home furnishings**, connecting sellers in **Sonipat, Haryana**, with buyers across **Delhi-NCR**.

The platform uses an order-request model in which buyers submit requests and sellers confirm availability, pricing, quantity, and delivery terms before accepting an order.

> **Project Status:** Feature-complete MVP. Phases 0–10 done; the Electron desktop application is the next phase.
> **Initial Category:** Home Textiles & Home Furnishings
> **Seller Region:** Sonipat, Haryana, India
> **Buyer Region:** Delhi-NCR, India

---

## Table of Contents

* [Overview](#overview)
* [Problem Statement](#problem-statement)
* [Objectives](#objectives)
* [Target Users](#target-users)
* [Key Features](#key-features)
* [Marketplace Workflow](#marketplace-workflow)
* [Technology Stack](#technology-stack)
* [System Architecture](#system-architecture)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)
* [Environment Variables](#environment-variables)
* [Deployment](#deployment)
* [Development](#development)
* [Testing](#testing)
* [Development Roadmap](#development-roadmap)
* [Future Scope](#future-scope)
* [Contributing](#contributing)
* [License](#license)
* [Project Documentation](#project-documentation)

---

## Overview

Small businesses often rely on traditional sales channels and personal networks to reach customers. MarketSphere aims to make it easier for these businesses to showcase their products and connect with new buyers.

The platform provides a centralized marketplace where sellers can manage product listings and receive business inquiries, while buyers can discover suppliers and submit structured order requests.

MarketSphere is being developed with a focused launch strategy: start with one product category and one seller region, validate the marketplace, and expand based on actual user needs.

### Initial Market

| Parameter        | Scope                                                        |
| ---------------- | ------------------------------------------------------------ |
| Marketplace      | B2B                                                          |
| Product Category | Home Textiles & Home Furnishings                             |
| Seller Region    | Sonipat, Haryana                                             |
| Buyer Region     | Delhi-NCR                                                    |
| Buyer Locations  | Delhi, Gurugram, Noida, Faridabad, Ghaziabad                 |
| Primary Sellers  | Manufacturers, wholesalers, and suppliers                    |
| Primary Buyers   | Retailers, distributors, resellers, and institutional buyers |
| Order Model      | Request and seller confirmation                              |

---

## Problem Statement

Micro and small enterprises often face challenges in reaching new business customers, maintaining digital product catalogs, and managing inquiries from buyers outside their existing networks.

At the same time, retailers and other business buyers may struggle to discover suitable suppliers and compare product specifications, minimum order quantities, and prices.

MarketSphere aims to address these challenges by providing:

* A centralized platform for discovering suppliers and products.
* Digital business profiles and product catalogs.
* Structured buyer inquiries and order requests.
* A workflow for sellers to confirm or negotiate order terms.
* A foundation for future business tools and market insights.

---

## Objectives

* **Expand market access:** Connect Sonipat-based businesses with buyers across Delhi-NCR.
* **Simplify product discovery:** Help buyers find relevant products and suppliers.
* **Streamline inquiries:** Make it easier for buyers to communicate their requirements.
* **Improve order coordination:** Enable sellers to review and confirm order requests.
* **Build trust:** Support business verification and product moderation.
* **Enable future growth:** Establish a scalable foundation for additional categories, regions, and business services.

---

## Target Users

### 1. Sellers

Manufacturers, wholesalers, and suppliers of home textiles and furnishings.

They can:

* Register and submit business details.
* Create and manage business profiles.
* Upload and manage product listings.
* Receive buyer inquiries and order requests.
* Accept, reject, or negotiate requests.
* Track order statuses.

### 2. Buyers

Retailers, distributors, resellers, and institutional buyers across Delhi-NCR.

They can:

* Register and manage business profiles.
* Browse and search products.
* Discover suppliers.
* Submit product inquiries and order requests.
* Review seller responses and proposed terms.
* Track their requests and accepted orders.

### 3. Administrators

Platform operators responsible for marketplace management.

They can:

* Review seller registrations.
* Approve or reject business accounts.
* Moderate product listings.
* Manage user accounts.
* Review reports and complaints.
* Monitor marketplace activity.

---

## Key Features

The following features define the MVP. All of them are implemented and covered
by automated tests; see [Testing](#testing).

| Feature                    | Description                                          | Priority |
| -------------------------- | ---------------------------------------------------- | -------- |
| User Authentication        | Secure registration, login, and password recovery    | P0       |
| Role-Based Access          | Separate permissions for buyers, sellers, and admins | P0       |
| Seller Onboarding          | Business registration and verification submission    | P0       |
| Buyer Onboarding           | Business registration and buyer type selection       | P0       |
| Business Profiles          | Public seller profiles and buyer account management  | P0       |
| Product Catalog            | Create, edit, and manage product listings            | P0       |
| Product Discovery          | Search, filtering, and sorting                       | P0       |
| Seller Discovery           | Browse supplier profiles and their products          | P0       |
| Order Requests             | Submit structured requests to sellers                | P0       |
| Seller Confirmation        | Accept, reject, or propose changes to requests       | P0       |
| Admin Dashboard            | Manage users, sellers, and product listings          | P0       |
| Notifications              | Notify users about important marketplace events      | P1       |
| Buyer-Seller Communication | Clarify product and order requirements               | P1       |
| Reporting                  | Report suspicious users or listings                  | P1       |

**Priority definitions:**

* **P0:** Required for the MVP.
* **P1:** Important, but may be deferred if necessary to deliver the core workflow.

---

## Marketplace Workflow

MarketSphere uses an order-request model rather than instant checkout.

### Buyer Workflow

1. Register and create a business profile.
2. Browse products and discover suppliers.
3. View product specifications, MOQ, pricing information, and seller details.
4. Submit an order request with quantities and delivery requirements.
5. Wait for the seller to review the request.
6. Accept or decline any proposed changes.
7. Coordinate fulfillment with the seller after the order is accepted.

### Seller Workflow

1. Register and submit business details.
2. Complete the verification process.
3. Create and manage product listings.
4. Receive buyer inquiries and order requests.
5. Review quantities, availability, pricing, and delivery feasibility.
6. Accept, reject, or propose changes to the request.
7. Coordinate fulfillment with the buyer after acceptance.

### Order Request Lifecycle

```text
Buyer Submits Request
         |
         v
Pending Seller Response
         |
         +--------------------+
         |                    |
         v                    v
      Accepted             Rejected
         |
         | If seller proposes changes
         v
 Awaiting Buyer Response
         |
         +--------------------+
         |                    |
         v                    v
 Buyer Accepts          Buyer Declines
         |
         v
 Accepted Order
         |
         v
 Fulfillment Coordination
         |
         v
 Completed
```

A submitted request is not a confirmed order. The seller must confirm the request, and any proposed changes must be accepted by the buyer.

Payments and logistics will initially be coordinated outside the platform.

---

## Technology Stack

| Technology        | Purpose                                       |
| ----------------- | --------------------------------------------- |
| Next.js 15        | App framework, routing, and API route handlers |
| React 19          | Component-based user interface                |
| TypeScript        | Type safety and maintainability               |
| Tailwind CSS      | Styling and design tokens                     |
| Node.js           | Server-side runtime                           |
| Express 4         | Standalone API over the same service layer    |
| PostgreSQL        | Relational database                           |
| Prisma 6          | ORM and schema migrations                     |
| Zod               | Request validation                            |
| jose + bcryptjs   | JWT sessions and password hashing             |
| Vitest            | Unit, integration, and component testing      |
| Electron          | Desktop shell (next phase)                    |

The backend is integrated into the Next.js application: route handlers under
`src/app/api/` call the same services as the standalone Express server, so the
browser talks to a single same-origin `/api/*` path. No cross-origin request
is made from the browser, which keeps the session cookie first-party.

Hosting is settled: the web app on **Vercel**, the optional Express API on
**Render**, and PostgreSQL on **Neon**. Object storage is deferred — product
images are external `http(s)` URLs and there is no upload endpoint yet.

---

## System Architecture

One service layer, two transports, one database.

```text
             BROWSER  ·  ELECTRON APP
                          |
                          v   same-origin /api/*  (session cookie is first-party)
                 NEXT.JS APPLICATION  (Vercel)
                          |
      +-------------------+-------------------+
      |                                       |
      v                                       v
 REACT UI + TAILWIND            ROUTE HANDLERS -> SERVICE LAYER
                                        |
                                        v
                            src/server/services/*
                          (auth · catalog · orders · notifications · admin)
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
        v                               v                               v
 EXPRESS API (Render, optional)   NEXT HEALTH PROBE              (same services)
   /api/v1/* over HTTP
        |                               |
        +---------------+---------------+
                        |
                        v  Prisma (TLS)
                  POSTGRESQL 16  (Neon)
```

Why both transports: the browser uses same-origin route handlers so cookies
stay first-party and no CORS preflight sits on the hot path. The Express server
exposes the identical services over `/api/v1` for API clients, the Electron
app, health probes, and the integration test suite. Both share the same
services and validators, so a rule enforced in one is enforced in the other.

### Core Modules

* **Authentication:** Registration, login, JWT sessions, role checks.
* **User Management:** Buyer and seller business profiles with onboarding state.
* **Product Catalog:** Listings, image URLs, variants, availability, admin approval.
* **Product Discovery:** Search, filters, sorting, pagination.
* **Order Management:** Requests, seller proposals, status history.
* **Notifications:** In-app notices, scoped to their owner.
* **Administration:** Verification, moderation, reporting, audit log.

---

## Project Structure

```text
marketsphere/
├── docs/
│   ├── API-Conventions.md            Response envelope, status codes, endpoints
│   ├── Design-Implementation.md      Shipped design tokens and deviations
│   ├── Deployment-and-Launch.md      Production topology and go-live checklist
│   ├── Testing-and-Security.md       Test layout, rules under test, limitations
│   ├── Product/                      PRD.md, Design.md
│   ├── Architecture Diagrams/        ER, UML class, use case
│   └── Research/                     Research.md
│
├── electron/
│   └── main.js                       Desktop shell (next phase, in progress)
│
├── prisma/
│   ├── schema.prisma                 12 models, 13 tables
│   ├── migrations/                   Applied migration history
│   └── seed.ts                       Launch categories (idempotent)
│
├── scripts/
│   ├── create-admin.ts               Out-of-band admin creation
│   ├── render-build.sh               Install, generate, migrate, seed
│   ├── smoke-test.sh                 Endpoint checks against a deployment
│   ├── backup-db.sh                  Timestamped gzip dump, keeps 10
│   └── restore-db.sh                 Restore from a dump
│
├── src/
│   ├── app/                          Next.js routes and /api/* handlers
│   ├── components/                   ui · layout · products · orders · admin
│   ├── lib/                          db, env, session, password, format, api client
│   ├── server/
│   │   ├── routes/                   Express routers
│   │   ├── services/                 Business logic (transport-independent)
│   │   ├── middleware/               auth, csrf, rate limit, security, errors
│   │   └── validators/               Zod schemas
│   └── types/                        Shared DTO and domain types
│
├── tests/
│   ├── unit/                         Pure business rules
│   ├── integration/                  Services + HTTP via supertest
│   ├── frontend/                     Components in jsdom
│   ├── helpers/db.ts                 resetDb() and factories
│   └── setup/                        Test env: DB URL, signing key, limits
│
├── .env.example                      Local development template
├── .env.production.example           Production template (Neon)
├── next.config.ts                    Security headers and CSP
├── render.yaml                       Express service blueprint
└── vitest.config.ts                  Three test projects
```

---

## Getting Started

### Prerequisites

Install the following:

* Node.js (LTS version)
* npm
* Git
* PostgreSQL

A code editor such as Visual Studio Code is recommended.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd marketsphere
```

Replace `<repository-url>` with the actual GitHub repository URL.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root using `.env.example` as a reference.

```bash
cp .env.example .env
```

Fill in the required database and authentication configuration.

### 4. Set Up the Databases

The app and the test suite use **separate databases**, so running tests can
never truncate development data.

```bash
createdb marketsphere        # from DATABASE_URL
npx prisma migrate deploy
npm run db:seed              # launch categories, idempotent

createdb marketsphere_test   # required by the integration tests
npm run test:db:setup        # refuses to touch any database not ending in _test
```

### 5. Create an Administrator (optional)

```bash
npm run admin:create
```

It reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Note that curly
quotes become part of the value — verify with `printf '%s\n' "$ADMIN_EMAIL"`.

### 6. Start the Development Servers

```bash
npm run dev        # Next.js app
npm run server     # standalone Express API, in a second terminal
npm run dev:all    # both together
```

Open the local development URL shown in the terminal.

### 7. Run the Tests

```bash
npm test           # 136 tests across unit, integration and frontend
```

See [Testing](docs/Testing-and-Security.md) for how the suite is organised and
what it deliberately does not cover.

---

## Environment Variables

Copy the template and fill in the values:

```bash
cp .env.example .env              # local development
cp .env.production.example .env.production   # production (gitignored)
```

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Signs session JWTs; 64 random bytes of hex |
| `NEXT_PUBLIC_APP_URL` | yes | Public app origin; also the default CSRF allow-list |
| `NEXT_PUBLIC_API_URL` | yes | Express origin allowed by the CSP; inlined at build time |
| `PORT` | no | Express port (default `3001`) |
| `CSRF_ALLOWED_ORIGINS` | no | Extra origins allowed to make state-changing calls |
| `LOG_LEVEL` | no | `debug`, `info` (default), `warn`, `error` |
| `NODE_ENV` | no | `development` (default) or `production` |
| `RATE_LIMIT_DISABLED` | no | **Tests only.** Ignored in production |
| `DIRECT_DATABASE_URL` | no | Non-pooler URL, used by the build script for migrations |
| `STORAGE_*` | no | Reserved for a future upload feature; unused today |

The app refuses to start without `AUTH_SECRET` and `DATABASE_URL` rather than
falling back to an insecure default.

**Never commit `.env`, `.env.production`, or any production secret.** Set
production values in the Vercel and Render dashboards.

---

## Deployment

Production runs the web app on **Vercel**, the optional Express API on
**Render**, and PostgreSQL on **Neon**. Two things catch people out:

- Vercel and Render must hold the **identical `AUTH_SECRET`** and
  `DATABASE_URL`. A mismatch does not error — it silently invalidates every
  session cookie.
- `NEXT_PUBLIC_*` variables are inlined at **build time**, so changing
  `NEXT_PUBLIC_API_URL` needs a rebuild.

Full topology, migration procedure, backup and restore, and the go-live
checklist are in [docs/Deployment-and-Launch.md](docs/Deployment-and-Launch.md).

---

## Development

### Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Next.js dev server |
| `npm run server` | Standalone Express API |
| `npm run dev:all` | Both together |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Full test suite |
| `npm run test:unit` / `test:integration` / `test:frontend` | One project at a time |
| `npm run test:watch` | Watch mode |
| `npm run test:db:setup` | Migrate the test database (refuses non-`_test` databases) |
| `npm run typecheck` | TypeScript without emitting |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run db:migrate` / `db:generate` / `db:seed` | Prisma tasks |
| `npm run db:studio` | Prisma Studio |
| `npm run admin:create` | Create an administrator out-of-band |
| `npm run check:contrast` | Verify design-token contrast ratios |
| `npm run electron:dev` / `electron:build` | Desktop shell (in progress) |

### Administration

Administrators sign in like any other account and land on `/admin`, where they
approve sellers, moderate listings, manage accounts, review reports, and read
the audit history. The API refuses these actions to non-administrators
regardless of what the browser sends, and every decision is recorded with the
administrator, the entity, and the reason.

```bash
ADMIN_NAME="Platform Ops" ADMIN_EMAIL="ops@example.com" npm run admin:create
```

Export `ADMIN_PASSWORD` from your shell or a secret file rather than inlining
it — inline secrets persist in shell history. The script is idempotent and
reports an existing account instead of creating a duplicate.

Sellers cannot publish listings themselves: a submitted listing waits for
administrator approval before buyers can see it.

### Development Guidelines

* Use TypeScript for application code.
* Keep components modular and reusable.
* Separate business logic from UI components.
* Validate important operations on the server.
* Enforce role-based permissions on protected routes and APIs.
* Use Prisma migrations for database changes.
* Keep secrets out of source control.
* Test critical user workflows before merging changes.

---

## Testing

136 automated tests across three projects:

| Project | Environment | Covers |
| :--- | :--- | :--- |
| `unit` | Node | Pure business rules: the order state machine, validators, formatting |
| `integration` | Node + PostgreSQL | Services, middleware, and real HTTP through Express via `supertest` |
| `frontend` | jsdom | Components a user actually touches, with Testing Library |

Integration tests run against `marketsphere_test` and truncate it between
tests; `npm run test:db:setup` refuses to migrate any database not ending in
`_test`, so the development and production databases cannot be damaged by a
test run.

The suite pins the rules that would cause real harm — a request is never an
order, one seller per request, MOQ enforcement, party isolation, admin-only
moderation, immediate effect of a suspension, and that seller-supplied image
URLs cannot carry `javascript:` or `data:` payloads.

What it does **not** cover is written down in
[docs/Testing-and-Security.md](docs/Testing-and-Security.md): no penetration
test, no load testing, and the rate limiter is in-memory and therefore
single-instance.

---

## Development Roadmap

| Phase | Focus | Status |
| :--- | :--- | :--- |
| 0 | Project setup and tooling | Done |
| 1 | Database design and API foundation | Done |
| 2 | Authentication and role management | Done |
| 3 | Business profiles and onboarding | Done |
| 4 | Product catalog and discovery | Done |
| 5 | Order request and confirmation | Done |
| 6 | Notifications | Done |
| 7 | Admin dashboard and moderation | Done |
| 8 | Frontend polish and usability | Done |
| 9 | Testing and security hardening | Done |
| 10 | Deployment and launch preparation | Done |
| 11 | Electron desktop application | In progress |

---

## Future Scope

Potential future improvements include:

* Integrated payment processing
* Logistics and shipment tracking
* Advanced seller analytics
* Demand forecasting
* Product quality improvement resources
* Waste and cost management tools
* Business learning resources
* Multilingual support
* Expansion to additional product categories and regions
* Mobile applications
* Object storage and product image uploads (currently external URLs only)

These features are not part of the initial MVP.

---

## Contributing

Contributions should follow the project's development guidelines.

For proposed changes:

1. Create a separate branch for your work.
2. Keep changes focused and maintainable.
3. Test the affected functionality.
4. Submit a pull request with a clear description of the changes.

Contribution guidelines may be expanded as the project and team grow.

---

## License

The project's license has not yet been specified.

A license should be selected before the repository is distributed publicly or accepts external contributions.

---

## Project Documentation

Documentation is maintained in the `docs/` directory.

| Document | Description |
| :--- | :--- |
| [`docs/API-Conventions.md`](docs/API-Conventions.md) | Response envelope, status codes, endpoints |
| [`docs/Design-Implementation.md`](docs/Design-Implementation.md) | Shipped design tokens and deviations |
| [`docs/Deployment-and-Launch.md`](docs/Deployment-and-Launch.md) | Production topology, backups, go-live checklist |
| [`docs/Testing-and-Security.md`](docs/Testing-and-Security.md) | Test layout, rules under test, security posture |
| [`docs/Product/PRD.md`](docs/Product/PRD.md) | Product requirements and MVP scope |
| [`docs/Product/Design.md`](docs/Product/Design.md) | UI/UX design principles |
| [`docs/Architecture Diagrams/`](docs/Architecture%20Diagrams) | ER, UML class, and use-case diagrams |
| [`docs/Research/Research.md`](docs/Research/Research.md) | Market and technology research |

---

**MarketSphere — Connecting small businesses with new markets.**

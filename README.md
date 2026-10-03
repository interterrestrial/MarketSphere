# MarketSphere

**A B2B marketplace connecting micro and small enterprises with business buyers.**

MarketSphere is a digital marketplace designed to help micro and small enterprises (MSEs) expand their market reach by connecting directly with retailers, distributors, resellers, and institutional buyers.

The initial version focuses on **home textiles and home furnishings**, connecting sellers in **Sonipat, Haryana**, with buyers across **Delhi-NCR**.

The platform uses an order-request model in which buyers submit requests and sellers confirm availability, pricing, quantity, and delivery terms before accepting an order.

> **Project Status:** MVP in development (Phase 5 of 8 complete)
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
* [Development](#development)
* [Development Roadmap](#development-roadmap)
* [Future Scope](#future-scope)
* [Contributing](#contributing)
* [License](#license)

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

The following features define the planned MVP. Their implementation status will be updated as development progresses.

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

MarketSphere is planned around the following technologies.

| Technology   | Purpose                                  |
| ------------ | ---------------------------------------- |
| Next.js      | Application framework and routing        |
| React.js     | Component-based user interface           |
| TypeScript   | Type safety and maintainability          |
| Tailwind CSS | Responsive styling                       |
| Node.js      | Server-side runtime                      |
| Express.js   | Backend API and business logic           |
| PostgreSQL   | Relational database                      |
| Prisma       | ORM and database schema management       |
| Figma        | UI/UX design and prototyping             |
| Git          | Version control                          |
| GitHub       | Source code management and collaboration |

The backend will be integrated into the Next.js application architecture where practical to avoid unnecessary duplicate compilation and deployment.

The final hosting and storage providers will be selected during implementation.

---

## System Architecture

MarketSphere will follow a modular application architecture.

```text
                 BUYERS / SELLERS / ADMINS
                            |
                            v
                  NEXT.JS APPLICATION
                            |
             +--------------+--------------+
             |                             |
             v                             v
       REACT FRONTEND                BACKEND API
       + TAILWIND CSS                NODE.JS + EXPRESS
             |                             |
             |                  +----------+----------+
             |                  |          |          |
             |                  v          v          v
             |             AUTHENTICATION PRODUCT   ORDER
             |             & AUTHORIZATION CATALOG  MANAGEMENT
             |                             |          |
             |                             |          |
             |                  +----------+----------+
             |                             |
             |                             v
             |                       PRISMA ORM
             |                             |
             |                             v
             |                        POSTGRESQL
             |
             v
       RESPONSIVE USER
          INTERFACE

                  FILE / OBJECT STORAGE
                  (Product Images and
                  Verification Documents)
```

### Core Modules

* **Authentication:** Registration, login, sessions, and access control.
* **User Management:** Buyer and seller profiles.
* **Product Catalog:** Product listings, images, variants, and availability.
* **Product Discovery:** Search, filters, and sorting.
* **Order Management:** Requests, seller responses, and order status history.
* **Notifications:** Important updates for buyers and sellers.
* **Administration:** Verification, moderation, and reporting.

Detailed architecture and database relationships will be documented separately.

---

## Project Structure

The following is a proposed structure. It will be updated to match the actual repository as implementation progresses.

```text
marketsphere/
│
├── public/
│   ├── images/
│   └── icons/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── buyer/
│   │   ├── seller/
│   │   ├── admin/
│   │   ├── products/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── products/
│   │   ├── orders/
│   │   └── forms/
│   │
│   ├── server/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── validators/
│   │
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   └── utils/
│
├── prisma/
│   └── schema.prisma
│
├── docs/
│   ├── PRD.md
│   ├── Design.md
│   ├── System-Architecture.md
│   ├── ER-Diagram.md
│   ├── UML-Class-Diagram.md
│   └── Use-Case-Diagram.md
│
├── tests/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

This structure is a starting point, not a requirement to create every directory immediately. The actual structure should follow the implementation and the chosen API integration approach.

---

## Getting Started

> **Note:** The commands below describe the intended development setup. They will become fully applicable once the project dependencies and configuration files are in place.

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

### 4. Set Up the Database

After configuring PostgreSQL and the database connection, run the project's Prisma migrations.

```bash
npx prisma migrate dev
```

Generate the Prisma Client if it is not generated automatically by the project scripts.

```bash
npx prisma generate
```

### 5. Start the Development Server

```bash
npm run dev
```

Open the local development URL shown in the terminal.

---

## Environment Variables

The application will use environment variables for configuration and secrets.

Example `.env.example`:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/marketsphere"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentication
AUTH_SECRET="replace-with-a-secure-random-secret"

# File Storage
STORAGE_ENDPOINT=""
STORAGE_BUCKET=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
```

This is a proposed example. The final variables will depend on the authentication and storage providers selected during implementation.

**Never commit the actual `.env` file or production secrets to GitHub.**

---

## Development

### Available Scripts

The following scripts are expected to be configured in `package.json`.

| Command                  | Purpose                      |
| ------------------------ | ---------------------------- |
| `npm run dev`            | Start the development server |
| `npm run build`          | Build the application        |
| `npm run start`          | Start the production server  |
| `npm run lint`           | Run code-quality checks      |
| `npm run typecheck`      | Run TypeScript checks        |
| `npm run format`         | Format the codebase          |
| `npm run dev:all`        | Run the web app and API together |
| `npm run db:seed`        | Seed the product categories  |
| `npm run admin:create`   | Create an administrator      |
| `npx prisma migrate dev` | Apply database migrations    |
| `npx prisma generate`    | Generate Prisma Client       |

These commands may change as the project configuration evolves.

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

## Development Roadmap

| Phase | Focus                              | Status       |
| ----- | ---------------------------------- | ------------ |
| 0     | Project setup and tooling          | Done         |
| 1     | Database design and API foundation | Done         |
| 2     | Authentication and role management | Done         |
| 3     | Business profiles and onboarding   | Done         |
| 4     | Product catalog and discovery      | Done         |
| 5     | Order request and confirmation     | Done         |
| 6     | Notifications and communication    | Planned      |
| 7     | Admin dashboard and moderation     | Planned      |
| 8     | Testing and pilot launch           | Planned      |

The roadmap will be updated as features are implemented and validated.

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
* Desktop application using Electron.js

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

Additional documentation will be maintained in the `docs/` directory.

| Document                 | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `PRD.md`                 | Product requirements and MVP scope               |
| `Design.md`              | UI/UX design principles and specifications       |
| `System-Architecture.md` | Application architecture and technical decisions |
| `ER-Diagram.md`          | Database entities and relationships              |
| `UML-Class-Diagram.md`   | Class structure and relationships                |
| `Use-Case-Diagram.md`    | User roles and their interactions                |

---

**MarketSphere — Connecting small businesses with new markets.**

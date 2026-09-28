# MarketSphere

## Product Requirements Document (PRD)

**Document Version:** 1.0
**Status:** Finalized for MVP development
**Product Type:** B2B Marketplace
**Initial Seller Region:** Sonipat, Haryana, India
**Initial Buyer Region:** Delhi-NCR, India
**Initial Product Category:** Home Textiles & Home Furnishings
**Platform:** Web Application
**Proposed Technology:** Next.js, React, TypeScript, Tailwind CSS, Node.js, Express.js

---

# 1. Product Overview

## 1.1 Product Description

MarketSphere is a B2B digital marketplace designed to help micro and small enterprises (MSEs) connect directly with retailers, distributors, and institutional buyers.

The platform will initially focus on home textiles and home furnishings manufactured or supplied by businesses in Sonipat, Haryana, connecting them with buyers across Delhi-NCR.

MarketSphere will provide a centralized platform where sellers can showcase products, manage inquiries, receive order requests, and communicate with potential buyers. Buyers will be able to discover suppliers, compare product offerings, submit order requests, and communicate directly with sellers.

Unlike conventional instant-checkout marketplaces, MarketSphere will use an order-request model. Sellers will review each request and confirm availability, pricing, minimum order quantities, and delivery feasibility before accepting an order.

The long-term vision is to expand MarketSphere into a scalable platform that supports MSEs through digital market access, operational tools, business insights, and capacity-building resources.

## 1.2 Problem Statement

Many micro and small enterprises face difficulties reaching new business customers beyond their existing networks. Their sales often depend on local markets, intermediaries, personal contacts, and offline negotiations.

Common challenges include:

* Limited access to retailers, distributors, and institutional buyers.
* Difficulty showcasing products to buyers outside their immediate locality.
* Fragmented product catalogs and inconsistent product information.
* Time-consuming communication and order coordination.
* Limited visibility into customer demand and market opportunities.
* Difficulty establishing trust with unfamiliar buyers and sellers.
* Operational inefficiencies in managing inquiries, orders, and inventory.

Buyers also face challenges when searching for suppliers. They may need to contact several businesses individually to compare products, pricing, minimum order quantities, and availability.

MarketSphere aims to address these problems by providing a centralized digital platform for discovering suppliers and managing business inquiries and order requests.

## 1.3 Product Vision

To build an accessible and scalable digital marketplace that helps micro and small enterprises expand their market reach, improve business operations, and establish direct relationships with buyers.

## 1.4 Product Mission

To simplify B2B commerce for MSEs by connecting suppliers with relevant buyers through a transparent, user-friendly, and reliable digital platform.

---

# 2. Product Goals and Objectives

## 2.1 Primary Goals

1. **Expand market access:** Help Sonipat-based home textile and furnishing businesses reach buyers across Delhi-NCR.
2. **Simplify product discovery:** Enable buyers to search, filter, and explore products from multiple suppliers.
3. **Streamline business inquiries:** Provide a structured way for buyers to contact sellers and submit order requests.
4. **Improve order coordination:** Help sellers review, accept, reject, or negotiate incoming requests.
5. **Build trust:** Provide verified business profiles and transparent product information.
6. **Support business growth:** Establish a foundation for future analytics, operational tools, and business resources.

## 2.2 MVP Objectives

The initial MVP will focus on validating three fundamental assumptions:

* Sellers are willing to create and maintain digital product catalogs.
* Buyers can discover relevant suppliers and submit genuine business inquiries.
* Sellers and buyers can successfully coordinate orders through the platform.

The MVP should prioritize these core workflows before introducing advanced features such as integrated logistics, payment processing, and AI-powered analytics.

## 2.3 Success Metrics

The MVP will measure performance using the following indicators:

| Category             | Metric                                      | Purpose                              |
| -------------------- | ------------------------------------------- | ------------------------------------ |
| Seller onboarding    | Number of registered sellers                | Measures supplier acquisition        |
| Seller activation    | Sellers with at least one approved product  | Measures catalog adoption            |
| Buyer acquisition    | Number of registered buyers                 | Measures buyer adoption              |
| Product discovery    | Product views and searches                  | Measures marketplace usage           |
| Buyer engagement     | Number of submitted order requests          | Measures purchase intent             |
| Seller engagement    | Percentage of requests receiving a response | Measures seller responsiveness       |
| Order conversion     | Accepted requests divided by total requests | Measures request-to-order conversion |
| Marketplace activity | Number of completed orders                  | Measures actual business activity    |
| Retention            | Repeat buyers and sellers                   | Measures ongoing value               |
| Reliability          | Application error rate and uptime           | Measures technical stability         |

Targets should be established after collecting baseline data from the initial pilot.

---

# 3. Target Market and Launch Scope

## 3.1 Initial Market

MarketSphere will launch with a geographically focused B2B marketplace.

| Dimension                | Initial Scope                                                |
| ------------------------ | ------------------------------------------------------------ |
| Marketplace model        | B2B-first                                                    |
| Initial product category | Home textiles and home furnishings                           |
| Seller region            | Sonipat, Haryana                                             |
| Buyer region             | Delhi-NCR                                                    |
| Buyer locations          | Delhi, Gurugram, Noida, Faridabad, Ghaziabad                 |
| Primary sellers          | Micro and small manufacturers, wholesalers, and suppliers    |
| Primary buyers           | Retailers, distributors, resellers, and institutional buyers |
| Order model              | Buyer request followed by seller confirmation                |
| Initial platform         | Responsive web application                                   |

The initial launch will focus on connecting a defined seller market with a nearby buyer market. Expansion to other categories and regions will be considered after validating the initial marketplace.

## 3.2 Product Category

The initial category will be **Home Textiles & Home Furnishings**.

The platform may support products such as:

* Bedsheets and bedding sets
* Blankets and quilts
* Curtains and window coverings
* Cushion covers and pillow covers
* Towels and bath linen
* Table linen
* Other home textile and furnishing products

The exact product catalog will depend on the participating sellers and the product types validated during onboarding.

## 3.3 Seller Region

The initial seller base will be located in Sonipat, Haryana.

Eligible sellers may include:

* Manufacturers
* Wholesalers
* Small-scale producers
* Distributors and suppliers with relevant products

The initial onboarding process will prioritize businesses operating in the selected category and region.

## 3.4 Buyer Region

The initial target buyers will be businesses located in Delhi-NCR, specifically:

* Delhi
* Gurugram
* Noida
* Faridabad
* Ghaziabad

Target buyer segments include:

**Retailers:** Businesses purchasing products in bulk for resale.

**Distributors:** Businesses purchasing products in larger quantities for distribution to retailers or other businesses.

**Resellers:** Businesses sourcing products from suppliers for resale through physical or online channels.

**Institutional buyers:** Organizations purchasing products for hotels, hostels, offices, hospitals, or other institutional requirements.

The MVP will support these buyer types through a common buyer account, with buyer type recorded during registration.

---

# 4. User Personas and Roles

## 4.1 Seller — MSE Owner or Supplier

**Description:** A business owner or representative who wants to display products and connect with potential buyers.

**Needs:**

* Create a digital business profile.
* Upload and manage product listings.
* Receive inquiries and order requests.
* Review buyer requirements.
* Confirm pricing, stock, quantity, and delivery feasibility.
* Communicate with buyers.
* Track order status.

**Pain Points:**

* Limited access to new business customers.
* Dependence on offline sales channels.
* Difficulty managing multiple inquiries.
* Lack of a centralized product catalog.

## 4.2 Buyer — Retailer, Distributor, or Institutional Buyer

**Description:** A business representative searching for suppliers and products in the home textiles and furnishings category.

**Needs:**

* Discover relevant suppliers.
* Search and filter products.
* View supplier and product details.
* Compare available offerings.
* Submit order requests.
* Discuss price, quantity, and delivery.
* Track request and order status.

**Pain Points:**

* Difficulty finding suitable suppliers.
* Time-consuming supplier discovery.
* Inconsistent product information.
* Uncertainty about availability and minimum order quantities.

## 4.3 Administrator

**Description:** A platform operator responsible for maintaining marketplace quality, reviewing business registrations, and managing reported issues.

**Needs:**

* Review seller registrations.
* Approve, reject, or suspend seller accounts.
* Review and moderate product listings.
* Manage users and reported content.
* Monitor marketplace activity.
* Investigate complaints and suspicious behavior.

**Pain Points:**

* Maintaining trust across the marketplace.
* Preventing misleading product listings.
* Handling disputes and inappropriate activity.
* Monitoring marketplace health.

---

# 5. Product Scope

## 5.1 MVP Features

The MVP will include the following core modules.

| Module              | Features                                        | Priority |
| ------------------- | ----------------------------------------------- | -------- |
| Authentication      | Registration, login, logout, password reset     | P0       |
| Role Management     | Seller, buyer, and admin roles                  | P0       |
| Seller Onboarding   | Business details and verification submission    | P0       |
| Buyer Onboarding    | Buyer profile and business information          | P0       |
| Business Profiles   | Seller and buyer profile management             | P0       |
| Product Catalog     | Create, edit, delete, and view product listings | P0       |
| Product Discovery   | Search, filters, sorting, and product details   | P0       |
| Seller Discovery    | View and search seller profiles                 | P0       |
| Order Requests      | Submit requests and manage request status       | P0       |
| Seller Confirmation | Accept, reject, or propose changes to requests  | P0       |
| Communication       | Basic communication between buyer and seller    | P1       |
| Notifications       | In-app notifications for important actions      | P1       |
| Admin Dashboard     | Manage users, sellers, and listings             | P0       |
| Reporting           | Report suspicious users or listings             | P1       |
| Responsive UI       | Mobile, tablet, and desktop support             | P0       |

P0 features are required for the initial MVP. P1 features should be included if development capacity permits, but they must not delay the core marketplace workflow.

## 5.2 Out of Scope for the MVP

The following features are not required for the first release:

* Integrated payment gateway
* Automated logistics and shipment booking
* Real-time shipment tracking
* AI-powered product recommendations
* Advanced demand forecasting
* Automated inventory synchronization
* Automated quality inspection
* Waste management tools
* Business loans and credit services
* Multi-region and multi-category expansion
* Native Android and iOS applications
* Desktop application distribution through Electron
* Advanced seller analytics
* Automated tax filing or accounting

These features may be considered in future releases after the core marketplace has been validated.

---

# 6. Functional Requirements

## 6.1 Authentication and Account Management

### FR-01: User Registration

The system shall allow users to register as buyers or sellers.

### FR-02: User Login

The system shall allow registered users to log in securely.

### FR-03: Password Recovery

The system shall provide a password-reset mechanism.

### FR-04: Role-Based Access

The system shall provide role-based access for buyers, sellers, and administrators.

### FR-05: Profile Management

Users shall be able to view and update permitted profile information.

### FR-06: Account Status

The system shall support account statuses such as pending, active, suspended, and rejected where applicable.

---

## 6.2 Seller Onboarding

### FR-07: Business Registration

Sellers shall be able to submit business information, including:

* Business name
* Contact person
* Phone number
* Email address
* Business address
* City and state
* Business type
* Product category
* Business description

### FR-08: Verification Submission

Sellers shall be able to submit relevant business verification information and supporting documents.

The system shall allow the administrator to review the submitted information.

### FR-09: Seller Approval

The system shall allow administrators to approve or reject seller registrations.

### FR-10: Seller Dashboard

Approved sellers shall have access to a dashboard showing relevant marketplace activity, including:

* Total listed products
* Pending order requests
* Accepted requests
* Rejected requests
* Recent inquiries

### FR-11: Seller Profile

Sellers shall be able to manage their public business profiles, including business descriptions, contact information, location, and relevant business details.

---

## 6.3 Buyer Onboarding

### FR-12: Buyer Registration

Buyers shall be able to register and provide their business information.

### FR-13: Buyer Type

The system shall allow buyers to identify their business type, such as retailer, distributor, reseller, or institutional buyer.

### FR-14: Buyer Profile

Buyers shall be able to manage their business profiles and contact details.

### FR-15: Buyer Dashboard

Buyers shall have access to a dashboard displaying:

* Recent product activity
* Submitted order requests
* Pending seller responses
* Accepted requests
* Rejected requests
* Relevant notifications

---

## 6.4 Product Catalog Management

### FR-16: Product Creation

Approved sellers shall be able to create product listings.

Each product listing shall support:

* Product name
* Product description
* Category
* Product images
* Available variants, where applicable
* Material or fabric details, where applicable
* Dimensions or size
* Minimum order quantity (MOQ)
* Indicative price or price range, if provided
* Availability status
* Seller information

### FR-17: Product Editing

Sellers shall be able to edit their product information.

### FR-18: Product Removal

Sellers shall be able to deactivate or remove their own product listings, subject to order-history and administrative restrictions.

### FR-19: Product Availability

Sellers shall be able to update product availability.

### FR-20: Product Approval

The system shall support administrator review of product listings before publication.

### FR-21: Product Display

The system shall display approved and active product listings to eligible buyers.

---

## 6.5 Product Discovery

### FR-22: Product Search

Buyers shall be able to search for products using keywords.

### FR-23: Product Filtering

Buyers shall be able to filter products using supported attributes, such as:

* Product category
* Product type
* Material, where available
* Price range, where available
* Seller location
* Availability

### FR-24: Product Sorting

Buyers shall be able to sort search results using supported options, such as product name, price, or recently added listings.

### FR-25: Product Details

Buyers shall be able to view detailed product information, including product images, description, variants, MOQ, indicative pricing, and seller details.

### FR-26: Seller Discovery

Buyers shall be able to browse seller profiles and view their published products.

### FR-27: Product Inquiry

Buyers shall be able to initiate an inquiry about a product or seller.

---

## 6.6 Order Request Management

### FR-28: Submit Order Request

Buyers shall be able to submit an order request for one or more products.

The request shall include:

* Requested products
* Product variants, if applicable
* Requested quantities
* Delivery location
* Buyer contact information
* Additional requirements or notes

The system shall validate required fields before submission.

### FR-29: Request Confirmation

After submission, the system shall create an order request with a unique identifier and a pending status.

The request shall not be treated as a confirmed order until the seller accepts it.

### FR-30: Seller Request Review

Sellers shall be able to review incoming requests and see the requested products, quantities, buyer details, and delivery location.

### FR-31: Accept Request

Sellers shall be able to accept a request after reviewing stock, price, MOQ, and delivery feasibility.

The seller shall be able to provide or confirm the final price and other relevant terms.

### FR-32: Reject Request

Sellers shall be able to reject requests and optionally provide a reason.

### FR-33: Propose Changes

Sellers shall be able to propose changes to a request, including:

* Price
* Quantity
* Product variant
* Delivery terms
* Other relevant order conditions

A request with proposed changes shall require buyer acceptance before becoming a confirmed order.

### FR-34: Buyer Response

Buyers shall be able to accept or decline seller-proposed changes.

### FR-35: Order Status

The system shall maintain request and order statuses, including:

* Pending seller response
* Seller proposed changes
* Awaiting buyer response
* Accepted
* Rejected
* Cancelled
* Completed

The system shall distinguish a pending request from an accepted order.

### FR-36: Request History

Buyers and sellers shall be able to view the history of their requests and the latest status.

### FR-37: Order Cancellation

The system shall allow cancellation of eligible requests or orders according to defined business rules.

---

## 6.7 Communication and Notifications

### FR-38: Buyer-Seller Communication

The system shall provide a basic communication mechanism for buyers and sellers to clarify product and order requirements.

### FR-39: In-App Notifications

The system shall notify users about relevant events, including:

* New order requests
* Seller responses
* Proposed changes
* Buyer acceptance or rejection
* Order cancellation
* Account approval or rejection

### FR-40: Notification History

Users shall be able to view their recent notifications.

---

## 6.8 Admin Management

### FR-41: Admin Dashboard

Administrators shall have access to an overview of marketplace activity.

### FR-42: Seller Management

Administrators shall be able to review, approve, reject, suspend, or reactivate seller accounts.

### FR-43: Buyer Management

Administrators shall be able to review and manage buyer accounts when necessary.

### FR-44: Product Moderation

Administrators shall be able to review, approve, reject, or deactivate product listings.

### FR-45: Report Management

Administrators shall be able to review user-submitted reports and record their resolution.

### FR-46: Audit History

The system shall record important administrative actions for accountability.

---

# 7. Core User Workflows

## 7.1 Seller Workflow

1. The seller registers on MarketSphere.
2. The seller submits business information and verification details.
3. The administrator reviews the registration.
4. Once approved, the seller gains access to the seller dashboard.
5. The seller creates product listings with images, descriptions, MOQ, and available pricing information.
6. The administrator reviews listings if moderation is enabled for publication.
7. Approved products become visible to buyers.
8. Buyers discover products and submit order requests.
9. The seller receives a notification about the request.
10. The seller reviews the request and checks stock, pricing, quantity, and delivery feasibility.
11. The seller accepts, rejects, or proposes changes.
12. If changes are proposed, the buyer reviews and responds.
13. Once both parties agree, the request becomes an accepted order.
14. The seller and buyer coordinate fulfillment and mark the order completed when appropriate.

## 7.2 Buyer Workflow

1. The buyer registers on MarketSphere.
2. The buyer provides business details and selects a buyer type.
3. The buyer browses the marketplace.
4. The buyer searches or filters products by relevant attributes.
5. The buyer opens product details and reviews seller information.
6. The buyer submits an inquiry or order request.
7. The buyer waits for the seller's response.
8. If the seller proposes changes, the buyer reviews them.
9. The buyer accepts or declines the proposed terms.
10. If the request is accepted, the buyer coordinates fulfillment with the seller.
11. The buyer can review the request and order history.

## 7.3 Administrator Workflow

1. The administrator logs into the admin dashboard.
2. The administrator reviews pending seller registrations.
3. The administrator verifies submitted business information.
4. The administrator approves or rejects the registration.
5. The administrator reviews product listings when required.
6. The administrator handles reported users or products.
7. The administrator monitors marketplace activity.
8. The administrator records relevant actions and resolutions.

---

# 8. Business Rules

### BR-01: Role Separation

The system shall distinguish buyer, seller, and administrator permissions.

### BR-02: Seller Approval

Only approved and active sellers shall be allowed to publish products.

### BR-03: Product Visibility

Only active and approved products shall be visible in normal buyer search results.

### BR-04: Order Request Model

Submitting a request shall not automatically create a confirmed order or trigger a payment.

### BR-05: Seller Confirmation

An order shall be considered accepted only after the seller confirms the request or the buyer accepts the seller's proposed changes.

### BR-06: Price Validation

The system shall not treat indicative product prices as final negotiated prices. Final terms must be recorded when the seller accepts the request.

### BR-07: Minimum Order Quantity

The system shall display the seller's stated MOQ and validate requested quantities where an MOQ is specified.

### BR-08: Order Snapshot

The system shall preserve the product name, relevant product details, requested quantity, and agreed terms associated with an order at the time of acceptance. Later product edits shall not silently modify historical orders.

### BR-09: Inventory

The system shall not assume that listed availability guarantees stock. Sellers must confirm availability before accepting a request.

### BR-10: Order Status

Only permitted status transitions shall be allowed. For example, a rejected request shall not become an accepted order without a new request or an explicitly supported reopening process.

### BR-11: Server-Side Validation

All important business rules, permissions, quantities, and order terms shall be validated on the server.

### BR-12: Communication

Communication and order history shall be associated with the relevant users and request or order.

### BR-13: Geographic Scope

During the initial pilot, seller onboarding shall focus on Sonipat and buyer acquisition shall focus on the defined Delhi-NCR locations.

### BR-14: No Integrated Payments in MVP

The MVP shall not represent a request as paid or settled through MarketSphere. Any payment arrangement between parties will be outside the platform unless a later release introduces payment functionality.

---

# 9. Non-Functional Requirements

## 9.1 Performance

* Common pages should load efficiently on typical mobile and desktop connections.
* Product search and filtering should provide results without unnecessary delays.
* The system should paginate large product and order lists.
* Images should be optimized to reduce bandwidth consumption.

## 9.2 Security

* Passwords must be stored using secure password hashing.
* Authentication and authorization must be enforced on the server.
* Role-based access control must prevent unauthorized data access.
* Sensitive business and user information must be protected.
* Inputs must be validated and sanitized appropriately.
* The application must protect against common web vulnerabilities, including injection and cross-site scripting.
* Administrative actions should be logged.
* Authentication secrets and API credentials must not be exposed to the client.

## 9.3 Reliability

* The application should handle expected errors gracefully.
* Failed requests should return clear and appropriate error messages.
* Important order changes should be persisted reliably.
* The system should prevent accidental duplicate submissions where practical.
* Database backups and recovery procedures should be established before production deployment.

## 9.4 Scalability

The system architecture should allow future expansion in:

* Number of sellers and buyers
* Product catalog size
* Number of order requests
* Supported product categories
* Geographic regions
* Additional services and integrations

## 9.5 Usability

* The interface should be simple and understandable for users with varying levels of digital literacy.
* Primary workflows should require minimal unnecessary steps.
* Forms should include clear labels, validation, and helpful error messages.
* The application should be responsive across mobile, tablet, and desktop devices.
* Important actions and statuses should be visually distinguishable.

## 9.6 Accessibility

* Forms and navigation should support keyboard use.
* Text and interactive elements should have adequate contrast.
* Images should support alternative text where appropriate.
* Interface components should follow established accessibility practices.

## 9.7 Maintainability

* The application should use a modular architecture.
* Business logic should be separated from UI components.
* Shared components should be reusable.
* The codebase should use consistent naming and formatting conventions.
* Critical workflows should have automated tests.

---

# 10. Technical Requirements

## 10.1 Proposed Technology Stack

| Layer              | Technology                                   | Purpose                                   |
| ------------------ | -------------------------------------------- | ----------------------------------------- |
| Frontend Framework | Next.js                                      | Web application and routing               |
| UI Library         | React.js                                     | Component-based interface                 |
| Language           | TypeScript                                   | Type safety and maintainability           |
| Styling            | Tailwind CSS                                 | Responsive interface styling              |
| Backend            | Node.js                                      | Server-side runtime                       |
| API Framework      | Express.js                                   | Backend API and business logic            |
| Database           | PostgreSQL                                   | Persistent relational data                |
| ORM                | Prisma                                       | Database access and schema management     |
| Authentication     | Secure session or token-based authentication | User authentication                       |
| File Storage       | Object storage                               | Product images and verification documents |
| Design             | Figma                                        | UI/UX design and prototyping              |
| Version Control    | Git and GitHub                               | Source control and collaboration          |
| Deployment         | Compatible cloud hosting                     | Application hosting                       |

The backend should be integrated into the Next.js application architecture where practical, avoiding unnecessary duplicate compilation or deployment of the same backend code.

The final deployment approach should be selected based on hosting constraints, background processing needs, and expected traffic.

## 10.2 Architecture Overview

The application will consist of the following logical components:

**Frontend**

* Authentication pages
* Buyer dashboard
* Seller dashboard
* Admin dashboard
* Product catalog and discovery
* Order request interfaces
* Notifications and communication interfaces

**Backend**

* Authentication and authorization
* User and business profile management
* Product catalog management
* Search and filtering
* Order request processing
* Notification management
* Administrative moderation

**Database**

* Users
* Business profiles
* Products
* Product images and variants
* Order requests
* Order items
* Order status history
* Notifications
* Reports
* Audit logs

**File Storage**

* Product images
* Business verification documents
* Other permitted uploads

## 10.3 Data Management

The database should maintain clear relationships between users, businesses, products, requests, and orders.

Important requirements include:

* Each seller account should be associated with a business profile.
* Each product should be associated with a seller.
* Each order request should be associated with a buyer and a seller.
* Each order request should contain one or more requested items where applicable.
* Accepted orders should preserve the agreed terms.
* Order status changes should be recorded.
* Administrative actions should be auditable.

The database schema and detailed entity relationships will be documented separately in the system design and ER diagram.

---

# 11. UI/UX Requirements

## 11.1 Design Principles

The MarketSphere interface should prioritize:

* Clarity over visual complexity
* Simple navigation
* Consistent components
* Clear calls to action
* Responsive layouts
* Readable typography
* Fast product discovery
* Transparent order statuses
* Trustworthy business presentation

The interface should avoid unnecessary visual effects and decorative elements that distract from product discovery and order management.

## 11.2 Main Screens

### Public Screens

* Landing page
* Product listing page
* Product detail page
* Seller profile page
* Login page
* Registration page

### Buyer Screens

* Buyer dashboard
* Product search and discovery
* Product detail and inquiry
* Order request form
* Order request history
* Order request details
* Notifications
* Buyer profile and settings

### Seller Screens

* Seller dashboard
* Business profile management
* Product catalog management
* Add and edit product
* Incoming order requests
* Order request details
* Buyer communication
* Notifications
* Seller settings

### Admin Screens

* Admin dashboard
* Seller verification queue
* Seller details and review
* Product moderation queue
* User management
* Reports and complaints
* Audit history

## 11.3 Navigation

Navigation should be role-aware.

Buyers should have direct access to product discovery, their requests, notifications, and profile settings.

Sellers should have direct access to their products, incoming requests, business profile, notifications, and settings.

Administrators should have access to user management, seller verification, product moderation, reports, and marketplace monitoring.

---

# 12. MVP Acceptance Criteria

The MVP will be considered ready for pilot testing when the following conditions are met.

## Authentication and Roles

* Buyers and sellers can register and log in.
* Users can access only the features permitted for their roles.
* Users can manage their basic profile information.

## Seller Onboarding

* Sellers can submit business information.
* Administrators can review and approve or reject registrations.
* Approved sellers can access seller features.

## Product Catalog

* Approved sellers can create and manage product listings.
* Product listings support the required details and images.
* Buyers can view active and approved products.

## Product Discovery

* Buyers can search for products.
* Buyers can filter and sort results using supported fields.
* Buyers can view product and seller details.

## Order Requests

* Buyers can submit order requests with required information.
* Sellers can view incoming requests.
* Sellers can accept, reject, or propose changes.
* Buyers can accept or decline proposed changes.
* The system records status changes and preserves agreed terms.
* The system does not incorrectly mark pending requests as accepted orders.

## Administration

* Administrators can manage seller registrations and product listings.
* Administrators can review reports.
* Important administrative actions are recorded.

## Technical Quality

* Core workflows work on supported desktop and mobile browsers.
* Server-side validation is implemented for critical operations.
* The application handles common errors gracefully.
* Critical user journeys have been tested.
* No known critical security issues remain at release.

---

# 13. Risks and Mitigation

| Risk                              | Potential Impact                        | Mitigation                                                         |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Insufficient seller participation | Limited product selection               | Conduct seller outreach and onboard an initial group before launch |
| Insufficient buyer participation  | Low order-request volume                | Interview target buyers and validate demand before broad release   |
| Incomplete product information    | Poor discovery and buyer confidence     | Use structured listing forms and required fields                   |
| Inaccurate availability           | Failed or delayed orders                | Require seller confirmation before acceptance                      |
| Unclear pricing                   | Buyer-seller misunderstandings          | Support indicative pricing and explicit final-term confirmation    |
| Low seller responsiveness         | Unresolved buyer requests               | Provide notifications and track response rates                     |
| Trust and verification issues     | Fraud or poor marketplace experience    | Review business information and provide reporting tools            |
| Logistics complexity              | Difficult fulfillment coordination      | Keep fulfillment coordination manual in the MVP                    |
| Scope expansion                   | Delayed development                     | Prioritize core marketplace workflows and defer advanced features  |
| Poor usability                    | Low adoption                            | Test prototypes and workflows with representative users            |
| Data security incidents           | Loss of trust and sensitive information | Apply access controls, secure storage, and security testing        |

---

# 14. Assumptions and Open Questions

The following assumptions are used for this PRD and should be validated during product discovery and pilot testing.

## 14.1 Assumptions

1. Sonipat has an adequate initial pool of relevant home textile and furnishing sellers willing to participate.
2. Delhi-NCR contains relevant retailers, distributors, resellers, and institutional buyers who may benefit from discovering these suppliers.
3. Sellers are willing to manage product listings digitally.
4. Buyers are willing to submit structured order requests before final commercial terms are agreed.
5. Sellers and buyers can initially coordinate delivery and payment outside the platform.
6. A focused geographic and category scope will make the first marketplace easier to operate and evaluate.

## 14.2 Open Questions

* What seller verification documents will be mandatory?
* Will buyers also require verification before submitting requests?
* Will seller phone numbers and email addresses be publicly visible?
* Should buyers be able to request products from multiple sellers in one submission?
* Should the MVP support messaging, or will structured inquiries be sufficient initially?
* How will sellers specify MOQ for products with multiple variants?
* Should product prices be displayed as fixed prices, indicative prices, or price ranges?
* What cancellation rules should apply after a seller accepts a request?
* Who will be responsible for resolving disputes during the pilot?
* How will completed orders be confirmed by both parties?
* What criteria will determine expansion beyond the initial category and region?

These questions should be resolved before the relevant features are finalized for production.

---

# 15. Future Scope

After validating the initial marketplace, MarketSphere may expand into the following areas.

## 15.1 Payments and Financial Services

* Integrated payment gateway
* Digital invoices
* Payment status tracking
* Transaction records
* Future financial-service integrations, subject to feasibility and compliance

## 15.2 Logistics and Fulfillment

* Logistics partner integrations
* Shipment booking
* Delivery status tracking
* Estimated delivery information
* Fulfillment coordination tools

## 15.3 Business Analytics

* Sales and order dashboards
* Product performance insights
* Buyer demand trends
* Repeat-customer insights
* Seller performance metrics

## 15.4 Quality Improvement

* Product quality information
* Seller quality-management resources
* Product feedback and issue reporting
* Quality improvement guidance

## 15.5 Waste and Cost Management

* Waste tracking tools
* Material utilization insights
* Cost estimation
* Operational efficiency resources
* Recommendations for reducing avoidable waste

## 15.6 Capacity Building

* Business learning resources
* Digital literacy guides
* Product photography guidance
* Pricing and catalog management resources
* Market access and business development content

## 15.7 Platform Expansion

* Additional product categories
* Additional seller regions
* Additional buyer markets
* Multilingual support
* Mobile applications
* Desktop application using Electron.js, if justified by user needs

These are future opportunities, not commitments for the initial MVP.

---

# 16. Development Priorities

Development should proceed in the following sequence.

| Phase   | Focus               | Key Deliverables                                                           |
| ------- | ------------------- | -------------------------------------------------------------------------- |
| Phase 1 | Foundation          | Repository, project setup, database, authentication, roles                 |
| Phase 2 | Business onboarding | Seller registration, buyer registration, profile management, admin review  |
| Phase 3 | Product catalog     | Product creation, editing, images, moderation                              |
| Phase 4 | Product discovery   | Search, filtering, sorting, product details, seller profiles               |
| Phase 5 | Order requests      | Request submission, seller review, acceptance, rejection, proposed changes |
| Phase 6 | Communication       | Basic buyer-seller communication and notifications                         |
| Phase 7 | Administration      | User management, moderation, reports, audit history                        |
| Phase 8 | Testing and pilot   | End-to-end testing, usability testing, security review, initial rollout    |

The exact timeline will depend on team size, development capacity, and the outcomes of user validation.

---

# 17. Product Launch and Validation

## 17.1 Pilot Preparation

Before opening the marketplace to a wider audience, the team should:

1. Interview a representative sample of Sonipat-based sellers.
2. Interview retailers, distributors, and institutional buyers in Delhi-NCR.
3. Validate the product attributes and catalog structure.
4. Test the order-request workflow with real business scenarios.
5. Onboard an initial set of sellers and products.
6. Test the platform with a limited group of buyers.
7. Collect feedback on usability, trust, product discovery, and order coordination.

## 17.2 Pilot Evaluation

The pilot should evaluate:

* Whether sellers can complete onboarding without extensive assistance.
* Whether sellers can create accurate and useful product listings.
* Whether buyers can discover relevant products.
* Whether buyers understand the difference between a request and a confirmed order.
* Whether sellers respond to requests in a reasonable period.
* Whether both parties can agree on commercial terms.
* Whether the platform generates genuine business interactions.

The pilot should produce evidence for deciding which features to improve, which assumptions to revise, and whether the marketplace is ready to expand.

---

# 18. Dependencies

The successful implementation of MarketSphere depends on:

* Participation from sellers in the initial region.
* Access to relevant product information and images.
* Buyer participation during validation and pilot testing.
* A suitable database and hosting environment.
* Secure storage for product images and verification documents.
* A defined seller verification process.
* Clear policies for product moderation and user reports.
* Testing with representative devices and network conditions.

---

# 19. Definition of MVP Completion

The MVP will be considered complete when a buyer can register, discover a relevant product from an approved Sonipat-based seller, and submit an order request from within the Delhi-NCR target market.

The seller must be able to review the request and accept it, reject it, or propose changes. The buyer must be able to respond to those proposed changes. The system must preserve the resulting status and agreed terms.

The platform must also provide the essential administrative capabilities required to manage seller onboarding and product listings.

The MVP is intended to validate the marketplace's core value proposition. It is not intended to provide a complete e-commerce, logistics, payment, or business-management solution at launch.

---

# 20. Conclusion

MarketSphere will begin as a focused B2B marketplace connecting home textile and home furnishing sellers in Sonipat with business buyers across Delhi-NCR.

The first release will prioritize seller onboarding, product catalog management, product discovery, structured order requests, seller confirmation, and essential administration.

The request-based order model reflects the need for buyers and sellers to agree on price, quantity, availability, and delivery before confirming a transaction.

The initial geographic and category focus will allow the product team to validate marketplace participation and transaction workflows before investing in broader expansion.

**PRD Status:** Finalized for MVP planning and development. Product assumptions and open questions should be validated during implementation and pilot testing.

# MarketSphere --- Design System & UI Implementation Guide

**Document:** `Design.md`\
**Version:** 1.0\
**Status:** Design specification for implementation\
**Product:** B2B marketplace for home textiles and home furnishings\
**Initial market:** Sonipat, Haryana sellers; Delhi-NCR buyers\
**Frontend:** Next.js, React, TypeScript, Tailwind CSS\
**Future desktop target:** Electron for macOS (`.dmg`)

------------------------------------------------------------------------

## 1. Purpose

This document defines the visual system, interaction patterns, layout
rules, reusable components, and implementation guidance for
MarketSphere. It is intended to be used directly by a coding agent
implementing the interface.

The design should feel like a focused business tool: clear, dependable,
efficient, and comfortable for frequent use. It should not resemble a
generic consumer shopping template or rely on decorative gradients and
excessive animation.

### Product design priorities

1.  Make product discovery and order-request workflows obvious.
2.  Make seller operations efficient, especially catalog and request
    management.
3.  Communicate trust and business status clearly without making
    unsupported verification claims.
4.  Work well on mobile, tablet, and desktop.
5.  Keep web and future Electron experiences visually and behaviorally
    consistent.
6.  Use reusable design tokens and components rather than one-off
    styling.

## 2. Brand and Visual Direction

**Visual direction:** restrained dark interface, practical marketplace,
crisp information hierarchy, blue accent for primary actions.

Use the supplied colors as the foundation. The three background colors
have distinct roles: - `#1B1C1E`: app canvas and main page background. -
`#333333`: elevated surfaces such as cards, panels, menus, and input
backgrounds where needed. - `#9598A0`: muted text, secondary labels,
icons, and subdued UI details. Do not use this color for small text on
`#1B1C1E` without checking contrast.

**Stroke:** `#242528` for subtle borders and separators. Because it is
close to the main background, use it for low-emphasis boundaries only;
use spacing and surface changes to establish hierarchy.

**Primary:** `#67A6EA` for primary actions, active navigation, links,
focus indicators, and selected states. Do not use it as a large
decorative background.

Avoid: - Purple or multicolor gradients. - Glassmorphism and heavy
blur. - Excessive rounded cards or pill-shaped controls everywhere. -
Decorative charts or fake metrics. - Unnecessary animation, floating
elements, and oversized hero sections inside authenticated workflows. -
Emoji as interface icons.

## 3. Design Tokens

Use CSS variables as the source of truth. Tailwind utilities should
reference these tokens rather than repeating raw hex values throughout
components.

``` css
:root {
  color-scheme: dark;

  --color-bg: #1B1C1E;
  --color-surface: #333333;
  --color-text-muted: #9598A0;
  --color-border: #242528;
  --color-primary: #67A6EA;

  /* Semantic colors: use restrained, accessible values and verify contrast. */
  --color-text: #F3F4F6;
  --color-text-secondary: #C5C7CC;
  --color-success: #4FB477;
  --color-warning: #E7B45B;
  --color-danger: #E36B6B;
  --color-info: #67A6EA;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  --shadow-panel: 0 8px 24px rgba(0, 0, 0, 0.18);
}
```

Semantic colors above are implementation defaults, not additions to the
supplied brand palette. Keep their usage limited to status communication
and verify accessibility before release.

### Token usage

  ----------------------------------------------------------------------------
  Token                   Value                   Use
  ----------------------- ----------------------- ----------------------------
  Background              `#1B1C1E`               App canvas, page background

  Surface                 `#333333`               Cards, dialogs, popovers,
                                                  form controls where
                                                  appropriate

  Muted                   `#9598A0`               Secondary text, metadata,
                                                  inactive icons

  Border                  `#242528`               Dividers and subtle outlines

  Primary                 `#67A6EA`               Main action, links, active
                                                  and focus states

  Main text               `#F3F4F6`               Primary text

  Secondary text          `#C5C7CC`               Supporting text

  Success                 `#4FB477`               Accepted/completed states

  Warning                 `#E7B45B`               Pending/awaiting states

  Danger                  `#E36B6B`               Rejected/destructive/error
                                                  states
  ----------------------------------------------------------------------------

Do not rely on color alone to communicate status. Pair status color with
text and, where useful, an icon.

## 4. Typography

### Font families

Use the requested font stack with explicit roles:

``` css
:root {
  --font-heading: "Varela Round", "Varela", Verdana, sans-serif;
  --font-body: "Varela", Verdana, sans-serif;
  --font-mono: "Space Mono", monospace;
}
```

-   **Varela Round:** page titles, section headings, and prominent short
    labels.
-   **Varela:** body copy, form labels, navigation, buttons, and product
    details.
-   **Verdana:** fallback for Varela where unavailable.
-   **Space Mono:** IDs, SKU/reference codes, technical values, and
    compact tabular metadata only. Avoid using it for paragraphs.

Load font files through a reliable, self-hosted or approved font-loading
approach. If the font cannot load, the fallback must remain readable and
layout should not break.

### Type scale

  Style          Desktop size   Mobile size Weight                Line height
  ------------ -------------- ------------- ------------------- -------------
  Display               32 px         28 px 400                           1.2
  H1                    28 px         24 px 400                          1.25
  H2                    22 px         20 px 400                           1.3
  H3                    18 px         18 px 400                          1.35
  Body                  14 px         14 px 400                           1.5
  Body small            12 px         12 px 400                          1.45
  Button                14 px         14 px 400/700 as needed             1.2
  Metadata              12 px         12 px 400                           1.4

Use a clear hierarchy rather than making every heading large or bold.
Keep long-form body text comfortably readable and avoid low-contrast
text.

## 5. Layout and Responsive Behavior

### Application shell

Authenticated pages should use a consistent shell: - Desktop: left
navigation/sidebar, top header, main content area. - Tablet: collapsible
or compact sidebar. - Mobile: compact top bar and accessible navigation
pattern, such as a drawer or bottom navigation when it suits the
workflow. - Keep primary actions visible without forcing horizontal
scrolling.

Suggested desktop layout: - Sidebar: 232--256 px. - Header: 60--68 px. -
Main content: fluid, with a comfortable maximum width for form-heavy
pages. - Page horizontal padding: 24--32 px desktop; 16 px mobile. - Use
a 12-column grid only where it improves alignment; do not force every
screen into a complex grid.

### Breakpoints

Use the project's Tailwind breakpoints unless implementation requires
otherwise: - Small: below 640 px - Medium: 640--1023 px - Large:
1024--1279 px - Extra large: 1280 px and above

### Responsive rules

-   Product cards should reflow from multi-column grids to two columns
    and then one column as space decreases.
-   Data tables should become stacked cards or use a deliberate
    horizontal-scroll container on small screens.
-   Forms should be single-column on mobile and may use two columns on
    wide screens for logically paired fields.
-   Dialogs should fit within the viewport and become near-full-screen
    sheets on narrow devices when appropriate.
-   Avoid fixed widths that cause overflow.
-   Preserve touch targets of at least 44 × 44 px where practical.

## 6. Navigation and Information Architecture

### Public navigation

-   Home
-   Explore products
-   Suppliers
-   Login
-   Register

### Buyer navigation

-   Overview
-   Discover products
-   Order requests
-   Notifications
-   Business profile
-   Settings

### Seller navigation

-   Overview
-   Products
-   Order requests
-   Business profile
-   Notifications
-   Settings

### Admin navigation

-   Overview
-   Seller verification
-   Product moderation
-   Users
-   Reports
-   Audit history

Navigation must be role-aware. Do not show actions that the current user
is not authorized to perform. The active destination should be visually
clear using the primary color and a non-color cue such as a background
or indicator.

## 7. Core Screen Specifications

### 7.1 Landing page

Purpose: explain the marketplace and direct the right user to register
or explore.

Include: - A concise value proposition focused on connecting suppliers
and business buyers. - Primary actions: "Explore products" and "Join as
a seller" (adapt labels to actual routes). - A short explanation of the
order-request model. - A restrained category introduction for home
textiles and furnishings. - No fabricated seller counts, order volumes,
testimonials, or performance claims.

Keep the page concise. Avoid a large marketing site structure before the
marketplace workflows are functional.

### 7.2 Authentication

Include: - Email/phone field as supported by the authentication
implementation. - Password field with show/hide control if applicable. -
Clear validation and error messages. - Registration role selection for
buyer or seller. - Password recovery entry point. - Loading and disabled
states.

Do not expose whether an arbitrary email belongs to an account in a way
that enables account enumeration.

### 7.3 Buyer dashboard

Prioritize actionable information: - Pending seller responses. -
Requests awaiting buyer response. - Recently viewed or relevant
products, if tracking is implemented. - Quick links to product discovery
and request history.

Do not show empty decorative charts. For a new account, use a helpful
empty state with a clear next action.

### 7.4 Product discovery

Include: - Search input with a clear label and empty/loading states. -
Filters for supported product attributes, such as category, material,
price, availability, and seller location. - Sort control. - Product
cards with image, product name, seller, MOQ, and indicative price when
available. - Clear indication when price is unavailable or negotiable. -
Pagination or incremental loading.

Filters must reflect real data fields. Do not display nonfunctional
filters.

### 7.5 Product card

A product card should show: - Product image with consistent aspect
ratio. - Product name, with truncation only when necessary. -
Seller/business name. - MOQ where supplied. - Indicative price or
"Contact seller" where no price is provided. - Availability state where
known. - A clear action to view details or inquire.

Use a restrained border and surface contrast. Do not make the entire
card look like a large button if it contains multiple actions.

### 7.6 Product detail

Include: - Image gallery. - Product name and seller identity. -
Description and structured attributes. - Variants, where available. -
MOQ. - Indicative pricing or a clear note that price is confirmed by the
seller. - Availability as seller-provided information, not a
guarantee. - Primary action: "Request order" or "Contact seller".

Do not imply that clicking the primary action charges the buyer.

### 7.7 Seller profile

Include: - Business name and description. - Location. - Business type. -
Verification state, only when supported by the backend. - Product
listings. - Contact or inquiry action, subject to privacy settings.

Avoid presenting verification as a quality guarantee.

### 7.8 Seller dashboard

Prioritize: - New requests requiring attention. - Requests awaiting
buyer response. - Product listing status. - Quick action to add a
product. - Recent activity.

Metrics should be derived from real system data. If there is no data,
show an empty state instead of fabricated values.

### 7.9 Product management

Product form fields should be grouped: 1. Basic information: name,
category, description. 2. Product details: material, dimensions,
variants. 3. Commercial details: MOQ, indicative price. 4. Images. 5.
Availability and publication status.

Use inline validation and preserve entered form data when a recoverable
error occurs. Clearly distinguish saving a draft from submitting a
listing for review.

### 7.10 Order request form

Include: - Selected product and variant. - Quantity and MOQ guidance. -
Delivery location. - Buyer notes or requirements. - Review of request
details before submission.

Show a clear notice that this is a request, not a confirmed purchase. Do
not request payment information in the MVP.

### 7.11 Order request details

Display: - Request ID. - Buyer and seller identities, subject to access
permissions. - Requested items and quantities. - Requested and agreed
commercial terms, clearly distinguished. - Delivery information. -
Current status. - Status history. - Available actions for the current
user's role.

The available actions must be determined by the backend state and
authorization rules, not just by hiding buttons in the UI.

### 7.12 Admin dashboard

Include: - Pending seller verifications. - Product listings awaiting
moderation. - Open reports. - Recent administrative activity.

Provide confirmation for consequential actions such as rejection,
suspension, or deletion. Record administrative actions in the backend
audit log.

## 8. Component System

Build reusable components before duplicating patterns across pages.

### Core components

-   `AppShell`
-   `Sidebar`
-   `Topbar`
-   `MobileNavigation`
-   `PageHeader`
-   `Button`
-   `IconButton`
-   `Input`
-   `Textarea`
-   `Select`
-   `Checkbox`
-   `RadioGroup`
-   `SearchInput`
-   `FilterBar`
-   `ProductCard`
-   `ProductGallery`
-   `StatusBadge`
-   `DataTable`
-   `Pagination`
-   `EmptyState`
-   `LoadingState`
-   `ErrorState`
-   `Modal`
-   `ConfirmDialog`
-   `Toast`
-   `NotificationItem`
-   `OrderRequestSummary`
-   `OrderTimeline`

Prefer semantic HTML and accessible primitives. Use a consistent icon
library rather than emoji or hand-drawn Unicode symbols.

### Buttons

Define at least: - Primary: blue fill, dark readable text if contrast is
sufficient; otherwise use a suitable foreground determined by contrast
testing. - Secondary: surface fill with border. - Tertiary/ghost:
transparent with clear hover and focus states. - Destructive: semantic
danger styling and confirmation for irreversible actions. - Disabled:
visibly disabled and non-interactive.

Do not use the primary style for every button on a page. A page should
generally have one visually dominant action.

### Inputs

Inputs should have: - Persistent labels (not placeholder-only labels). -
Visible focus state. - Clear error state and associated message. -
Adequate height and spacing. - Keyboard and screen-reader support.

### Status badges

Use text labels alongside color: - Pending seller response - Seller
proposed changes - Awaiting buyer response - Accepted - Rejected -
Cancelled - Completed

Do not rely on color alone. Ensure the status names match backend enums
and user-facing copy is consistent.

## 9. Interaction and State Design

Every data-driven screen should define: - Initial/loading state -
Success state - Empty state - Error state - Permission-denied state
where relevant

Interactions should be predictable: - Use clear feedback after
successful saves and submissions. - Prevent accidental duplicate
submissions while a request is processing. - Preserve form data after
recoverable failures. - Ask for confirmation before destructive
actions. - Use optimistic updates only when rollback behavior is
defined. - Do not make an order appear accepted before the server
confirms it.

Motion should be subtle and purposeful. Respect
`prefers-reduced-motion`. Avoid animation that delays navigation or
blocks a business task.

## 10. Accessibility

-   Maintain sufficient text and control contrast against the dark
    surfaces.
-   Do not use `#9598A0` for small text without checking contrast
    against its actual background.
-   Provide visible keyboard focus.
-   Use semantic headings and landmarks.
-   Associate form labels and error messages with their controls.
-   Provide alt text for meaningful product images; decorative images
    should have empty alt text.
-   Ensure dialogs manage focus and can be dismissed appropriately.
-   Ensure status is communicated in text, not color alone.
-   Support keyboard navigation for menus, dialogs, and forms.
-   Test at browser zoom and on narrow viewports.

Accessibility should be verified in implementation; do not assume a
color combination is compliant simply because it looks readable.

## 11. Web and Electron Requirements

MarketSphere will eventually be distributed as a macOS desktop
application packaged as a `.dmg`.

The Electron app should reuse the same design system and, where
practical, the same Next.js renderer/UI code.

### Requirements

-   Keep visual tokens and components shared between web and Electron.
-   Avoid hard-coding browser-only assumptions into shared components.
-   Use responsive layouts that also work in a resizable desktop window.
-   Ensure external links open safely in the system browser when
    appropriate.
-   Handle desktop window resizing and minimum usable dimensions.
-   Do not expose Node.js APIs directly to the renderer.
-   Use Electron context isolation and a restricted preload bridge.
-   Keep secrets and privileged operations out of renderer code.
-   Use the same backend authorization rules as the web application.

### Desktop-specific behavior

-   Support standard keyboard shortcuts only where they improve
    productivity and do not conflict with browser conventions.
-   Ensure dialogs and menus remain within the desktop window.
-   Make long tables and forms usable in resizable windows.
-   Provide appropriate application metadata and macOS packaging
    configuration during the desktop release phase.

The Electron app is a client for the same marketplace, not a separate
backend or database.

## 12. Tailwind and CSS Implementation

-   Define the palette and typography in centralized theme tokens.
-   Use semantic token names such as `bg-background`, `bg-surface`,
    `text-primary`, `text-muted`, and `border-subtle`.
-   Avoid repeating raw hex values across components.
-   Prefer component variants for buttons, badges, and inputs.
-   Keep responsive behavior explicit and consistent.
-   Use CSS variables where tokens need to be shared with Electron or
    non-Tailwind styles.

Example conceptual token mapping (adapt to the installed Tailwind
version):

``` css
@theme inline {
  --color-background: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-muted: var(--color-text-muted);
  --color-border: var(--color-border);
  --color-primary: var(--color-primary);
  --font-sans: var(--font-body);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);
}
```

Avoid defining a token in a way that recursively references itself. If
using Tailwind theme variables, give the underlying CSS variables
distinct names (for example, `--ms-bg` and `--color-background`).

## 13. Content and Microcopy

Use concise, direct language appropriate for business users.

Prefer: - "Request order" - "Pending seller response" - "Confirm
terms" - "Propose changes" - "Minimum order quantity" - "Indicative
price" - "Availability provided by seller"

Avoid: - "Buy now" when no instant purchase/payment exists. -
"Guaranteed delivery" unless a real guarantee is implemented. -
"Verified quality" when only business identity has been reviewed. -
Vague error messages such as "Something went wrong" without a recovery
path.

## 14. Design Acceptance Checklist

A screen is ready for review when:

-   It uses the shared color and typography tokens.
-   It follows the role-specific navigation.
-   It has loading, empty, error, and success states where applicable.
-   Primary and secondary actions are visually distinguishable.
-   Forms have labels, validation, and accessible focus states.
-   Statuses match the actual backend state.
-   It works on mobile, tablet, and desktop.
-   It does not rely on color alone to convey information.
-   It does not include fake data or unsupported claims.
-   It does not imply payment or order confirmation when only a request
    exists.
-   Shared components behave consistently in web and Electron contexts.

## 15. Implementation Notes for the Coding Agent

1.  Treat this document as the visual and interaction source of truth.
2.  Build design tokens and foundational components before implementing
    all screens.
3.  Use the specified font families in the listed hierarchy, with
    fallbacks.
4.  Keep the supplied brand colors unchanged unless a contrast or
    accessibility issue requires a documented adjustment.
5.  Do not invent new product workflows that conflict with the PRD.
6.  Use realistic sample data only in clearly identified development
    fixtures.
7.  Ensure all visible controls have a defined behavior; do not create
    decorative, nonfunctional buttons.
8.  Keep shared UI independent of Electron-only APIs.
9.  Implement the MVP first; do not add future-scope features without
    explicit approval.
10. If a design detail is unspecified, choose the simplest accessible
    pattern consistent with the existing system and document significant
    decisions.

------------------------------------------------------------------------

**End of Design Specification**
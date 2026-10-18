# MarketSphere — Design Implementation

How the interface is actually built, and where it deliberately departs from
`docs/Product/Design.md`.

Phase 8 reworked the visual layer for real-world daytime trade use. The design
document is still the reference for structure, typography, and interaction
rules; this file describes the shipped tokens, components, and known gaps.

---

## 1. Documented deviation: light theme

Design.md §2 specifies a dark canvas (`#1B1C1E`). MarketSphere ships a **light**
interface instead.

Reason: the product is used in bright workshops, showrooms, and offices across
Delhi-NCR, often on shared or low-cost displays. A dark theme with light-grey
text at 12px (`#9598A0` on `#1B1C1E`) sits close to the 4.5:1 contrast limit and
degrades badly on dimmed or washed-out panels. The light palette keeps every
text pair comfortably above AA and reads better on the mixed-quality displays
these users actually have.

Typography is unchanged, as specified in Design.md §4:

| Role | Family | Source |
| ---- | ------ | ------ |
| Headings, short labels | Varela Round | `next/font/google`, self-hosted at build |
| Body, forms, navigation | Varela | `next/font/google` |
| Codes, references, quantities | Space Mono | `next/font/google` |

No gradients are used anywhere; the palette is flat colour only.

## 2. Tokens

Defined once in `src/app/globals.css` and exposed through `tailwind.config.ts`.
Components must use the utility names, never raw hex.

| Token | Value | Use |
| ----- | ----- | ---- |
| `--color-bg` | `#f6f7f9` | Page canvas |
| `--color-surface` | `#ffffff` | Cards, panels, inputs |
| `--color-border` | `#e2e5ea` | Borders, separators, icon strokes |
| `--color-text` | `#14181f` | Primary text |
| `--color-text-secondary` | `#414a57` | Supporting text |
| `--color-text-muted` | `#5c6673` | Metadata, hints |
| `--color-primary` | `#1b6aa8` | Primary actions, links, focus ring |
| `--color-primary-strong` | `#145685` | Primary hover |
| `--color-on-primary` | `#ffffff` | Text on primary/danger fills |
| `--color-success` / `-soft` | `#12703f` / `#e7f4ec` | Accepted states |
| `--color-warning` / `-soft` | `#8a5800` / `#fbf1df` | Pending states |
| `--color-danger` / `-soft` | `#b3261e` / `#fbebe9` | Errors, rejections |
| `--color-info` / `-soft` | `#1b6aa8` / `#e8f1f8` | Informational notices |
| `--color-neutral-soft` | `#f1f3f6` | Badges, hover fills |

`text-on-primary` exists because canvas colour is no longer a safe foreground
for filled buttons — it is an explicit token instead of an accident.

### Contrast is verified, not assumed

```bash
npm run check:contrast
```

`tools/check-contrast.mjs` parses the real values out of `globals.css` and
verifies the 17 foreground/background pairs the UI actually uses against WCAG
AA (4.5:1 text, 3:1 focus ring). It fails the build if a token is changed to
something that no longer passes.

## 3. Components

`src/components/ui/` holds the shared primitives; screens compose these rather
than re-declaring patterns.

| Component | Notes |
| --------- | ----- |
| `Button` | `primary` / `secondary` / `ghost` / `danger`, `sm` / `md`; 44px touch target on phones |
| `Field`, `Input`, `Textarea`, `Select` | Persistent labels, `aria-invalid`, `aria-describedby` error wiring, no `outline-none` |
| `StatusBadge` | Tinted background + coloured text + label; status is never colour alone |
| `FormAlert` | One alert component for every form and panel (`role="alert"` / `role="status"`) |
| `EmptyState` | Dashed, actionable empty state — never a dead end |
| `ErrorState` | Recoverable error with retry, used by route error boundaries |
| `LoadingState` | `aria-busy` skeleton rows with a polite live region |

Feature components live in `components/products`, `components/orders`,
`components/orders`, `components/admin`, `components/profile`, and
`components/notifications`.

## 4. Layout and responsiveness

- Every page renders through `PageShell`: one `<h1>`, consistent width
  (`narrow` 2xl / `default` 4xl / `wide` 6xl), padding `px-4 py-8 sm:py-10`.
- Breakpoints follow Tailwind defaults: `<640`, `640–1023`, `1024–1279`, `≥1280`.
- Navigation: inline bar from `md` up; below `md` it collapses into a panel
  controlled by a toggle button with `aria-expanded` / `aria-controls`.
  Escape closes it, focus moves in on open and returns to the toggle on close.
- Grids collapse `sm:grid-cols-2` → `lg:grid-cols-3/4`; list rows use
  `flex-wrap` so nothing forces horizontal scrolling.
- Product imagery uses fixed aspect boxes so cards do not jump while loading.

## 5. Accessibility

- Skip-to-content link is the first tab stop on every page.
- `:focus-visible` ring on all interactive elements; inputs no longer remove
  the outline.
- `aria-invalid` + `aria-describedby` tie field errors to their control.
- On a failed submit the first invalid field receives focus (`lib/forms.ts`).
- Status is always text + colour; badges never rely on hue alone.
- `prefers-reduced-motion` disables animation and smooth scrolling.
- Route `error.tsx` boundaries give a retry path with a reference id instead of
  a blank page; route `loading.tsx` files show labelled skeletons.

## 6. What usability testing could not cover

Static checks, rendered-HTML assertions, and the contrast tool run in CI. A
visual pass on physical devices, screen-reader walkthroughs, and testing with
low-bandwidth connections are still outstanding before the pilot — see Phase 8
of the roadmap in `README.md`.

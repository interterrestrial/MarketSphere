import type { ReactNode } from "react";

/**
 * Page shell shared by every authenticated screen (Design.md §5, §7).
 *
 * - one consistent page width, padding, and title block,
 * - a single `<h1>` per page with the document title following it,
 * - a skip link is handled once in the root layout; `main` is the landmark
 *   keyboard users jump to.
 */
export function PageShell({
  title,
  description,
  actions,
  children,
  width = "default",
}: {
  /** May include a badge next to the title (e.g. an order status). */
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide" | "narrow";
}) {
  const maxWidth = width === "wide" ? "max-w-6xl" : width === "narrow" ? "max-w-2xl" : "max-w-4xl";

  return (
    <main id="main-content" className={`mx-auto w-full ${maxWidth} px-4 py-8 sm:py-10`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-body sm:text-3xl">{title}</h1>
          {description ? (
            <div className="mt-2 max-w-2xl text-sm text-secondary">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-6 sm:mt-8">{children}</div>
    </main>
  );
}

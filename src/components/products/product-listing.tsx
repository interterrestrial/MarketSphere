import Link from "next/link";
import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductCardDto } from "@/types/product";

/** Listing grid with pagination (FR-21 – FR-24, Design.md §7.5). */
export function ProductListing({
  items,
  total,
  query,
}: {
  items: ProductCardDto[];
  total: number;
  query: Record<string, string | undefined>;
}) {
  const page = Number(query.page ?? "1");
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          title="No products match your search"
          description="Try removing a filter or searching a broader term. Sellers add new listings as they prepare stock."
          action={
            <Link
              href="/products"
              className="rounded-md border border-subtle px-4 py-2 text-sm text-secondary"
            >
              Clear search
            </Link>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
            const params = new URLSearchParams(
              Object.entries(query).filter(([, value]) => value) as [string, string][]
            );
            params.set("page", String(pageNumber));
            const active = pageNumber === page;
            return (
              <Link
                key={pageNumber}
                href={`/products?${params.toString()}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  active ? "border-primary text-body" : "border-subtle text-secondary"
                }`}
              >
                {pageNumber}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}

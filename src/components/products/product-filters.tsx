import Link from "next/link";
import type { CategoryOption } from "@/types/product";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

/**
 * Search and filter bar (FR-22 – FR-24, Design.md §7.4). A plain GET form so
 * results stay linkable and work without client scripting. Every control maps
 * to a real query field — no decorative filters.
 */
export function ProductFilters({
  categories,
  query,
}: {
  categories: CategoryOption[];
  query: Record<string, string | undefined>;
}) {
  const selectClass =
    "rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-body focus:border-primary focus:outline-none";
  const inputClass =
    "rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-body placeholder:text-muted focus:border-primary focus:outline-none";

  return (
    <form method="get" action="/products" className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query.q ?? ""}
          placeholder="Search products, e.g. bedsheet"
          className={`min-w-56 flex-1 ${inputClass}`}
        />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-background">
          Search
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="category" className="mb-1 block text-xs text-muted">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={query.category ?? ""}
            className={`w-full ${selectClass}`}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parentId ? "— " : ""}
                {category.name} ({category.productCount})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="availability" className="mb-1 block text-xs text-muted">
            Availability
          </label>
          <select
            id="availability"
            name="availability"
            defaultValue={query.availability ?? "any"}
            className={`w-full ${selectClass}`}
          >
            <option value="any">Any</option>
            <option value="available">Available now</option>
            <option value="unavailable">Currently unavailable</option>
          </select>
        </div>

        <div>
          <label htmlFor="minPrice" className="mb-1 block text-xs text-muted">
            Min price (INR)
          </label>
          <input
            id="minPrice"
            name="minPrice"
            inputMode="decimal"
            defaultValue={query.minPrice ?? ""}
            placeholder="0"
            className={`w-full ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="maxPrice" className="mb-1 block text-xs text-muted">
            Max price (INR)
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            inputMode="decimal"
            defaultValue={query.maxPrice ?? ""}
            placeholder="5000"
            className={`w-full ${inputClass}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sellerCity" className="mb-1 block text-xs text-muted">
            Seller location
          </label>
          <input
            id="sellerCity"
            name="sellerCity"
            defaultValue={query.sellerCity ?? ""}
            placeholder="Sonipat"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block text-xs text-muted">
            Sort by
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={query.sort ?? "newest"}
            className={selectClass}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={`rounded-md border border-subtle px-4 py-2 text-sm ${selectClass}`}
        >
          Apply filters
        </button>
        <Link href="/products" className="px-2 py-2 text-sm text-secondary hover:text-body">
          Clear
        </Link>
      </div>
    </form>
  );
}

import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductListing } from "@/components/products/product-listing";
import { AppError } from "@/server/middleware/error-handler";
import { listCategoryOptions, searchProducts } from "@/server/services/product-search.service";
import { productSearchQuerySchema } from "@/server/validators/product";

/** Discovery page: any signed-in account may browse (sellers included). */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect("/login?next=%2Fproducts");

  const raw = await searchParams;
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    query[key] = Array.isArray(value) ? value[0] : value;
  }

  const parsed = productSearchQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_SEARCH", "That search is not valid. Try different filters.");
  }

  const [{ items, total }, categories] = await Promise.all([
    searchProducts(parsed.data),
    listCategoryOptions(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-heading text-2xl text-body">Explore products</h1>
        <p className="text-sm text-muted">
          {total} listing{total === 1 ? "" : "s"} from approved sellers
        </p>
      </div>
      <div className="mt-6">
        <ProductFilters categories={categories} query={query} />
      </div>
      <ProductListing items={items} total={total} query={query} />
      <p className="mt-10 text-xs text-muted">
        Availability and prices are provided by sellers. Final commercial terms are agreed when a
        seller accepts your order request.{" "}
        <Link href="/products" className="text-primary">
          Start over
        </Link>
        .
      </p>
    </main>
  );
}

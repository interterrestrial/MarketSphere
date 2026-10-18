import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductListing } from "@/components/products/product-listing";
import { AppError } from "@/server/middleware/error-handler";
import { listCategoryOptions, searchProducts } from "@/server/services/product-search.service";
import { productSearchQuerySchema } from "@/server/validators/product";
import { PageShell } from "@/components/layout/page-shell";

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
    <PageShell
      width="wide"
      title="Explore products"
      description={`${total} listing${total === 1 ? "" : "s"} from approved sellers. Prices are indicative until a seller accepts your request.`}
    >
      <ProductFilters categories={categories} query={query} />
      <ProductListing items={items} total={total} query={query} />
      <p className="mt-10 text-xs text-muted">
        Availability and prices are provided by sellers. Final commercial terms are agreed when a
        seller accepts your order request.
      </p>
    </PageShell>
  );
}

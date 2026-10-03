import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { AvailabilityBadge, ProductStatusBadge } from "@/components/products/product-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { indicativePriceLabel, moqLabel } from "@/lib/format";
import { listSellerProducts } from "@/server/services/product.service";
import type { AuthUser } from "@/types/auth";

export interface SellerProductsViewProps {
  user: AuthUser;
  items: Awaited<ReturnType<typeof listSellerProducts>>["items"];
  total: number;
}

/** Seller catalogue dashboard: real counts only, with a path to add a product. */
export function SellerProductsView({ user, items, total }: SellerProductsViewProps) {
  const pendingApproval = user.status !== "ACTIVE";
  const liveCount = items.filter((item) => item.status === "ACTIVE").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-body">Your products</h1>
          <p className="mt-1 text-sm text-secondary">
            {total} listing{total === 1 ? "" : "s"} · {liveCount} live
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="rounded-md bg-primary px-4 py-2 text-sm text-background"
        >
          Add product
        </Link>
      </div>

      {pendingApproval ? (
        <p className="mt-5 rounded-md border border-warning px-3 py-2 text-sm text-warning">
          Your account is awaiting approval, so listings stay in draft until an administrator
          approves it. Finish your business profile first if you have not yet.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No products yet"
            description="Add your first listing with images, minimum order quantity, and an indicative price, then submit it for review."
            action={
              <Link
                href="/seller/products/new"
                className="rounded-md bg-primary px-4 py-2 text-sm text-background"
              >
                Add your first product
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((product) => (
            <li
              key={product.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-subtle bg-surface p-4"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-background">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-muted">
                    No image
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-base text-body">{product.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {product.categoryName ?? "Uncategorised"} · {product.variantCount} variant
                  {product.variantCount === 1 ? "" : "s"} · {product.imageCount} image
                  {product.imageCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm text-secondary">
                  {indicativePriceLabel(product.indicativePrice)}
                  {moqLabel(product.minimumOrderQuantity) ? (
                    <> · {moqLabel(product.minimumOrderQuantity)}</>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2">
                <ProductStatusBadge status={product.status} />
                <AvailabilityBadge
                  isAvailable={product.isAvailable}
                  note={product.availabilityNote}
                />
              </div>
              <Link
                href={`/seller/products/${product.id}/edit`}
                className="rounded-md border border-subtle px-3 py-1.5 text-sm text-secondary hover:text-body"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export async function SellerProductsPage() {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect("/login?next=%2Fseller%2Fproducts");
  if (user.role !== "SELLER") redirect("/");
  const { items, total } = await listSellerProducts(user, { pageSize: 50 });
  return <SellerProductsView user={user} items={items} total={total} />;
}

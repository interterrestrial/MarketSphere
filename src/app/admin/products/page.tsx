import Link from "next/link";
import type { ProductStatus } from "@prisma/client";
import { requireAdminPage } from "@/components/admin/admin-page-parts";
import { ProductModerationCard } from "@/components/admin/product-moderation-card";
import { EmptyState } from "@/components/ui/empty-state";
import { listProductsForModeration } from "@/server/services/admin-product.service";

const FILTERS: Array<{ value: ProductStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "Awaiting review" },
  { value: "ACTIVE", label: "Live" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INACTIVE", label: "Archived" },
  { value: "DRAFT", label: "Drafts" },
];

/** Product moderation queue (FR-44). */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/products");
  const params = await searchParams;
  const raw = typeof params.status === "string" ? params.status : "PENDING_REVIEW";
  const status = (raw === "ALL" ? undefined : raw) as ProductStatus | undefined;

  const { items, total } = await listProductsForModeration({ status, pageSize: 50 });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-2xl text-body">Listing moderation</h1>
      <p className="mt-1 text-sm text-secondary">
        Listings only become visible to buyers after approval. Rejections tell the seller exactly
        what to change.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/products?status=${filter.value}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === filter.value
                ? "border-primary text-body"
                : "border-subtle text-secondary hover:text-body"
            }`}
          >
            {filter.label}
          </Link>
        ))}
        <Link
          href="/admin/products?status=ALL"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            status === undefined
              ? "border-primary text-body"
              : "border-subtle text-secondary hover:text-body"
          }`}
        >
          All
        </Link>
      </div>

      <p className="mt-4 text-sm text-muted">
        {total} listing{total === 1 ? "" : "s"}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nothing in this queue"
            description="Listings submitted by sellers appear here for approval."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((product) => (
            <ProductModerationCard key={product.id} product={product} />
          ))}
        </ul>
      )}
    </main>
  );
}

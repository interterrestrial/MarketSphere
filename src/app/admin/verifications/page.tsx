import Link from "next/link";
import type { VerificationStatus } from "@prisma/client";
import { requireAdminPage } from "@/components/admin/admin-page-parts";
import { SellerReviewCard } from "@/components/admin/seller-review-card";
import { EmptyState } from "@/components/ui/empty-state";
import { listSellersForReview } from "@/server/services/admin-seller.service";

const FILTERS: Array<{ value?: VerificationStatus; label: string }> = [
  { label: "Awaiting review", value: "PENDING" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NOT_SUBMITTED", label: "No profile yet" },
];

/** Seller verification queue (Design.md §11.2 admin screens). */
export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/verifications");
  const params = await searchParams;
  const raw = typeof params.status === "string" ? params.status : "PENDING";
  const status = (raw === "ALL" ? undefined : raw) as VerificationStatus | undefined;

  const { items, total } = await listSellersForReview({ status, pageSize: 50 });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-2xl text-body">Seller verification</h1>
      <p className="mt-1 text-sm text-secondary">
        Check the business details a seller submitted. Approval lets them submit listings for
        review; it is not an endorsement of product quality.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={
              filter.value
                ? `/admin/verifications?status=${filter.value}`
                : "/admin/verifications?status=ALL"
            }
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === filter.value
                ? "border-primary text-body"
                : "border-subtle text-secondary hover:text-body"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">
        {total} seller{total === 1 ? "" : "s"}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nothing to review"
            description="Sellers appear here as soon as they complete their business profile."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((seller) => (
            <SellerReviewCard key={seller.userId} seller={seller} />
          ))}
        </ul>
      )}
    </main>
  );
}

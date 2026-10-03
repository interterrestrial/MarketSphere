import Link from "next/link";
import type { RequestStatus } from "@prisma/client";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/format";
import type { OrderSummaryDto } from "@/types/order";

/**
 * Order request dashboard shared by buyers and sellers (Design.md §7.3, §7.8):
 * what needs attention first, then history. Counts come from real data only.
 */
export function OrderDashboard({
  items,
  counts,
  viewerRole,
  basePath,
}: {
  items: OrderSummaryDto[];
  counts: Record<string, number>;
  viewerRole: "BUYER" | "SELLER";
  basePath: string;
}) {
  const attentionStatus: RequestStatus =
    viewerRole === "BUYER" ? "AWAITING_BUYER" : "PENDING_SELLER";
  const attentionCount = counts[attentionStatus] ?? 0;

  const FILTERS: Array<{ value?: RequestStatus; label: string }> = [
    { label: "All" },
    {
      value: viewerRole === "BUYER" ? "AWAITING_BUYER" : "PENDING_SELLER",
      label: viewerRole === "BUYER" ? "Needs your response" : "New requests",
    },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "COMPLETED", label: "Completed" },
    { value: "REJECTED", label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `${basePath}?status=${filter.value}` : basePath}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              filter.value === attentionStatus
                ? "border-primary text-body"
                : "border-subtle text-secondary hover:text-body"
            }`}
          >
            {filter.label}
            {filter.value === attentionStatus && attentionCount > 0 ? (
              <span className="ml-1 text-xs text-muted">({attentionCount})</span>
            ) : null}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={viewerRole === "BUYER" ? "No order requests yet" : "No incoming requests yet"}
            description={
              viewerRole === "BUYER"
                ? "Browse products and send a request. You will be able to follow the seller's response here."
                : "Requests from buyers will appear here. Make sure your listings and minimum order quantities are up to date."
            }
            action={
              viewerRole === "BUYER" ? (
                <Link
                  href="/products"
                  className="rounded-md bg-primary px-4 py-2 text-sm text-background"
                >
                  Explore products
                </Link>
              ) : (
                <Link
                  href="/seller/products"
                  className="rounded-md border border-subtle px-4 py-2 text-sm text-secondary"
                >
                  Manage products
                </Link>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((order) => (
            <li key={order.id}>
              <Link
                href={`${basePath}/${order.id}`}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-subtle bg-surface p-4 hover:border-primary"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-muted">{order.reference}</span>
                    <OrderStatusBadge status={order.status} viewerRole={viewerRole} />
                  </p>
                  <p className="mt-1 truncate text-body">{order.itemSummary}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {viewerRole === "BUYER" ? "Seller" : "Buyer"}: {order.counterpartyName} ·{" "}
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-body">
                    {formatMoney(order.total) ?? "Terms to confirm"}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

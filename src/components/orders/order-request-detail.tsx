import Link from "next/link";
import type { AuthUser } from "@/types/auth";
import type { OrderRequestDto } from "@/types/order";
import { formatMoney } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { SellerResponsePanel } from "@/components/orders/seller-response-panel";
import { BuyerOrderActions, CompleteOrderButton } from "@/components/orders/buyer-order-actions";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-subtle py-2 text-sm last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-secondary">{value}</dd>
    </div>
  );
}

/**
 * Order request detail (FR-25 detail view for orders, Design.md §7.11):
 * requested versus agreed terms kept clearly apart, the recorded history, and
 * only the actions the backend allows for this role and status.
 */
export function OrderRequestDetail({
  order,
  user,
  basePath,
}: {
  order: OrderRequestDto;
  user: AuthUser;
  basePath: string;
}) {
  const isSeller = user.role === "SELLER";
  const canRespond = isSeller && ["PENDING_SELLER", "SELLER_PROPOSED"].includes(order.status);
  const canComplete = isSeller && order.status === "ACCEPTED";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href={basePath} className="text-sm text-secondary hover:text-primary">
        ← All requests
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 font-heading text-2xl text-body">
            <span className="font-mono text-sm text-muted">{order.reference}</span>
            <OrderStatusBadge status={order.status} viewerRole={isSeller ? "SELLER" : "BUYER"} />
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {isSeller ? "Buyer" : "Seller"}:{" "}
            {(isSeller ? order.buyer : order.seller).businessName ??
              (isSeller ? order.buyer.name : order.seller.name)}
          </p>
        </div>
      </div>

      {!order.confirmed ? (
        <p className="mt-4 rounded-md border border-warning px-3 py-2 text-sm text-warning">
          This is a request, not a confirmed order. No payment is collected by MarketSphere and
          nothing is committed until both sides agree the terms.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-subtle bg-surface p-4">
            <h2 className="font-heading text-base text-body">Requested products</h2>
            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="rounded-md border border-subtle bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/products/${item.productId}`}
                        className="text-sm text-body hover:text-primary"
                      >
                        {item.productName}
                      </Link>
                      {item.variant ? (
                        <p className="mt-0.5 text-xs text-muted">{item.variant}</p>
                      ) : null}
                      {!item.productActive ? (
                        <p className="mt-0.5 text-xs text-warning">
                          This listing is no longer live.
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-secondary">
                        Quantity {item.quantity}
                        {item.proposedQuantity ? ` → ${item.proposedQuantity}` : ""}
                      </p>
                      <p className="text-muted">
                        Requested {formatMoney(item.requestedUnitPrice) ?? "no price stated"}
                      </p>
                      {item.proposedUnitPrice ? (
                        <p className="text-info">Proposed {formatMoney(item.proposedUnitPrice)}</p>
                      ) : null}
                      {item.agreedUnitPrice ? (
                        <p className="text-success">Agreed {formatMoney(item.agreedUnitPrice)}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {canRespond ? <SellerResponsePanel order={order} /> : null}
          {canComplete ? <CompletePanel orderId={order.id} /> : null}
          {!isSeller ? <BuyerOrderActions order={order} /> : null}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-subtle bg-surface p-4">
            <h2 className="font-heading text-base text-body">Terms</h2>
            <dl className="mt-2">
              <Row
                label="Agreed total"
                value={formatMoney(order.agreedTotal) ?? "Not agreed yet"}
              />
              <Row
                label="Proposed total"
                value={formatMoney(order.proposedTotal) ?? "No proposal sent"}
              />
              <Row label="Delivery address" value={order.deliveryAddress ?? "Not provided"} />
              <Row
                label="Submitted"
                value={new Date(order.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            </dl>
            {order.buyerNotes ? (
              <div className="mt-3">
                <p className="text-xs text-muted">Buyer notes</p>
                <p className="mt-1 whitespace-pre-line text-sm text-secondary">
                  {order.buyerNotes}
                </p>
              </div>
            ) : null}
            {order.proposalNote ? (
              <div className="mt-3">
                <p className="text-xs text-muted">Seller note on the proposal</p>
                <p className="mt-1 text-sm text-secondary">{order.proposalNote}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-subtle bg-surface p-4">
            <h2 className="font-heading text-base text-body">History</h2>
            <div className="mt-3">
              <OrderTimeline history={order.history} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/** Seller marks an accepted order as fulfilled. */
function CompletePanel({ orderId }: { orderId: string }) {
  return (
    <section className="rounded-lg border border-subtle bg-surface p-4">
      <h2 className="font-heading text-base text-body">Fulfillment</h2>
      <p className="mt-1 text-xs text-muted">
        Coordinate delivery with the buyer, then mark the order complete once it has been handed
        over. This does not record any payment.
      </p>
      <div className="mt-3">
        <CompleteOrderButton orderId={orderId} />
      </div>
    </section>
  );
}

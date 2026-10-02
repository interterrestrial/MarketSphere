import Link from "next/link";
import { AvailabilityBadge } from "@/components/products/product-badges";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { Button } from "@/components/ui/button";
import { formatMoney, moqLabel } from "@/lib/format";
import type { AuthUser } from "@/types/auth";
import type { ProductDetailDto } from "@/types/product";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-subtle py-2 text-sm last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-secondary">{value}</dd>
    </div>
  );
}

/**
 * Product detail (FR-25, Design.md §7.6). Availability is presented as
 * seller-provided information, prices as indicative, and the primary action
 * is an order *request* — nothing here implies payment (BR-04).
 */
export function ProductDetail({ product, user }: { product: ProductDetailDto; user: AuthUser }) {
  const price = formatMoney(product.indicativePrice);
  const moq = moqLabel(product.minimumOrderQuantity);
  const isBuyer = user.role === "BUYER";
  const ownListing = user.role === "SELLER" && user.id === product.seller?.userId;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/products" className="text-sm text-secondary hover:text-primary">
        ← Back to products
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          {product.images.length === 0 ? (
            <div className="flex h-72 items-center justify-center rounded-lg border border-subtle bg-surface text-sm text-muted">
              No image provided
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-subtle bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images[0].imageUrl}
                alt={product.name}
                className="h-72 w-full object-cover"
              />
            </div>
          )}
          {product.images.length > 1 ? (
            <ul className="grid grid-cols-4 gap-2">
              {product.images.slice(1).map((image) => (
                <li key={image.id} className="overflow-hidden rounded border border-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.imageUrl} alt="" className="h-16 w-full object-cover" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <p className="text-xs text-muted">{product.category?.name ?? "Uncategorised"}</p>
          <h1 className="mt-1 font-heading text-2xl text-body">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AvailabilityBadge isAvailable={product.isAvailable} note={product.availabilityNote} />
            {product.seller ? (
              <VerificationBadge status={product.seller.verificationStatus} />
            ) : null}
          </div>

          <dl className="mt-5">
            <DetailRow
              label="Indicative price"
              value={price ? `${price} (confirmed by seller)` : "Contact seller for price"}
            />
            <DetailRow label="Minimum order quantity" value={moq ?? "No minimum set"} />
            <DetailRow
              label="Availability"
              value="Provided by the seller — confirmed when they accept your request"
            />
            {product.seller ? (
              <DetailRow
                label="Seller"
                value={`${product.seller.businessName}${
                  product.seller.city ? ` · ${product.seller.city}` : ""
                }`}
              />
            ) : null}
          </dl>

          {isBuyer ? (
            <div className="mt-6 rounded-lg border border-subtle bg-surface p-4">
              <p className="text-sm text-secondary">
                Submitting a request does not confirm an order or trigger any payment. The seller
                reviews your quantities and confirms price, availability, and delivery before an
                order is accepted.
              </p>
              <div className="mt-4">
                <Button disabled title="Order requests open in the next phase">
                  Request order
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Request submission arrives with the order-request workflow.
              </p>
            </div>
          ) : null}

          {ownListing ? (
            <p className="mt-6 text-sm text-secondary">
              This is your listing.{" "}
              <Link href={`/seller/products/${product.id}/edit`} className="text-primary">
                Edit it
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>

      {product.description ? (
        <section className="mt-10">
          <h2 className="font-heading text-lg text-body">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-secondary">
            {product.description}
          </p>
        </section>
      ) : null}

      {product.variants.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-heading text-lg text-body">Available variants</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <li
                key={variant.id}
                className="rounded-md border border-subtle bg-surface px-3 py-1.5 text-sm text-secondary"
              >
                {variant.name}: <span className="text-body">{variant.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

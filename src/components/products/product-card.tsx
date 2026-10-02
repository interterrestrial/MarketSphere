import Link from "next/link";
import { AvailabilityBadge } from "@/components/products/product-badges";
import { indicativePriceLabel, moqLabel } from "@/lib/format";
import type { ProductCardDto } from "@/types/product";

/**
 * Product card (Design.md §7.5): image, name, seller, MOQ, indicative price,
 * and availability. One clear action; the card itself is not a giant button.
 */
export function ProductCard({ product }: { product: ProductCardDto }) {
  const moq = moqLabel(product.minimumOrderQuantity);

  return (
    <li className="flex flex-col rounded-lg border border-subtle bg-surface p-4">
      <div className="h-40 overflow-hidden rounded-md bg-background">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-muted">
            No image provided
          </span>
        )}
      </div>
      <h3 className="mt-3 font-heading text-base text-body">
        <Link href={`/products/${product.id}`} className="hover:text-primary">
          {product.name}
        </Link>
      </h3>
      <p className="mt-1 text-xs text-muted">
        {product.sellerName ?? "Business"}
        {product.sellerCity ? ` · ${product.sellerCity}` : ""}
      </p>
      <p className="mt-2 text-sm text-secondary">{indicativePriceLabel(product.indicativePrice)}</p>
      <p className="mt-1 text-xs text-muted">{moq ?? "No minimum order set"}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AvailabilityBadge isAvailable={product.isAvailable} note={product.availabilityNote} />
      </div>
      <Link
        href={`/products/${product.id}`}
        className="mt-4 rounded-md border border-subtle px-3 py-1.5 text-center text-sm text-secondary hover:text-body"
      >
        View details
      </Link>
    </li>
  );
}

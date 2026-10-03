import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { OrderRequestForm } from "@/components/orders/order-request-form";
import { db } from "@/lib/db";
import { AppError } from "@/server/middleware/error-handler";
import { getVisibleProduct } from "@/server/services/product-search.service";

/**
 * New request page. Started from a product so the seller is known up front —
 * a request belongs to exactly one seller (ER §6).
 */
export default async function NewOrderRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect("/login?next=%2Fproducts");
  if (user.role !== "BUYER") redirect("/");

  const params = await searchParams;
  const productId = typeof params.product === "string" ? params.product : null;
  if (!productId) redirect("/products");

  let product;
  try {
    product = await getVisibleProduct(productId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) redirect("/products");
    throw error;
  }
  if (!product.seller) redirect("/products");

  // Other requestable listings from the same seller, so the buyer can add
  // more lines without crossing into a second request.
  const catalogue = await db.product.findMany({
    where: {
      sellerId: product.seller.userId,
      status: "ACTIVE",
      isAvailable: true,
      id: { not: product.id },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, minimumOrderQuantity: true },
  });

  const profile = await db.businessProfile.findUnique({ where: { userId: user.id } });
  const defaultDeliveryAddress = profile?.address
    ? [profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(", ")
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/products/${product.id}`} className="text-sm text-secondary hover:text-primary">
        ← Back to product
      </Link>
      <h1 className="mt-3 font-heading text-2xl text-body">Request an order</h1>
      <p className="mt-2 text-sm text-secondary">
        Requesting from {product.seller.businessName}
        {product.seller.city ? ` · ${product.seller.city}` : ""}
      </p>
      <div className="mt-8">
        <OrderRequestForm
          initialProduct={product}
          sellerCatalogue={catalogue}
          defaultDeliveryAddress={defaultDeliveryAddress}
        />
      </div>
    </main>
  );
}

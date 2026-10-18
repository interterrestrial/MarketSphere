import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { OrderRequestForm } from "@/components/orders/order-request-form";
import { db } from "@/lib/db";
import { AppError } from "@/server/middleware/error-handler";
import { getVisibleProduct } from "@/server/services/product-search.service";
import { PageShell } from "@/components/layout/page-shell";

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
    <PageShell
      title="Request an order"
      description={`Requesting from ${product.seller.businessName}${product.seller.city ? ` · ${product.seller.city}` : ""}.`}
    >
      <OrderRequestForm
        initialProduct={product}
        sellerCatalogue={catalogue}
        defaultDeliveryAddress={defaultDeliveryAddress}
      />
    </PageShell>
  );
}

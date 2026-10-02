import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { ProductDetail } from "@/components/products/product-detail";
import { AppError } from "@/server/middleware/error-handler";
import { getVisibleProduct } from "@/server/services/product-search.service";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect(`/login?next=${encodeURIComponent(`/products/${id}`)}`);

  try {
    const product = await getVisibleProduct(id);
    return <ProductDetail product={product} user={user} />;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
}

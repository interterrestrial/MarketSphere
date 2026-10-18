import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { PageShell } from "@/components/layout/page-shell";
import { ProductDetail } from "@/components/products/product-detail";
import { AppError } from "@/server/middleware/error-handler";
import { getVisibleProduct } from "@/server/services/product-search.service";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect(`/login?next=${encodeURIComponent(`/products/${id}`)}`);

  try {
    const product = await getVisibleProduct(id);
    return (
      <PageShell
        width="wide"
        title={product.name}
        description={product.seller?.businessName}
        actions={
          <Link
            href="/products"
            className="rounded-md border border-subtle bg-surface px-3 py-1.5 text-sm text-secondary hover:border-primary hover:text-body"
          >
            Back to products
          </Link>
        }
      >
        <ProductDetail product={product} user={user} />
      </PageShell>
    );
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
}

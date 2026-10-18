import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { ProductActions } from "@/components/products/product-actions";
import { ProductForm } from "@/components/products/product-form";
import { ImageManager } from "@/components/products/image-manager";
import { VariantManager } from "@/components/products/variant-manager";
import { ProductStatusBadge } from "@/components/products/product-badges";
import { listCategoryOptions } from "@/server/services/product-search.service";
import type { AuthUser } from "@/types/auth";
import type { CategoryOption, ProductDetailDto } from "@/types/product";
import { PageShell } from "@/components/layout/page-shell";

/** Shared page for "add product" and "edit product" (both use the same form). */
export async function ProductEditor({
  product,
  categories,
  user,
}: {
  product?: ProductDetailDto;
  categories: CategoryOption[];
  user: AuthUser;
}) {
  return (
    <PageShell
      title={product ? "Edit product" : "Add a product"}
      description={
        product
          ? "Changes apply immediately. Live listings stay visible while you edit."
          : "Save as a draft first, then submit it for review."
      }
      actions={product ? <ProductStatusBadge status={product.status} /> : null}
    >
      {user.status !== "ACTIVE" ? (
        <p className="mt-5 rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
          Your account is awaiting approval. You can prepare this listing, but submitting it for
          review stays locked until an administrator approves your account.
        </p>
      ) : null}

      <div className="mt-8">
        <ProductForm categories={categories} product={product} />
      </div>

      {product ? (
        <div className="mt-12 space-y-10">
          <ProductActions productId={product.id} status={product.status} />
          <VariantManager productId={product.id} variants={product.variants} />
          <ImageManager productId={product.id} images={product.images} />
        </div>
      ) : null}
    </PageShell>
  );
}

export async function requireSellerSession(nextPath: string): Promise<AuthUser> {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.role !== "SELLER") redirect("/");
  return user;
}

export async function loadCategories(): Promise<CategoryOption[]> {
  return listCategoryOptions();
}

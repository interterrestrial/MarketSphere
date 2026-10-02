import { headers } from "next/headers";
import Link from "next/link";
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/seller/products" className="text-sm text-secondary hover:text-primary">
        ← Back to products
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-body">
          {product ? "Edit product" : "Add a product"}
        </h1>
        {product ? <ProductStatusBadge status={product.status} /> : null}
      </div>
      <p className="mt-2 text-sm text-secondary">
        {product
          ? "Changes apply immediately. Published listings stay live while you edit."
          : "Save as a draft first — you can add images and variants, then publish when ready."}
      </p>

      {user.status !== "ACTIVE" ? (
        <p className="mt-5 rounded-md border border-warning px-3 py-2 text-sm text-warning">
          Your account is awaiting approval. You can prepare this listing, but publishing stays
          locked until an administrator approves the account.
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
    </main>
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

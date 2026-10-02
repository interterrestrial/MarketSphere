import { notFound } from "next/navigation";
import {
  ProductEditor,
  loadCategories,
  requireSellerSession,
} from "@/components/products/product-editor";
import { getSellerProduct } from "@/server/services/product.service";
import { AppError } from "@/server/middleware/error-handler";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSellerSession(`/seller/products/${id}/edit`);
  const categories = await loadCategories();
  let product;
  try {
    product = await getSellerProduct(user, id);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
  return <ProductEditor product={product} categories={categories} user={user} />;
}

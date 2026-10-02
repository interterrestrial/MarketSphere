import {
  ProductEditor,
  loadCategories,
  requireSellerSession,
} from "@/components/products/product-editor";

export default async function NewProductPage() {
  const user = await requireSellerSession("/seller/products/new");
  const categories = await loadCategories();
  return <ProductEditor categories={categories} user={user} />;
}

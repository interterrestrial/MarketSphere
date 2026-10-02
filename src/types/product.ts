import type { ProductStatus, VerificationStatus } from "@prisma/client";

/**
 * Client-safe product shapes for the seller and buyer UIs. Prices are
 * strings (PostgreSQL numeric) and dates are ISO strings so server
 * components can pass them straight to client components.
 */

export interface ProductImageDto {
  id: string;
  imageUrl: string;
  displayOrder: number;
}

export interface ProductVariantDto {
  id: string;
  name: string;
  value: string;
  sku: string | null;
  isAvailable: boolean;
}

export interface SellerSummaryDto {
  userId: string;
  businessName: string;
  city: string | null;
  state: string | null;
  verificationStatus: VerificationStatus;
}

/** Card data for discovery listings (FR-21, Design.md §7.5). */
export interface ProductCardDto {
  id: string;
  name: string;
  indicativePrice: string | null;
  minimumOrderQuantity: number | null;
  isAvailable: boolean;
  availabilityNote: string | null;
  imageUrl: string | null;
  categoryName: string | null;
  sellerName: string | null;
  sellerCity: string | null;
}

/** Detail view for one product (FR-25, Design.md §7.6). */
export interface ProductDetailDto {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  indicativePrice: string | null;
  minimumOrderQuantity: number | null;
  isAvailable: boolean;
  availabilityNote: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  seller: SellerSummaryDto | null;
}

/** Seller catalog row (Design.md §7.8 — derived from real data only). */
export interface SellerProductDto {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  status: ProductStatus;
  indicativePrice: string | null;
  minimumOrderQuantity: number | null;
  isAvailable: boolean;
  availabilityNote: string | null;
  imageUrl: string | null;
  categoryName: string | null;
  variantCount: number;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

/** Filter option with the count of publicly visible products (FR-23). */
export interface CategoryOption extends CategoryDto {
  productCount: number;
}

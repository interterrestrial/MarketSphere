import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { CategoryOption, ProductCardDto, ProductDetailDto } from "../../types/product";
import { NotFoundError } from "../middleware/error-handler";
import type { ProductSearchQuery } from "../validators/product";
import { productSortOrder } from "./product.service";

/**
 * Buyer discovery (FR-21 – FR-25).
 *
 * BR-03: only ACTIVE listings from ACTIVE sellers are visible. BR-02: the
 * seller must also have a business profile before its listings appear.
 */

/**
 * Seller filter for public visibility: the account must be ACTIVE and must
 * have a business profile (BR-02). Optionally narrowed to a city.
 */
function sellerFilter(city?: string): Prisma.UserWhereInput {
  return {
    status: "ACTIVE",
    businessProfile: city
      ? { is: { city: { contains: city, mode: "insensitive" } } }
      : { isNot: null },
  };
}

/** Visibility rule applied to every public product query. */
function visibleProductWhere(): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE",
    seller: sellerFilter(),
  };
}

function searchWhere(query: ProductSearchQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...visibleProductWhere() };

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { category: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  if (query.category) {
    // Accept either a category id or slug so filter links stay readable.
    where.category = { OR: [{ id: query.category }, { slug: query.category }] };
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.indicativePrice = {
      not: null,
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }
  if (query.sellerCity) {
    where.seller = sellerFilter(query.sellerCity);
  }
  if (query.availability === "available") {
    where.isAvailable = true;
  } else if (query.availability === "unavailable") {
    where.isAvailable = false;
  }
  return where;
}

/** Paginated product search with keyword, filters, and sorting. */
export async function searchProducts(
  query: ProductSearchQuery
): Promise<{ items: ProductCardDto[]; total: number }> {
  const where = searchWhere(query);
  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: productSortOrder[query.sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" }, take: 1 },
        seller: { include: { businessProfile: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      indicativePrice: row.indicativePrice?.toString() ?? null,
      minimumOrderQuantity: row.minimumOrderQuantity,
      isAvailable: row.isAvailable,
      availabilityNote: row.availabilityNote,
      imageUrl: row.images[0]?.imageUrl ?? null,
      categoryName: row.category?.name ?? null,
      sellerName: row.seller.businessProfile?.businessName ?? null,
      sellerCity: row.seller.businessProfile?.city ?? null,
    })),
    total,
  };
}

/**
 * Product detail for buyers. MOQ, indicative pricing, and seller-supplied
 * availability are always included (Phase 4 business rules); contact
 * details stay private until inquiry handling exists (PRD §14.2).
 */
export async function getVisibleProduct(productId: string): Promise<ProductDetailDto> {
  const product = await db.product.findFirst({
    where: { id: productId, ...visibleProductWhere() },
    include: {
      category: true,
      images: { orderBy: { displayOrder: "asc" } },
      variants: { where: { isAvailable: true }, orderBy: { name: "asc" } },
      seller: { include: { businessProfile: true } },
    },
  });
  if (!product) {
    throw new NotFoundError("Product");
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    indicativePrice: product.indicativePrice?.toString() ?? null,
    minimumOrderQuantity: product.minimumOrderQuantity,
    isAvailable: product.isAvailable,
    availabilityNote: product.availabilityNote,
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: product.category
      ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
      : null,
    images: product.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      displayOrder: image.displayOrder,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      value: variant.value,
      sku: variant.sku,
      isAvailable: variant.isAvailable,
    })),
    seller: product.seller.businessProfile
      ? {
          userId: product.seller.id,
          businessName: product.seller.businessProfile.businessName,
          city: product.seller.businessProfile.city,
          state: product.seller.businessProfile.state,
          verificationStatus: product.seller.businessProfile.verificationStatus,
        }
      : null,
  };
}

/**
 * Category options for filter controls, each with the number of publicly
 * visible products so filters only offer real options (Design.md §7.4).
 */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  const rows = await db.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { products: { where: { status: "ACTIVE", isAvailable: true } } },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    productCount: row._count.products,
  }));
}

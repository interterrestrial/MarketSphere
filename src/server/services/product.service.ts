import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import type { ProductDetailDto, SellerProductDto } from "../../types/product";
import { AppError, NotFoundError } from "../middleware/error-handler";
import type { CreateProductInput, ProductSort, UpdateProductInput } from "../validators/product";

/**
 * Seller-side catalogue operations.
 *
 * Ownership rule: every mutation loads the product scoped to the caller's
 * `sellerId` and answers 404 when it does not belong to them, so no seller
 * can edit or remove another seller's listing and product ids cannot be
 * probed.
 */

async function ownedProduct(user: AuthUser, productId: string) {
  const product = await db.product.findFirst({ where: { id: productId, sellerId: user.id } });
  if (!product) {
    throw new NotFoundError("Product");
  }
  return product;
}

/** Loads a seller-owned product with the data the catalogue UI displays. */
async function ownedProductDto(user: AuthUser, productId: string): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  const row = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      images: { orderBy: { displayOrder: "asc" }, take: 1 },
      _count: { select: { variants: true, images: true } },
    },
  });
  if (!row) {
    throw new NotFoundError("Product");
  }
  return toSellerProductDto(
    row,
    row._count.variants,
    row._count.images,
    row.images[0]?.imageUrl ?? null,
    row.category?.name ?? null
  );
}

/**
 * Publishing requires an active account and a business profile (PRD §6.2:
 * only approved sellers may publish). Administrator moderation of listings
 * (FR-20) arrives with the admin dashboard, so publication is direct here.
 */
async function assertCanPublish(user: AuthUser): Promise<void> {
  if (user.status !== "ACTIVE") {
    throw new AppError(
      403,
      "ACCOUNT_PENDING",
      "Your account is awaiting approval. You can prepare listings but not publish them yet."
    );
  }
  const profile = await db.businessProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    throw new AppError(
      400,
      "PROFILE_REQUIRED",
      "Create your business profile before publishing products."
    );
  }
}

function categoryIdOrNull(value: string | undefined): string | null | undefined {
  return value === undefined ? undefined : value === "" ? null : value;
}

/** Creates a draft listing owned by the signed-in seller. */
export async function createProduct(
  user: AuthUser,
  input: CreateProductInput
): Promise<SellerProductDto> {
  const product = await db.product.create({
    data: {
      sellerId: user.id,
      name: input.name,
      description: input.description,
      categoryId: categoryIdOrNull(input.categoryId) ?? null,
      indicativePrice: input.indicativePrice ?? null,
      minimumOrderQuantity:
        input.minimumOrderQuantity === undefined ? null : Number(input.minimumOrderQuantity),
      isAvailable: input.isAvailable ?? true,
      availabilityNote: input.availabilityNote ?? null,
      status: "DRAFT",
    },
  });
  return ownedProductDto(user, product.id);
}

/** Updates the seller's own listing. Never changes status. */
export async function updateProduct(
  user: AuthUser,
  productId: string,
  input: UpdateProductInput
): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await db.product.update({
    where: { id: productId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId !== undefined
        ? { categoryId: categoryIdOrNull(input.categoryId) ?? null }
        : {}),
      ...(input.indicativePrice !== undefined ? { indicativePrice: input.indicativePrice } : {}),
      ...(input.minimumOrderQuantity !== undefined
        ? {
            minimumOrderQuantity:
              input.minimumOrderQuantity === undefined || input.minimumOrderQuantity === ""
                ? null
                : Number(input.minimumOrderQuantity),
          }
        : {}),
      ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
      ...(input.availabilityNote !== undefined ? { availabilityNote: input.availabilityNote } : {}),
    },
  });
  return ownedProductDto(user, productId);
}

/** Publishes a draft or re-activates an archived listing. */
export async function publishProduct(user: AuthUser, productId: string): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await assertCanPublish(user);
  await db.product.update({ where: { id: productId }, data: { status: "ACTIVE" } });
  return ownedProductDto(user, productId);
}

/** Archives a listing: it leaves buyer search but keeps its history. */
export async function archiveProduct(user: AuthUser, productId: string): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await db.product.update({ where: { id: productId }, data: { status: "INACTIVE" } });
  return ownedProductDto(user, productId);
}

/**
 * Deletes a draft outright. Published listings must be archived instead so
 * historical order requests keep referring to a real product (BR-08).
 */
export async function deleteProduct(user: AuthUser, productId: string): Promise<void> {
  const product = await ownedProduct(user, productId);
  if (product.status !== "DRAFT") {
    throw new AppError(
      409,
      "ARCHIVE_REQUIRED",
      "Published listings cannot be deleted. Archive the product instead."
    );
  }
  await db.product.delete({ where: { id: productId } });
}

/** The seller's own catalogue, newest first, any status. */
export async function listSellerProducts(
  user: AuthUser,
  options: { page?: number; pageSize?: number; status?: string } = {}
): Promise<{ items: SellerProductDto[]; total: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const status = options.status as never;

  const where: Prisma.ProductWhereInput = {
    sellerId: user.id,
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" }, take: 1 },
        _count: { select: { variants: true, images: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return {
    items: rows.map((row) =>
      toSellerProductDto(
        row,
        row._count.variants,
        row._count.images,
        row.images[0]?.imageUrl ?? null,
        row.category?.name ?? null
      )
    ),
    total,
  };
}

/** Adds an image reference. Files live in object storage, not the database. */
export async function addProductImage(
  user: AuthUser,
  productId: string,
  input: { imageUrl: string; displayOrder?: number }
): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await db.productImage.create({
    data: {
      productId,
      imageUrl: input.imageUrl,
      displayOrder: input.displayOrder ?? 0,
    },
  });
  return ownedProductDto(user, productId);
}

export async function removeProductImage(
  user: AuthUser,
  productId: string,
  imageId: string
): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await db.productImage.deleteMany({ where: { id: imageId, productId } });
  return ownedProductDto(user, productId);
}

/** Adds a size/colour/fabric option to the seller's product. */
export async function addVariant(
  user: AuthUser,
  productId: string,
  input: { name: string; value: string; sku?: string; isAvailable?: boolean }
): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await db.productVariant.create({
    data: {
      productId,
      name: input.name,
      value: input.value,
      sku: input.sku ?? null,
      isAvailable: input.isAvailable ?? true,
    },
  });
  return ownedProductDto(user, productId);
}

export async function updateVariant(
  user: AuthUser,
  productId: string,
  variantId: string,
  input: { name?: string; value?: string; sku?: string; isAvailable?: boolean }
): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await db.productVariant.updateMany({ where: { id: variantId, productId }, data: input });
  return ownedProductDto(user, productId);
}

export async function removeVariant(
  user: AuthUser,
  productId: string,
  variantId: string
): Promise<SellerProductDto> {
  await ownedProduct(user, productId);
  await db.productVariant.deleteMany({ where: { id: variantId, productId } });
  return ownedProductDto(user, productId);
}

/**
 * Full product detail for the owning seller — any status, all variants, and
 * all images, so the edit screen can show real values.
 */
export async function getSellerProduct(
  user: AuthUser,
  productId: string
): Promise<ProductDetailDto> {
  await ownedProduct(user, productId);
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      images: { orderBy: { displayOrder: "asc" } },
      variants: { orderBy: [{ name: "asc" }, { value: "asc" }] },
      seller: { include: { businessProfile: true } },
    },
  });
  if (!product) {
    throw new NotFoundError("Product");
  }
  const profile = product.seller.businessProfile;
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
    seller: profile
      ? {
          userId: product.seller.id,
          businessName: profile.businessName,
          city: profile.city,
          state: profile.state,
          verificationStatus: profile.verificationStatus,
        }
      : null,
  };
}

function toSellerProductDto(
  product: {
    id: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    status: SellerProductDto["status"];
    indicativePrice: { toString(): string } | null;
    minimumOrderQuantity: number | null;
    isAvailable: boolean;
    availabilityNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  variantCount: number,
  imageCount: number,
  imageUrl: string | null,
  categoryName: string | null
): SellerProductDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    status: product.status,
    indicativePrice: product.indicativePrice?.toString() ?? null,
    minimumOrderQuantity: product.minimumOrderQuantity,
    isAvailable: product.isAvailable,
    availabilityNote: product.availabilityNote,
    imageUrl,
    categoryName,
    variantCount,
    imageCount,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export const productSortOrder: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  name_asc: [{ name: "asc" }],
  name_desc: [{ name: "desc" }],
  price_asc: [{ indicativePrice: { sort: "asc", nulls: "last" } }],
  price_desc: [{ indicativePrice: { sort: "desc", nulls: "last" } }],
};

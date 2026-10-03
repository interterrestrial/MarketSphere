import type { Prisma, ProductStatus } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import { AppError, NotFoundError } from "../middleware/error-handler";
import { ADMIN_ACTIONS, AUDIT_ENTITIES, recordAudit } from "./admin-core";
import { notify } from "./notification.service";

/**
 * Product moderation (FR-44, BR-03).
 *
 * Sellers submit listings for review; administrators decide whether they
 * become visible to buyers. Listings already referenced by an order request
 * are never deleted, only archived, so history stays intact (BR-08).
 */

export interface AdminProductRow {
  id: string;
  name: string;
  status: ProductStatus;
  indicativePrice: string | null;
  minimumOrderQuantity: number | null;
  isAvailable: boolean;
  imageUrl: string | null;
  imageCount: number;
  variantCount: number;
  categoryName: string | null;
  sellerName: string;
  sellerBusinessName: string | null;
  sellerId: string;
  createdAt: string;
}

const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { displayOrder: "asc" }, take: 1 },
  variants: { select: { name: true, value: true } },
  seller: { include: { businessProfile: { select: { businessName: true } } } },
  _count: { select: { images: true, variants: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

function toRow(product: ProductRow): AdminProductRow {
  return {
    id: product.id,
    name: product.name,
    status: product.status,
    indicativePrice: product.indicativePrice?.toString() ?? null,
    minimumOrderQuantity: product.minimumOrderQuantity,
    isAvailable: product.isAvailable,
    imageUrl: product.images[0]?.imageUrl ?? null,
    imageCount: product._count.images,
    variantCount: product._count.variants,
    categoryName: product.category?.name ?? null,
    sellerName: product.seller.name,
    sellerBusinessName: product.seller.businessProfile?.businessName ?? null,
    sellerId: product.sellerId,
    createdAt: product.createdAt.toISOString(),
  };
}

/** Listings for the moderation queue, filtered by status. */
export async function listProductsForModeration(options: {
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminProductRow[]; total: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const where: Prisma.ProductWhereInput = { ...(options.status ? { status: options.status } : {}) };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: PRODUCT_INCLUDE,
    }),
    db.product.count({ where }),
  ]);

  return { items: rows.map(toRow), total };
}

/** One listing with the detail a moderator needs to judge it. */
export async function getProductForModeration(
  productId: string
): Promise<
  AdminProductRow & {
    description: string | null;
    availabilityNote: string | null;
    variants: Array<{ name: string; value: string }>;
  }
> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: PRODUCT_INCLUDE,
  });
  if (!product) throw new NotFoundError("Product");
  return {
    ...toRow(product),
    description: product.description,
    availabilityNote: product.availabilityNote,
    variants: product.variants.map((variant) => ({ name: variant.name, value: variant.value })),
  };
}

/**
 * Approves, rejects, or archives a listing. Rejection needs a reason so the
 * seller knows what to change; everything is audited and notified.
 */
export async function moderateProduct(
  admin: AuthUser,
  productId: string,
  decision: "approve" | "reject" | "archive",
  note?: string
): Promise<AdminProductRow> {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError("Product");

  if (decision === "reject" && !note?.trim()) {
    throw new AppError(
      400,
      "REASON_REQUIRED",
      "Give the seller a reason so they know what to change."
    );
  }
  if (decision === "approve" && product.status !== "PENDING_REVIEW") {
    throw new AppError(409, "INVALID_TRANSITION", "Only listings awaiting review can be approved.");
  }
  if (decision === "archive" && product.status !== "ACTIVE") {
    throw new AppError(409, "INVALID_TRANSITION", "Only live listings can be archived.");
  }

  const nextStatus: ProductStatus =
    decision === "approve" ? "ACTIVE" : decision === "reject" ? "REJECTED" : "INACTIVE";

  const updated = await db.product.update({
    where: { id: productId },
    data: { status: nextStatus },
    include: PRODUCT_INCLUDE,
  });

  await recordAudit({
    actorId: admin.id,
    action:
      decision === "approve"
        ? ADMIN_ACTIONS.PRODUCT_APPROVED
        : decision === "reject"
          ? ADMIN_ACTIONS.PRODUCT_REJECTED
          : ADMIN_ACTIONS.PRODUCT_ARCHIVED,
    entityType: AUDIT_ENTITIES.PRODUCT,
    entityId: productId,
    note: note?.trim() ?? null,
  });

  await notify({
    userId: product.sellerId,
    type: "SYSTEM",
    title:
      decision === "approve"
        ? `${product.name} is now live`
        : decision === "reject"
          ? `${product.name} needs changes before it can go live`
          : `${product.name} is no longer visible to buyers`,
    message:
      decision === "approve"
        ? "Buyers can now find this listing and send you order requests."
        : decision === "reject"
          ? `Review the listing and resubmit it for approval.${note ? ` Reason: ${note.trim()}` : ""}`
          : `The listing was archived by an administrator.${note ? ` Note: ${note.trim()}` : ""}`,
  });

  return toRow(updated);
}

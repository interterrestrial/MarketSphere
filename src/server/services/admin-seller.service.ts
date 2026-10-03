import type { AccountStatus, Prisma, VerificationStatus } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import { AppError, NotFoundError } from "../middleware/error-handler";
import { ADMIN_ACTIONS, AUDIT_ENTITIES, recordAudit } from "./admin-core";
import { notify } from "./notification.service";

/**
 * Seller verification and account status (FR-42).
 *
 * Approving a seller completes two things at once: the business profile moves
 * to APPROVED and the account becomes ACTIVE, which is what unlocks
 * publishing (BR-02). Every decision is audited and notified to the seller.
 */

export interface AdminSellerRow {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  accountStatus: AccountStatus;
  createdAt: string;
  profile: {
    id: string;
    businessName: string;
    businessType: string;
    city: string | null;
    state: string | null;
    pincode: string | null;
    address: string | null;
    description: string | null;
    serviceArea: string | null;
    contactName: string | null;
    contactPhone: string | null;
    gstNumber: string | null;
    verificationStatus: VerificationStatus;
    reviewNote: string | null;
    reviewedAt: string | null;
    productCount: number;
  } | null;
}

const SELLER_INCLUDE = {
  businessProfile: true,
  _count: { select: { products: true } },
} satisfies Prisma.UserInclude;

type SellerRow = Prisma.UserGetPayload<{ include: typeof SELLER_INCLUDE }>;

function toRow(user: SellerRow): AdminSellerRow {
  const profile = user.businessProfile;
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    accountStatus: user.status,
    createdAt: user.createdAt.toISOString(),
    profile: profile
      ? {
          id: profile.id,
          businessName: profile.businessName,
          businessType: profile.businessType,
          city: profile.city,
          state: profile.state,
          pincode: profile.pincode,
          address: profile.address,
          description: profile.description,
          serviceArea: profile.serviceArea,
          contactName: profile.contactName,
          contactPhone: profile.contactPhone,
          gstNumber: profile.gstNumber,
          verificationStatus: profile.verificationStatus,
          reviewNote: profile.reviewNote,
          reviewedAt: profile.reviewedAt?.toISOString() ?? null,
          productCount: user._count.products,
        }
      : null,
  };
}

/** Sellers for the verification queue, filtered by verification status. */
export async function listSellersForReview(options: {
  status?: VerificationStatus;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminSellerRow[]; total: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const where: Prisma.UserWhereInput = {
    role: "SELLER",
    ...(options.status ? { businessProfile: { is: { verificationStatus: options.status } } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: SELLER_INCLUDE,
    }),
    db.user.count({ where }),
  ]);

  return { items: rows.map(toRow), total };
}

async function loadSeller(sellerId: string): Promise<SellerRow> {
  const seller = await db.user.findFirst({
    where: { id: sellerId, role: "SELLER" },
    include: SELLER_INCLUDE,
  });
  if (!seller) throw new NotFoundError("Seller");
  return seller;
}

/** Reviews a seller's business details (FR-09, FR-42). */
export async function decideSellerVerification(
  admin: AuthUser,
  sellerId: string,
  decision: "approve" | "reject",
  note?: string
): Promise<AdminSellerRow> {
  const seller = await loadSeller(sellerId);
  if (!seller.businessProfile) {
    throw new AppError(
      409,
      "PROFILE_MISSING",
      "This seller has not completed a business profile yet."
    );
  }
  if (decision === "reject" && !note?.trim()) {
    throw new AppError(
      400,
      "REASON_REQUIRED",
      "Give the seller a reason so they know what to fix."
    );
  }

  const approved = decision === "approve";
  const profile = await db.businessProfile.update({
    where: { userId: sellerId },
    data: {
      verificationStatus: approved ? "APPROVED" : "REJECTED",
      reviewNote: note?.trim() ?? null,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  // Approval also activates the account so the seller can publish (BR-02).
  const user = await db.user.update({
    where: { id: sellerId },
    data: { status: approved ? "ACTIVE" : "REJECTED" },
    include: SELLER_INCLUDE,
  });

  await recordAudit({
    actorId: admin.id,
    action: approved ? ADMIN_ACTIONS.SELLER_APPROVED : ADMIN_ACTIONS.SELLER_REJECTED,
    entityType: AUDIT_ENTITIES.SELLER,
    entityId: sellerId,
    note: note?.trim() ?? null,
  });

  await notify({
    userId: sellerId,
    type: "ACCOUNT_UPDATE",
    title: approved
      ? "Your seller account is approved"
      : "We need more information to approve your account",
    message: approved
      ? `${profile.businessName} is verified. You can publish products and buyers can send you order requests.`
      : `${profile.businessName} could not be approved yet.${note ? ` Reason: ${note.trim()}` : ""} Update your profile and resubmit for review.`,
  });

  return toRow(user);
}

/** Suspends or reinstates a seller account (FR-42). */
export async function setSellerAccountStatus(
  admin: AuthUser,
  sellerId: string,
  status: "suspend" | "reactivate",
  note?: string
): Promise<AdminSellerRow> {
  const seller = await loadSeller(sellerId);
  const suspending = status === "suspend";
  if (suspending && seller.status === "SUSPENDED") {
    throw new AppError(409, "ALREADY_SUSPENDED", "This seller is already suspended.");
  }
  if (!suspending && seller.status !== "SUSPENDED") {
    throw new AppError(409, "NOT_SUSPENDED", "This seller is not suspended.");
  }

  const user = await db.user.update({
    where: { id: sellerId },
    data: { status: suspending ? "SUSPENDED" : "ACTIVE" },
    include: SELLER_INCLUDE,
  });

  // A suspended seller's live listings leave buyer search immediately (BR-03).
  if (suspending) {
    await db.product.updateMany({
      where: { sellerId, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  await recordAudit({
    actorId: admin.id,
    action: suspending ? ADMIN_ACTIONS.SELLER_SUSPENDED : ADMIN_ACTIONS.SELLER_REACTIVATED,
    entityType: AUDIT_ENTITIES.SELLER,
    entityId: sellerId,
    note: note?.trim() ?? null,
  });

  await notify({
    userId: sellerId,
    type: "ACCOUNT_UPDATE",
    title: suspending ? "Your seller account is suspended" : "Your seller account is active again",
    message: suspending
      ? `Your listings are hidden from buyers while the account is suspended.${note ? ` Reason: ${note.trim()}` : ""}`
      : "You can publish products and respond to order requests again.",
  });

  return toRow(user);
}

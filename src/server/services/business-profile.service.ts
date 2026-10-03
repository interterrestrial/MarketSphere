import type { BusinessProfile, BusinessType, VerificationStatus } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import type {
  BusinessProfileDto,
  OnboardingStatusDto,
  ProfilePayload,
} from "../../types/business-profile";
import { AppError, NotFoundError } from "../middleware/error-handler";
import { notify } from "./notification.service";
import type {
  CreateProfileInput,
  ProfileRole,
  UpdateProfileInput,
} from "../validators/business-profile";

/** Profile + onboarding progress, as returned to the signed-in owner. */
export interface ProfileWithOnboarding {
  profile: BusinessProfile;
  onboarding: OnboardingStatus;
}

export interface OnboardingStatus {
  completed: boolean;
  percent: number;
  missingFields: string[];
}

export interface PublicBusinessProfile {
  id: string;
  businessName: string;
  businessType: BusinessType;
  description: string | null;
  city: string | null;
  state: string | null;
  serviceArea: string | null;
  verificationStatus: VerificationStatus;
  createdAt: Date;
}

/**
 * Fields that make a profile "complete" for onboarding purposes.
 * Sellers additionally describe their business and the areas they supply
 * (FR-07/FR-11); buyers need a usable delivery location (FR-14).
 */
function requiredFields(role: ProfileRole): Array<keyof BusinessProfile> {
  const common: Array<keyof BusinessProfile> = [
    "businessName",
    "businessType",
    "address",
    "city",
    "state",
    "pincode",
  ];
  return role === "SELLER" ? [...common, "description", "serviceArea"] : common;
}

function isFilled(profile: BusinessProfile, field: keyof BusinessProfile): boolean {
  const value = profile[field];
  return typeof value === "string" ? value.trim().length > 0 : value !== null;
}

/**
 * Derived onboarding completion (Design.md §9: never show fabricated
 * progress — this is computed from real profile data).
 */
export function onboardingStatus(profile: BusinessProfile, role: ProfileRole): OnboardingStatus {
  const required = requiredFields(role);
  const missingFields = required.filter((field) => !isFilled(profile, field));
  const filled = required.length - missingFields.length;
  return {
    completed: missingFields.length === 0,
    percent: Math.round((filled / required.length) * 100),
    missingFields,
  };
}

/** Returns the signed-in user's profile with onboarding progress. */
export async function getOwnProfile(user: AuthUser): Promise<ProfileWithOnboarding | null> {
  if (user.role === "ADMIN") return null;
  const profile = await db.businessProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return null;
  return { profile, onboarding: onboardingStatus(profile, user.role) };
}

async function profileForRole(user: AuthUser): Promise<ProfileWithOnboarding> {
  const profile = await getOwnProfile(user);
  if (!profile) {
    throw new NotFoundError("Business profile");
  }
  return profile;
}

/**
 * Creates the single business profile owned by this user (ER diagram §4:
 * one user owns at most one profile, enforced by the unique user_id).
 */
export async function createProfile(
  user: AuthUser,
  input: CreateProfileInput
): Promise<ProfileWithOnboarding> {
  if (user.role === "ADMIN") {
    throw new AppError(
      403,
      "ROLE_NOT_ALLOWED",
      "Administrator accounts do not have a business profile."
    );
  }
  const existing = await db.businessProfile.findUnique({ where: { userId: user.id } });
  if (existing) {
    throw new AppError(
      409,
      "PROFILE_EXISTS",
      "A business profile already exists for this account."
    );
  }
  const created = await db.businessProfile.create({
    data: {
      userId: user.id,
      businessName: input.businessName,
      businessType: input.businessType as BusinessType,
      description: input.description,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      gstNumber: input.gstNumber,
      serviceArea: input.serviceArea,
    },
  });

  await notify({
    userId: user.id,
    type: "ACCOUNT_UPDATE",
    title: "Business profile saved",
    message:
      user.role === "SELLER"
        ? `Thanks — ${created.businessName} is saved. An administrator will review your business details before you can publish products.`
        : `Thanks — ${created.businessName} is saved. You can update these details at any time.`,
  });

  return profileForRole(user);
}

/**
 * Updates the caller's own profile. Ownership is enforced by scoping the
 * lookup to `userId` — a user can never edit another account's profile.
 * Verification status is intentionally not writable here (FR-09 is an
 * administrator decision).
 */
export async function updateProfile(
  user: AuthUser,
  input: UpdateProfileInput
): Promise<ProfileWithOnboarding> {
  await profileForRole(user);
  await db.businessProfile.update({
    where: { userId: user.id },
    data: {
      ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
      ...(input.businessType !== undefined
        ? { businessType: input.businessType as BusinessType }
        : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.pincode !== undefined ? { pincode: input.pincode } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber } : {}),
      ...(input.serviceArea !== undefined ? { serviceArea: input.serviceArea } : {}),
    },
  });
  return profileForRole(user);
}

/**
 * Business-facing view of a seller's profile for other signed-in users.
 * Contact phone, GSTIN, street address, and PIN code are withheld — PRD
 * §14.2 leaves contact visibility undecided, so nothing private is exposed
 * before the inquiry/negotiation flow exists.
 */
export async function getPublicProfile(ownerId: string): Promise<PublicBusinessProfile> {
  const profile = await db.businessProfile.findUnique({ where: { userId: ownerId } });
  if (!profile) {
    throw new NotFoundError("Business profile");
  }
  return {
    id: profile.id,
    businessName: profile.businessName,
    businessType: profile.businessType,
    description: profile.description,
    city: profile.city,
    state: profile.state,
    serviceArea: profile.serviceArea,
    verificationStatus: profile.verificationStatus,
    createdAt: profile.createdAt,
  };
}

/** Serialises a profile for client components (ISO dates, no Prisma types). */
export function toProfilePayload(result: ProfileWithOnboarding | null): ProfilePayload {
  if (!result) return { profile: null, onboarding: null };
  const { profile, onboarding } = result;
  const dto: BusinessProfileDto = {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
  const status: OnboardingStatusDto = { ...onboarding };
  return { profile: dto, onboarding: status };
}

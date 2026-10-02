import type { BusinessType, VerificationStatus } from "@prisma/client";

/**
 * Client-safe business profile shape. Dates are serialised as ISO strings so
 * server components can pass the profile straight to client components.
 */
export interface BusinessProfileDto {
  id: string;
  userId: string;
  businessName: string;
  businessType: BusinessType;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  contactName: string | null;
  contactPhone: string | null;
  gstNumber: string | null;
  serviceArea: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStatusDto {
  completed: boolean;
  percent: number;
  missingFields: string[];
}

export interface ProfilePayload {
  profile: BusinessProfileDto | null;
  onboarding: OnboardingStatusDto | null;
}

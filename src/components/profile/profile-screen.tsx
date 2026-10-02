"use client";

import { useState } from "react";
import { ProfileForm, FIELD_LABELS } from "@/components/profile/profile-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { VerificationBadge } from "@/components/ui/verification-badge";
import type { ProfilePayload } from "@/types/business-profile";
import type { ProfileRole } from "@/server/validators/business-profile";

/**
 * Business profile screen shared by buyers and sellers: onboarding form when
 * no profile exists, otherwise a read-only summary with an edit toggle.
 * Onboarding progress is derived from real data (Design.md §7.8: no
 * fabricated metrics, no decorative empty charts).
 */
export function ProfileScreen({
  role,
  data,
  accountPending,
}: {
  role: ProfileRole;
  data: ProfilePayload;
  accountPending: boolean;
}) {
  const [editing, setEditing] = useState(data.profile === null);
  const { profile, onboarding } = data;

  if (!profile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-heading text-2xl text-body">Set up your business profile</h1>
        <p className="mt-2 text-sm text-secondary">
          {role === "SELLER"
            ? "Tell buyers who you are and what you supply. You can edit these details at any time."
            : "Tell sellers who you are and where orders should be delivered."}
        </p>
        <div className="mt-8">
          <ProfileForm role={role} profile={null} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-body">Business profile</h1>
        {editing ? null : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-subtle px-3 py-1.5 text-sm text-secondary hover:text-body"
          >
            Edit profile
          </button>
        )}
      </div>

      {accountPending ? (
        <p className="mt-4 rounded-md border border-warning px-3 py-2 text-sm text-warning">
          Your account is awaiting approval. You can complete your profile now; listing products
          opens once an administrator approves your account.
        </p>
      ) : null}

      <div className="mt-5 rounded-lg border border-subtle bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-heading text-lg text-body">{profile.businessName}</p>
            <p className="text-sm text-secondary">
              {profile.businessType.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VerificationBadge status={profile.verificationStatus} />
            <StatusBadge tone={onboarding?.completed ? "success" : "warning"}>
              {onboarding?.completed
                ? "Profile complete"
                : `Onboarding ${onboarding?.percent ?? 0}%`}
            </StatusBadge>
          </div>
        </div>

        {onboarding && !onboarding.completed ? (
          <p className="mt-4 text-sm text-warning">
            Still needed:{" "}
            {onboarding.missingFields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}.
          </p>
        ) : null}

        {editing ? null : (
          <dl className="mt-5 grid gap-3 text-sm">
            {profile.description ? (
              <div>
                <dt className="text-muted">Description</dt>
                <dd className="text-secondary">{profile.description}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                {role === "SELLER" ? "Business address" : "Delivery address"}
              </dt>
              <dd className="text-right text-secondary">
                {profile.address}
                <br />
                {profile.city}, {profile.state} {profile.pincode}
              </dd>
            </div>
            {role === "SELLER" && profile.serviceArea ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Service area</dt>
                <dd className="text-secondary">{profile.serviceArea}</dd>
              </div>
            ) : null}
            {profile.contactName || profile.contactPhone ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Contact</dt>
                <dd className="text-right text-secondary">
                  {profile.contactName}
                  {profile.contactPhone ? <br /> : null}
                  {profile.contactPhone}
                </dd>
              </div>
            ) : null}
            <p className="text-xs text-muted">
              Contact phone and GSTIN stay private and are never shown to other users.
            </p>
          </dl>
        )}
      </div>

      {editing ? (
        <div className="mt-8">
          <ProfileForm role={role} profile={profile} />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="mt-4 text-sm text-secondary hover:text-body"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </main>
  );
}

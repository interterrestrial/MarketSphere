"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminSellerRow } from "@/server/services/admin-seller.service";

/**
 * Seller verification review (FR-42, FR-09).
 *
 * The decision controls whether the seller can publish, so a rejection must
 * carry a reason and every action confirms before firing.
 */
export function SellerReviewCard({ seller }: { seller: AdminSellerRow }) {
  const router = useRouter();
  const [note, setNote] = useState(seller.profile?.reviewNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);

  const profile = seller.profile;

  async function run(action: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setDecision(action);
    try {
      await api(`/api/admin/sellers/${seller.userId}/${action}`, {
        method: "POST",
        body: JSON.stringify(note.trim() ? { note: note.trim() } : {}),
      });
      setMessage(
        action === "approve"
          ? "Seller approved. They can now submit listings for review."
          : action === "reject"
            ? "Seller rejected and notified with your reason."
            : action === "suspend"
              ? "Account suspended and live listings hidden."
              : "Account reactivated."
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That action could not be completed.");
      setDecision(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-subtle bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading text-base text-body">
            {profile?.businessName ?? "No business profile yet"}
          </p>
          <p className="mt-0.5 text-sm text-secondary">
            {seller.name} · {seller.email}
            {seller.phone ? ` · ${seller.phone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            tone={
              profile?.verificationStatus === "APPROVED"
                ? "success"
                : profile?.verificationStatus === "REJECTED"
                  ? "danger"
                  : profile?.verificationStatus === "PENDING"
                    ? "warning"
                    : "neutral"
            }
          >
            {profile ? profile.verificationStatus.replace(/_/g, " ").toLowerCase() : "no profile"}
          </StatusBadge>
          <StatusBadge tone={seller.accountStatus === "ACTIVE" ? "success" : "warning"}>
            {seller.accountStatus.toLowerCase()}
          </StatusBadge>
        </div>
      </div>

      {profile ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Business type</dt>
            <dd className="text-secondary">
              {profile.businessType.replace(/_/g, " ").toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">GSTIN</dt>
            <dd className="font-mono text-xs text-secondary">
              {profile.gstNumber ?? "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Address</dt>
            <dd className="text-secondary">
              {profile.address ?? "—"}
              {profile.city ? `, ${profile.city}` : ""}
              {profile.state ? `, ${profile.state}` : ""}
              {profile.pincode ? ` — ${profile.pincode}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Service area</dt>
            <dd className="text-secondary">{profile.serviceArea ?? "Not stated"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted">Description</dt>
            <dd className="text-secondary">{profile.description ?? "No description provided"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Listings</dt>
            <dd className="text-secondary">{profile.productCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Registered</dt>
            <dd className="text-secondary">
              {new Date(seller.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-warning">
          This seller has not completed a business profile, so there is nothing to verify yet.
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 text-sm text-success">
          {message}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <Field
          id={`note-${seller.userId}`}
          label="Note to the seller"
          hint="Required when rejecting. Also stored in the audit history."
        >
          <Textarea
            id={`note-${seller.userId}`}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Business registration verified against the documents provided."
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {profile?.verificationStatus !== "APPROVED" && profile ? (
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  "approve",
                  `Approve ${profile.businessName}? They will be able to publish listings.`
                )
              }
            >
              {decision === "approve" && busy ? "Working…" : "Approve seller"}
            </Button>
          ) : null}
          {profile?.verificationStatus !== "REJECTED" && profile ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void run("reject", `Reject ${profile.businessName}? The seller is notified.`)
              }
            >
              Reject seller
            </Button>
          ) : null}
          {seller.accountStatus === "SUSPENDED" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void run("reactivate", "Reactivate this seller account?")}
            >
              Reactivate account
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={busy || !profile}
              onClick={() =>
                void run("suspend", "Suspend this seller? Their listings will be hidden.")
              }
            >
              Suspend account
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

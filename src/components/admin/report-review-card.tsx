"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminReportRow } from "@/server/services/admin-report.service";

/**
 * Report review (FR-45). Every outcome needs a resolution note so the decision
 * is explainable later; the report is never deleted.
 */
export function ReportReviewCard({ report }: { report: AdminReportRow }) {
  const router = useRouter();
  const [resolution, setResolution] = useState(report.resolution ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reviewed = report.status === "RESOLVED" || report.status === "DISMISSED";

  async function run(action: "resolve" | "dismiss") {
    if (resolution.trim().length < 3) {
      setError("Record what was done so the outcome is on record.");
      return;
    }
    if (
      !window.confirm(
        action === "resolve"
          ? "Mark this report as resolved with your note?"
          : "Dismiss this report as unfounded? Your note stays on record."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/admin/reports/${report.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ resolution: resolution.trim() }),
      });
      setMessage(action === "resolve" ? "Report resolved." : "Report dismissed.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-subtle bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-body">{report.reason}</p>
          <p className="mt-1 text-xs text-muted">
            Reported by {report.reporterName} ·{" "}
            {new Date(report.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <StatusBadge
          tone={
            report.status === "OPEN"
              ? "warning"
              : report.status === "UNDER_REVIEW"
                ? "info"
                : report.status === "RESOLVED"
                  ? "success"
                  : "neutral"
          }
        >
          {report.status.replace(/_/g, " ").toLowerCase()}
        </StatusBadge>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Reported account</dt>
          <dd className="text-secondary">{report.reportedUserName ?? "Not specified"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Reported listing</dt>
          <dd className="text-secondary">{report.productName ?? "Not a listing report"}</dd>
        </div>
      </dl>

      {report.resolution ? (
        <p className="mt-3 rounded-md border border-subtle bg-background px-3 py-2 text-sm text-secondary">
          Resolution: {report.resolution}
        </p>
      ) : null}

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

      {reviewed ? null : (
        <div className="mt-4 space-y-3">
          <Field id={`resolution-${report.id}`} label="Resolution">
            <Textarea
              id={`resolution-${report.id}`}
              maxLength={1000}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Warned the seller about listing accuracy and asked for corrected details."
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void run("resolve")}>
              {busy ? "Working…" : "Mark resolved"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void run("dismiss")}>
              Dismiss report
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

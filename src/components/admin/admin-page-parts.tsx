import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import type { PlatformStats } from "@/server/services/admin-stats.service";

/** Server-rendered data for the admin screens. */
export async function requireAdminPage(nextPath: string) {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.role !== "ADMIN") redirect("/");
  if (user.status !== "ACTIVE") redirect("/");
  return user;
}

const ACTION_LABELS: Record<string, string> = {
  SELLER_APPROVED: "Approved a seller",
  SELLER_REJECTED: "Rejected a seller",
  SELLER_SUSPENDED: "Suspended a seller",
  SELLER_REACTIVATED: "Reactivated a seller",
  PRODUCT_APPROVED: "Approved a listing",
  PRODUCT_REJECTED: "Rejected a listing",
  PRODUCT_ARCHIVED: "Archived a listing",
  USER_SUSPENDED: "Suspended an account",
  USER_REACTIVATED: "Reactivated an account",
  REPORT_RESOLVED: "Resolved a report",
  REPORT_DISMISSED: "Dismissed a report",
};

export { ACTION_LABELS };

/** Small labelled count used across the admin screens (no fake metrics). */
export function Stat({
  label,
  value,
  hint,
  href,
  emphasis,
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-heading text-2xl text-body">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const className = `rounded-lg border p-4 ${
    emphasis && value > 0 ? "border-warning bg-surface" : "border-subtle bg-surface"
  }`;
  return href ? (
    <Link href={href} className={`${className} block hover:border-primary`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** One-line breakdown of a status → count map. */
export function CountBreakdown({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No records yet.</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {entries
        .sort(([, a], [, b]) => b - a)
        .map(([key, value]) => (
          <li key={key} className="flex justify-between gap-4">
            <span className="text-muted">{key.replace(/_/g, " ").toLowerCase()}</span>
            <span className="text-body">{value}</span>
          </li>
        ))}
    </ul>
  );
}

export type { PlatformStats };

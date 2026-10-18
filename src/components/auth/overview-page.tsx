import { headers } from "next/headers";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { currentUser } from "@/app/api/auth/_helpers";
import { getOwnProfile } from "@/server/services/business-profile.service";
import type { ProfileRole } from "@/server/validators/business-profile";

/**
 * Role overview (Design.md §7.3, §7.8). Shows the account summary plus an
 * onboarding prompt driven by real profile data — empty states always offer a
 * next action instead of decorative placeholders.
 */
export async function OverviewPage({
  role,
  profileHref,
  comingSoon,
}: {
  role: ProfileRole;
  profileHref: string;
  comingSoon: string;
}) {
  const user = await currentUser((await headers()).get("cookie"));
  const result = user ? await getOwnProfile(user) : null;
  const onboarding = result?.onboarding ?? null;
  const hasProfile = Boolean(result?.profile);

  return (
    <PageShell
      title={role === "SELLER" ? "Seller overview" : "Buyer overview"}
      description={
        hasProfile
          ? comingSoon
          : "Complete your business profile to unlock the parts of MarketSphere that need one."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={user?.status === "ACTIVE" ? "success" : "warning"}>
            {user?.status === "ACTIVE" ? "Account active" : "Account awaiting approval"}
          </StatusBadge>
          {onboarding ? (
            <StatusBadge tone={onboarding.completed ? "success" : "warning"}>
              {onboarding.completed
                ? "Business profile complete"
                : `Business profile ${onboarding.percent}% complete`}
            </StatusBadge>
          ) : (
            <StatusBadge tone="warning">No business profile yet</StatusBadge>
          )}
        </div>
      }
    >
      <section className="rounded-lg border border-subtle bg-surface p-5 shadow-panel">
        <h2 className="font-heading text-base text-body">Account</h2>
        <dl className="mt-3 grid max-w-lg gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd className="text-body">{user?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="text-body">{user?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Account type</dt>
            <dd className="text-body">{user?.role}</dd>
          </div>
        </dl>
        <Link href={profileHref} className="mt-4 inline-block text-sm text-primary hover:underline">
          {onboarding?.completed ? "Manage business profile" : "Complete business profile"}
        </Link>
      </section>

      {onboarding && !onboarding.completed ? (
        <p className="mt-4 text-sm text-warning">
          Still needed: {onboarding.missingFields.length} more detail
          {onboarding.missingFields.length === 1 ? "" : "s"} on your business profile before it is
          complete.
        </p>
      ) : null}

      <p className="mt-6 max-w-lg text-sm text-secondary">{comingSoon}</p>
    </PageShell>
  );
}

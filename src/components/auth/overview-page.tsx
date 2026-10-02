import { headers } from "next/headers";
import Link from "next/link";
import { AccountCard } from "@/components/auth/account-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { currentUser } from "@/app/api/auth/_helpers";
import { getOwnProfile } from "@/server/services/business-profile.service";
import type { ProfileRole } from "@/server/validators/business-profile";

/**
 * Role overview. Shows the account summary plus an onboarding prompt driven
 * by real profile data — empty states always offer a next action instead of
 * decorative placeholders (Design.md §7.3, §7.8).
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

  return (
    <>
      <AccountCard title={role === "SELLER" ? "Seller overview" : "Buyer overview"}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={user?.status === "ACTIVE" ? "success" : "warning"}>
            {user?.status === "ACTIVE" ? "Account active" : "Account awaiting approval"}
          </StatusBadge>
          {onboarding ? (
            <StatusBadge tone={onboarding.completed ? "success" : "warning"}>
              {onboarding.completed
                ? "Business profile complete"
                : `Business profile ${onboarding.percent}% complete`}
            </StatusBadge>
          ) : null}
        </div>
        <p className="mt-4">
          <Link href={profileHref} className="text-primary">
            {onboarding?.completed ? "Manage business profile" : "Complete business profile"}
          </Link>
        </p>
        <p className="mt-4 text-muted">{comingSoon}</p>
      </AccountCard>
    </>
  );
}

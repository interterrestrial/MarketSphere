import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { currentUser } from "@/app/api/auth/_helpers";
import { getOwnProfile, toProfilePayload } from "@/server/services/business-profile.service";
import type { ProfileRole } from "@/server/validators/business-profile";

/**
 * Shared implementation for the buyer and seller profile pages so both
 * roles get identical onboarding and editing behaviour.
 */
export async function ProfilePage({ role }: { role: ProfileRole }) {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) {
    redirect(`/login?next=${role === "SELLER" ? "/seller/profile" : "/buyer/profile"}`);
  }
  if (user.role !== role) {
    redirect("/");
  }

  const data = toProfilePayload(await getOwnProfile(user));

  return <ProfileScreen role={role} data={data} accountPending={user.status === "PENDING"} />;
}

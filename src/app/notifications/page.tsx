import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationList } from "@/components/notifications/notification-list";
import { listNotifications } from "@/server/services/notification.service";
import { PageShell } from "@/components/layout/page-shell";

/** Notification centre for buyers and sellers (FR-40). */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect("/login?next=%2Fnotifications");
  if (user.role === "ADMIN") redirect("/");

  const params = await searchParams;
  const unreadOnly = params.filter === "unread";
  const { items, unread } = await listNotifications(user, {
    pageSize: 50,
    unreadOnly,
  });

  const viewerRole = user.role === "SELLER" ? "SELLER" : "BUYER";

  return (
    <PageShell
      width="narrow"
      title="Notifications"
      description={unread > 0 ? `${unread} unread` : "You are all caught up"}
      actions={
        <>
          <Link
            href={unreadOnly ? "/notifications" : "/notifications?filter=unread"}
            className="rounded-md border border-subtle bg-surface px-3 py-1.5 text-sm text-secondary hover:border-primary hover:text-body"
          >
            {unreadOnly ? "Show all" : "Show unread"}
          </Link>
          {unread > 0 ? <MarkAllReadButton /> : null}
        </>
      }
    >
      <NotificationList initialItems={items} viewerRole={viewerRole} unreadOnly={unreadOnly} />
    </PageShell>
  );
}

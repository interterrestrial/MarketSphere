import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationList } from "@/components/notifications/notification-list";
import { listNotifications } from "@/server/services/notification.service";

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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-body">Notifications</h1>
          <p className="mt-1 text-sm text-secondary">
            {unread > 0 ? `${unread} unread` : "You are all caught up"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={unreadOnly ? "/notifications" : "/notifications?filter=unread"}
            className="rounded-md border border-subtle px-3 py-1.5 text-sm text-secondary hover:text-body"
          >
            {unreadOnly ? "Show all" : "Show unread"}
          </Link>
          {unread > 0 ? <MarkAllReadButton /> : null}
        </div>
      </div>

      <div className="mt-6">
        <NotificationList initialItems={items} viewerRole={viewerRole} unreadOnly={unreadOnly} />
      </div>
    </main>
  );
}

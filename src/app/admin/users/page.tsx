import Link from "next/link";
import type { AccountStatus, UserRole } from "@prisma/client";
import { requireAdminPage } from "@/components/admin/admin-page-parts";
import { UserBadges, UserStatusActions } from "@/components/admin/user-status-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { listUsers } from "@/server/services/admin-user.service";

const ROLE_FILTERS: Array<{ value?: UserRole; label: string }> = [
  { label: "All roles" },
  { value: "SELLER", label: "Sellers" },
  { value: "BUYER", label: "Buyers" },
  { value: "ADMIN", label: "Admins" },
];

const STATUS_FILTERS: Array<{ value?: AccountStatus; label: string }> = [
  { label: "Any status" },
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
];

/** User management (FR-43): review accounts, suspend, reactivate. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/users");
  const params = await searchParams;
  const role = typeof params.role === "string" ? (params.role as UserRole) : undefined;
  const status = typeof params.status === "string" ? (params.status as AccountStatus) : undefined;

  const { items, total } = await listUsers({ role, status, pageSize: 100 });

  function href(next: { role?: UserRole; status?: AccountStatus }) {
    const search = new URLSearchParams();
    const nextRole = next.role ?? role;
    const nextStatus = next.status ?? status;
    if (nextRole) search.set("role", nextRole);
    if (nextStatus) search.set("status", nextStatus);
    const query = search.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl text-body">User management</h1>
      <p className="mt-1 text-sm text-secondary">
        Suspension takes effect immediately, including for a signed-in user, and hides a
        seller&apos;s live listings.
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((filter) => (
            <Link
              key={filter.label}
              href={href({ role: filter.value })}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                role === filter.value
                  ? "border-primary text-body"
                  : "border-subtle text-secondary hover:text-body"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.label}
              href={href({ status: filter.value })}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                status === filter.value
                  ? "border-primary text-body"
                  : "border-subtle text-secondary hover:text-body"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        {total} account{total === 1 ? "" : "s"}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No accounts match"
            description="Try a different role or status filter."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-subtle bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="text-body">{user.businessName ?? user.name}</p>
                <p className="mt-0.5 text-sm text-secondary">
                  {user.name} · {user.email}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {user.role === "SELLER"
                    ? `${user.productCount} listing${user.productCount === 1 ? "" : "s"}`
                    : user.role === "BUYER"
                      ? `${user.requestCount} order request${user.requestCount === 1 ? "" : "s"}`
                      : "Platform operator"}
                  {" · joined "}
                  {new Date(user.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <UserBadges user={user} />
                <UserStatusActions user={user} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

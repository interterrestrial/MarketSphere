import { headers } from "next/headers";
import { currentUser } from "@/app/api/auth/_helpers";
import type { AuthUser } from "@/types/auth";

/**
 * Small server-rendered account card shared by the role overview pages.
 * Reads the session server-side, so no client JS is needed to show it.
 */
export async function AccountCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const user: AuthUser | null = await currentUser((await headers()).get("cookie"));

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-heading text-2xl text-body">{title}</h1>
      {user ? (
        <dl className="mt-6 grid max-w-lg gap-3 rounded-lg border border-subtle bg-surface p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd className="text-body">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="text-body">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Account type</dt>
            <dd className="text-body">{user.role}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Status</dt>
            <dd className="text-success">{user.status}</dd>
          </div>
        </dl>
      ) : null}
      <div className="mt-6 max-w-lg text-sm text-secondary">{children}</div>
    </main>
  );
}

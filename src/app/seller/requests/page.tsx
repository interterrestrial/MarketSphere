import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { RequestStatus } from "@prisma/client";
import { currentUser } from "@/app/api/auth/_helpers";
import { OrderDashboard } from "@/components/orders/order-dashboard";
import { listOrderRequests } from "@/server/services/order.service";
import { PageShell } from "@/components/layout/page-shell";

/** Seller incoming request dashboard (Design.md §7.8). */
export default async function SellerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect("/login?next=%2Fseller%2Frequests");
  if (user.role !== "SELLER") redirect("/");

  const params = await searchParams;
  const status = typeof params.status === "string" ? (params.status as RequestStatus) : undefined;

  const { items, counts } = await listOrderRequests(user, { status, pageSize: 50 });

  return (
    <PageShell
      title="Incoming order requests"
      description={
        <>
          Review each request and respond with your terms. A request becomes an order only once you
          accept it, or the buyer accepts terms you proposed.
        </>
      }
    >
      <OrderDashboard
        items={items}
        counts={counts}
        viewerRole="SELLER"
        basePath="/seller/requests"
      />
    </PageShell>
  );
}

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { OrderRequestDetail } from "@/components/orders/order-request-detail";
import { AppError } from "@/server/middleware/error-handler";
import { getOrderRequest } from "@/server/services/order.service";

/** Seller view of an incoming request, with the response interface. */
export default async function SellerRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect(`/login?next=${encodeURIComponent(`/seller/requests/${id}`)}`);
  if (user.role !== "SELLER") redirect("/");

  try {
    const order = await getOrderRequest(user, id);
    return <OrderRequestDetail order={order} user={user} basePath="/seller/requests" />;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
}

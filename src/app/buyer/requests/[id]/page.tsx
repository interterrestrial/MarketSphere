import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/app/api/auth/_helpers";
import { OrderRequestDetail } from "@/components/orders/order-request-detail";
import { AppError } from "@/server/middleware/error-handler";
import { getOrderRequest } from "@/server/services/order.service";

/** Buyer view of one request, including proposed terms and status history. */
export default async function BuyerRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser((await headers()).get("cookie"));
  if (!user) redirect(`/login?next=${encodeURIComponent(`/buyer/requests/${id}`)}`);
  if (user.role !== "BUYER") redirect("/");

  try {
    const order = await getOrderRequest(user, id);
    return <OrderRequestDetail order={order} user={user} basePath="/buyer/requests" />;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  }
}

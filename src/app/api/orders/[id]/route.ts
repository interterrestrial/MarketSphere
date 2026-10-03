import { NextResponse } from "next/server";
import { getOrderRequest } from "@/server/services/order.service";
import {
  orderResponse,
  requireParty,
  sessionUser,
  toErrorResponse,
} from "@/app/api/orders/_helpers";

/** GET /api/orders/[id] — full request with items and status history. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await sessionUser();
  const denied = requireParty(user);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    return orderResponse(await getOrderRequest(user!, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { rejectOrderRequest } from "@/server/services/order-seller.service";
import { reasonSchema } from "@/server/validators/order";
import {
  orderResponse,
  requireParty,
  sessionUser,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/orders/_helpers";

/** POST /api/orders/[id]/reject — seller declines the request (FR-32). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await sessionUser();
  const denied = requireParty(user);
  if (denied) return denied;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = reasonSchema.safeParse(body);
  if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
  const { id } = await context.params;
  try {
    return orderResponse(await rejectOrderRequest(user!, id, parsed.data.note));
  } catch (error) {
    return toErrorResponse(error);
  }
}

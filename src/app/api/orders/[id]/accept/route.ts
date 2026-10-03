import { NextResponse } from "next/server";
import { acceptOrderRequest } from "@/server/services/order-seller.service";
import { acceptOrderSchema } from "@/server/validators/order";
import {
  orderResponse,
  requireParty,
  sessionUser,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/orders/_helpers";

/** POST /api/orders/[id]/accept — seller confirms a final price per line (FR-31). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await sessionUser();
  const denied = requireParty(user);
  if (denied) return denied;
  const parsed = acceptOrderSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
  const { id } = await context.params;
  try {
    return orderResponse(await acceptOrderRequest(user!, id, parsed.data));
  } catch (error) {
    return toErrorResponse(error);
  }
}

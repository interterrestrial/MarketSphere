import { NextResponse } from "next/server";
import { proposeOrderChanges } from "@/server/services/order-seller.service";
import { proposeChangesSchema } from "@/server/validators/order";
import {
  orderResponse,
  requireParty,
  sessionUser,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/orders/_helpers";

/** POST /api/orders/[id]/propose — seller counters with new quantities/prices (FR-33). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await sessionUser();
  const denied = requireParty(user);
  if (denied) return denied;
  const parsed = proposeChangesSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
  const { id } = await context.params;
  try {
    return orderResponse(await proposeOrderChanges(user!, id, parsed.data));
  } catch (error) {
    return toErrorResponse(error);
  }
}

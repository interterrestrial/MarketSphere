import { NextResponse } from "next/server";
import { sendProposalToBuyer } from "@/server/services/order-seller.service";
import { reasonSchema } from "@/server/validators/order";
import {
  orderResponse,
  requireParty,
  sessionUser,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/orders/_helpers";

/** POST /api/orders/[id]/send-proposal — Sends the drafted proposal to the buyer for a decision. */
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
    return orderResponse(await sendProposalToBuyer(user!, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

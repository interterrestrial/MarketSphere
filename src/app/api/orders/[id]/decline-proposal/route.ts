import { NextResponse } from "next/server";
import { declineProposal } from "@/server/services/order-buyer.service";
import { reasonSchema } from "@/server/validators/order";
import {
  orderResponse,
  requireParty,
  sessionUser,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/orders/_helpers";

/** POST /api/orders/[id]/decline-proposal — Buyer declines the seller's proposed terms (FR-34). */
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
  const note = parsed.data.note;

  const { id } = await context.params;
  try {
    return orderResponse(await declineProposal(user!, id, note));
  } catch (error) {
    return toErrorResponse(error);
  }
}

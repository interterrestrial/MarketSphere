import { NextResponse } from "next/server";
import { ok } from "@/lib/api-response";
import { markRead } from "@/server/services/notification.service";
import { sessionUser, toErrorResponse, unauthorized } from "../../_helpers";

/** POST /api/notifications/[id]/read — mark one notification as read. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await sessionUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  try {
    return NextResponse.json(ok(await markRead(user, id)), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

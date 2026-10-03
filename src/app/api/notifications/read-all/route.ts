import { NextResponse } from "next/server";
import { ok } from "@/lib/api-response";
import { markAllRead } from "@/server/services/notification.service";
import { sessionUser, toErrorResponse, unauthorized } from "../_helpers";

/** POST /api/notifications/read-all — mark every notification as read. */
export async function POST(): Promise<NextResponse> {
  const user = await sessionUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(ok(await markAllRead(user)), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

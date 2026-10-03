import { NextResponse } from "next/server";
import { ok } from "@/lib/api-response";
import { unreadCount } from "@/server/services/notification.service";
import { sessionUser, unauthorized } from "../_helpers";

/** GET /api/notifications/unread-count — badge count for the header. */
export async function GET(): Promise<NextResponse> {
  const user = await sessionUser();
  if (!user) return unauthorized();
  return NextResponse.json(ok({ unread: await unreadCount(user.id) }), { status: 200 });
}

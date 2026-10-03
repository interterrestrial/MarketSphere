import { NextResponse } from "next/server";
import { paginated } from "@/lib/api-response";
import { notificationListQuerySchema } from "@/server/validators/notification";
import { listNotifications, sessionUser, toErrorResponse, unauthorized } from "./_helpers";

/** GET /api/notifications — own notifications, newest first (FR-40). */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await sessionUser();
  if (!user) return unauthorized();
  try {
    const parsed = notificationListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid notification filters." },
        },
        { status: 400 }
      );
    }
    const result = await listNotifications(user, {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      unreadOnly: parsed.data.unreadOnly,
    });
    const paged = paginated(result.items, result.page, result.pageSize, result.total);
    return NextResponse.json(
      { ...paged, meta: { ...paged.meta, unread: result.unread, totalPages: result.totalPages } },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

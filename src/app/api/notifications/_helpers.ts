import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/server/middleware/error-handler";
import type { AuthUser } from "@/types/auth";
import { currentUser } from "@/app/api/auth/_helpers";
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "@/server/services/notification.service";

/** Shared guards for the same-origin notification endpoints. */

export async function sessionUser(): Promise<AuthUser | null> {
  return currentUser((await headers()).get("cookie"));
}

export function unauthorized() {
  return NextResponse.json(fail("UNAUTHENTICATED", "Sign in to view your notifications."), {
    status: 401,
  });
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(fail(error.code, error.message, error.details), {
      status: error.statusCode,
    });
  }
  return NextResponse.json(fail("INTERNAL_ERROR", "An unexpected error occurred."), {
    status: 500,
  });
}

export { listNotifications, markAllRead, markRead, ok, unreadCount };

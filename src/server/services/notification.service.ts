import type { Notification, NotificationType, Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import { NotFoundError } from "../middleware/error-handler";
import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationDto,
  type NotificationListDto,
} from "../../types/notification";

/**
 * In-app notifications (FR-39, FR-40).
 *
 * - Every query is scoped to the signed-in user's id, so one account can never
 *   read or mark another account's notifications.
 * - Notifications are written by the workflow services, never by clients.
 * - A notification carries an optional `orderRequestId` so the UI can link
 *   straight to the related request.
 */

type NotificationRow = Notification & {
  orderRequest?: { reference: string } | null;
};

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderRequestId?: string | null;
}

/** Creates one notification. Never throws into the caller's transaction path. */
export async function notify(input: NotifyInput): Promise<Notification | null> {
  try {
    return await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        orderRequestId: input.orderRequestId ?? null,
      },
    });
  } catch (error) {
    // A failed notice must not roll back the business action that caused it.
    console.error(
      `[notifications] could not create "${input.title}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}

function toDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    typeLabel: NOTIFICATION_TYPE_LABELS[row.type],
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    orderRequestId: row.orderRequestId,
    orderReference: row.orderRequest?.reference ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Newest-first notification list for the signed-in user. */
export async function listNotifications(
  user: AuthUser,
  options: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}
): Promise<NotificationListDto> {
  const page = options.page ?? 1;
  const pageSize = Math.min(options.pageSize ?? 20, 100);
  const where: Prisma.NotificationWhereInput = {
    userId: user.id,
    ...(options.unreadOnly ? { isRead: false } : {}),
  };

  const [rows, total, unread] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { orderRequest: { select: { reference: true } } },
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return {
    items: rows.map(toDto),
    total,
    unread,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Unread count for the header indicator. */
export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, isRead: false } });
}

/**
 * Marks one notification as read. Scoped by both id and user, so another
 * account's notification id simply does not match.
 */
export async function markRead(user: AuthUser, notificationId: string): Promise<NotificationDto> {
  const updated = await db.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
  if (updated.count === 0) {
    throw new NotFoundError("Notification");
  }
  const row = await db.notification.findUnique({
    where: { id: notificationId },
    include: { orderRequest: { select: { reference: true } } },
  });
  if (!row) throw new NotFoundError("Notification");
  return toDto(row);
}

/** Marks every unread notification for the user as read. */
export async function markAllRead(user: AuthUser): Promise<{ updated: number; unread: number }> {
  const result = await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count, unread: 0 };
}

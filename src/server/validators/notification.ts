import { z } from "zod";

/** Notification list query: paging plus an unread-only filter (FR-40). */
export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

import { Router, type Request, type Response } from "express";
import { ok, paginated } from "../../lib/api-response";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/require-auth";
import { validate } from "../middleware/validate";
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "../services/notification.service";
import { notificationListQuerySchema } from "../validators/notification";
import { uuidParam } from "../validators/common";

export const notificationRouter = Router();

// Notifications are private to their owner (BR-01, PRD §9.2).
notificationRouter.use(authenticate);

/** GET /api/v1/notifications — own notifications, newest first (FR-40). */
notificationRouter.get(
  "/",
  validate({ query: notificationListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, unreadOnly } = req.query as unknown as {
      page: number;
      pageSize: number;
      unreadOnly: boolean;
    };
    const result = await listNotifications(req.user!, { page, pageSize, unreadOnly });
    const paged = paginated(result.items, result.page, result.pageSize, result.total);
    res.status(200).json({
      ...paged,
      meta: { ...paged.meta, unread: result.unread, totalPages: result.totalPages },
    });
  })
);

/** GET /api/v1/notifications/unread-count — badge count for the header. */
notificationRouter.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json(ok({ unread: await unreadCount(req.user!.id) }));
  })
);

/** POST /api/v1/notifications/:id/read — mark one as read. */
notificationRouter.post(
  "/:id/read",
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await markRead(req.user!, id)));
  })
);

/** POST /api/v1/notifications/read-all — clear the unread badge. */
notificationRouter.post(
  "/read-all",
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json(ok(await markAllRead(req.user!)));
  })
);

import { Router, type Request, type Response } from "express";
import type {
  AccountStatus,
  ProductStatus,
  ReportStatus,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import { ok, paginated } from "../../lib/api-response";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/require-auth";
import { validate } from "../middleware/validate";
import { listAuditEntries } from "../services/admin-core";
import {
  moderateProduct,
  getProductForModeration,
  listProductsForModeration,
} from "../services/admin-product.service";
import { resolveReport, listReports } from "../services/admin-report.service";
import {
  decideSellerVerification,
  listSellersForReview,
  setSellerAccountStatus,
} from "../services/admin-seller.service";
import { getPlatformStats } from "../services/admin-stats.service";
import { listUsers, setUserAccountStatus } from "../services/admin-user.service";
import {
  auditListQuerySchema,
  decisionNoteSchema,
  productModerationQuerySchema,
  reportListQuerySchema,
  resolutionSchema,
  sellerReviewQuerySchema,
  userListQuerySchema,
} from "../validators/admin";
import { uuidParam } from "../validators/common";

export const adminRouter = Router();

/**
 * Administrative surface. Authorization is enforced here in the backend:
 * a signed-in non-admin receives 403 even if it reaches these paths, and
 * `requireAdmin` re-checks inside every service call.
 */
adminRouter.use(authenticate, requireRole("ADMIN"));

/** GET /api/v1/admin/stats — platform statistics (FR-41). */
adminRouter.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json(ok(await getPlatformStats()));
  })
);

/** GET /api/v1/admin/sellers — seller verification queue (FR-42). */
adminRouter.get(
  "/sellers",
  validate({ query: sellerReviewQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, pageSize } = req.query as unknown as {
      status?: VerificationStatus;
      page: number;
      pageSize: number;
    };
    const { items, total } = await listSellersForReview({ status, page, pageSize });
    res.status(200).json(paginated(items, page, pageSize, total));
  })
);

/** POST /api/v1/admin/sellers/:id/approve — approve a seller (FR-09). */
adminRouter.post(
  "/sellers/:id/approve",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res
      .status(200)
      .json(ok(await decideSellerVerification(req.user!, id, "approve", req.body.note)));
  })
);

/** POST /api/v1/admin/sellers/:id/reject — reject with a reason (FR-09). */
adminRouter.post(
  "/sellers/:id/reject",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res
      .status(200)
      .json(ok(await decideSellerVerification(req.user!, id, "reject", req.body.note)));
  })
);

/** POST /api/v1/admin/sellers/:id/suspend | /reactivate */
adminRouter.post(
  "/sellers/:id/suspend",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await setSellerAccountStatus(req.user!, id, "suspend", req.body.note)));
  })
);

adminRouter.post(
  "/sellers/:id/reactivate",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res
      .status(200)
      .json(ok(await setSellerAccountStatus(req.user!, id, "reactivate", req.body.note)));
  })
);

/** GET /api/v1/admin/users — account list (FR-43). */
adminRouter.get(
  "/users",
  validate({ query: userListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { role, status, page, pageSize } = req.query as unknown as {
      role?: UserRole;
      status?: AccountStatus;
      page: number;
      pageSize: number;
    };
    const { items, total } = await listUsers({ role, status, page, pageSize });
    res.status(200).json(paginated(items, page, pageSize, total));
  })
);

/** POST /api/v1/admin/users/:id/suspend | /reactivate */
adminRouter.post(
  "/users/:id/suspend",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await setUserAccountStatus(req.user!, id, "suspend", req.body.note)));
  })
);

adminRouter.post(
  "/users/:id/reactivate",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res
      .status(200)
      .json(ok(await setUserAccountStatus(req.user!, id, "reactivate", req.body.note)));
  })
);

/** GET /api/v1/admin/products — moderation queue (FR-44). */
adminRouter.get(
  "/products",
  validate({ query: productModerationQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, pageSize } = req.query as unknown as {
      status?: ProductStatus;
      page: number;
      pageSize: number;
    };
    const { items, total } = await listProductsForModeration({ status, page, pageSize });
    res.status(200).json(paginated(items, page, pageSize, total));
  })
);

/** GET /api/v1/admin/products/:id — listing detail for review. */
adminRouter.get(
  "/products/:id",
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await getProductForModeration(id)));
  })
);

/** POST /api/v1/admin/products/:id/approve | /reject | /archive */
adminRouter.post(
  "/products/:id/approve",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await moderateProduct(req.user!, id, "approve", req.body.note)));
  })
);

adminRouter.post(
  "/products/:id/reject",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await moderateProduct(req.user!, id, "reject", req.body.note)));
  })
);

adminRouter.post(
  "/products/:id/archive",
  validate({ params: uuidParam("id"), body: decisionNoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await moderateProduct(req.user!, id, "archive", req.body.note)));
  })
);

/** GET /api/v1/admin/reports — report queue (FR-45). */
adminRouter.get(
  "/reports",
  validate({ query: reportListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, pageSize } = req.query as unknown as {
      status?: ReportStatus;
      page: number;
      pageSize: number;
    };
    const { items, total } = await listReports({ status, page, pageSize });
    res.status(200).json(paginated(items, page, pageSize, total));
  })
);

/** POST /api/v1/admin/reports/:id/resolve | /dismiss */
adminRouter.post(
  "/reports/:id/resolve",
  validate({ params: uuidParam("id"), body: resolutionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await resolveReport(req.user!, id, "resolve", req.body.resolution)));
  })
);

adminRouter.post(
  "/reports/:id/dismiss",
  validate({ params: uuidParam("id"), body: resolutionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await resolveReport(req.user!, id, "dismiss", req.body.resolution)));
  })
);

/** GET /api/v1/admin/audit — administrative decision history (FR-46). */
adminRouter.get(
  "/audit",
  validate({ query: auditListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const { items, total } = await listAuditEntries({ page, pageSize });
    res.status(200).json(paginated(items, page, pageSize, total));
  })
);

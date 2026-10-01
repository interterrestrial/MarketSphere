import { Router, type Request, type Response } from "express";
import { db } from "../../lib/db";
import { fail, ok } from "../../lib/api-response";
import { asyncHandler } from "../middleware/error-handler";

export const healthRouter = Router();

/**
 * GET /api/health — infrastructure health probe (unversioned on purpose:
 * load balancers and monitors must not depend on an API version).
 * 200 when the database is reachable, 503 otherwise.
 */
healthRouter.get(
  "/health",
  asyncHandler(async (_req: Request, res: Response) => {
    let database: "connected" | "disconnected" = "disconnected";
    try {
      await db.$queryRaw`SELECT 1`;
      database = "connected";
    } catch {
      database = "disconnected";
    }

    if (database === "connected") {
      res.status(200).json(
        ok({
          status: "ok",
          database,
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
        })
      );
    } else {
      res
        .status(503)
        .json(fail("DATABASE_UNAVAILABLE", "The API cannot reach the database.", { database }));
    }
  })
);

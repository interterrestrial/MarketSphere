import { Router, type Request, type Response } from "express";
import type { RequestStatus } from "@prisma/client";
import { ok, paginated } from "../../lib/api-response";
import { AppError, asyncHandler } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/require-auth";
import { validate } from "../middleware/validate";
import {
  acceptProposal,
  cancelOrderRequest,
  declineProposal,
} from "../services/order-buyer.service";
import {
  acceptOrderRequest,
  completeOrderRequest,
  proposeOrderChanges,
  rejectOrderRequest,
  sendProposalToBuyer,
} from "../services/order-seller.service";
import { getOrderRequest, listOrderRequests, submitOrderRequest } from "../services/order.service";
import {
  acceptOrderSchema,
  orderListQuerySchema,
  proposeChangesSchema,
  reasonSchema,
  submitOrderSchema,
} from "../validators/order";
import { uuidParam } from "../validators/common";

export const orderRouter = Router();

// Buyers and sellers only; administrators get no order actions in the MVP.
orderRouter.use(authenticate, requireRole("BUYER", "SELLER"));

/** GET /api/v1/orders — requests where the caller is buyer or seller. */
orderRouter.get(
  "/",
  validate({ query: orderListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, pageSize } = req.query as unknown as {
      status?: RequestStatus;
      page: number;
      pageSize: number;
    };
    const { items, total, counts } = await listOrderRequests(req.user!, {
      status,
      page,
      pageSize,
    });
    const paged = paginated(items, page, pageSize, total);
    res.status(200).json({ ...paged, meta: { ...paged.meta, counts } });
  })
);

/** POST /api/v1/orders — buyer submits a request (FR-28). */
orderRouter.post(
  "/",
  validate({ body: submitOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== "BUYER") {
      throw new AppError(403, "ROLE_FORBIDDEN", "Only buyer accounts can submit order requests.");
    }
    res.status(201).json(ok(await submitOrderRequest(req.user!, req.body)));
  })
);

/** GET /api/v1/orders/:id — full request with items and status history. */
orderRouter.get(
  "/:id",
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await getOrderRequest(req.user!, id)));
  })
);

/** POST /api/v1/orders/:id/accept — seller confirms final terms (FR-31). */
orderRouter.post(
  "/:id/accept",
  validate({ params: uuidParam("id"), body: acceptOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await acceptOrderRequest(req.user!, id, req.body)));
  })
);

/** POST /api/v1/orders/:id/reject — seller declines the request (FR-32). */
orderRouter.post(
  "/:id/reject",
  validate({ params: uuidParam("id"), body: reasonSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await rejectOrderRequest(req.user!, id, req.body.note)));
  })
);

/** POST /api/v1/orders/:id/propose — seller counters with new terms (FR-33). */
orderRouter.post(
  "/:id/propose",
  validate({ params: uuidParam("id"), body: proposeChangesSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await proposeOrderChanges(req.user!, id, req.body)));
  })
);

/** POST /api/v1/orders/:id/send-proposal — buyer is asked to respond. */
orderRouter.post(
  "/:id/send-proposal",
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await sendProposalToBuyer(req.user!, id)));
  })
);

/** POST /api/v1/orders/:id/accept-proposal — buyer accepts terms (FR-34). */
orderRouter.post(
  "/:id/accept-proposal",
  validate({ params: uuidParam("id"), body: reasonSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await acceptProposal(req.user!, id, req.body.note)));
  })
);

/** POST /api/v1/orders/:id/decline-proposal — buyer declines terms (FR-34). */
orderRouter.post(
  "/:id/decline-proposal",
  validate({ params: uuidParam("id"), body: reasonSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await declineProposal(req.user!, id, req.body.note)));
  })
);

/** POST /api/v1/orders/:id/cancel — buyer withdraws a request (FR-37). */
orderRouter.post(
  "/:id/cancel",
  validate({ params: uuidParam("id"), body: reasonSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await cancelOrderRequest(req.user!, id, req.body.note)));
  })
);

/** POST /api/v1/orders/:id/complete — seller marks fulfillment done. */
orderRouter.post(
  "/:id/complete",
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await completeOrderRequest(req.user!, id)));
  })
);

import { NextResponse } from "next/server";
import type { RequestStatus } from "@prisma/client";
import { listOrderRequests, submitOrderRequest } from "@/server/services/order.service";
import { orderListQuerySchema, submitOrderSchema } from "@/server/validators/order";
import {
  orderResponse,
  paginated,
  requireBuyer,
  requireParty,
  sessionUser,
  toErrorResponse,
  unauthorized,
  validationError,
  zodFieldDetails,
} from "./_helpers";

/** GET /api/orders — requests where the caller is the buyer or the seller. */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await sessionUser();
  const denied = requireParty(user);
  if (denied) return denied;

  const parsed = orderListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) return validationError(zodFieldDetails(parsed.error));

  const { items, total, counts } = await listOrderRequests(user!, {
    status: parsed.data.status as RequestStatus | undefined,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
  const paged = paginated(items, parsed.data.page, parsed.data.pageSize, total);
  return NextResponse.json({ ...paged, meta: { ...paged.meta, counts } }, { status: 200 });
}

/** POST /api/orders — buyer submits an order request (FR-28). */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    if (!user) return unauthorized();
    const denied = requireBuyer(user);
    if (denied) return denied;
    const parsed = submitOrderSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
    return orderResponse(await submitOrderRequest(user!, parsed.data), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

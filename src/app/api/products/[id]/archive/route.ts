import { NextResponse } from "next/server";
import { archiveProduct } from "@/server/services/product.service";
import { requireSeller, sessionUser, success, toErrorResponse } from "@/app/api/products/_helpers";

/** POST /api/products/[id]/archive — hide a listing from buyer search, keeping history. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireSeller(user);
    if (denied) return denied;
    const { id } = await context.params;
    return success(await archiveProduct(user!, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { removeProductImage } from "@/server/services/product.service";
import { requireSeller, sessionUser, success, toErrorResponse } from "@/app/api/products/_helpers";

/** DELETE /api/products/[id]/images/[imageId] */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> }
): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireSeller(user);
    if (denied) return denied;
    const { id, imageId } = await context.params;
    return success(await removeProductImage(user!, id, imageId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

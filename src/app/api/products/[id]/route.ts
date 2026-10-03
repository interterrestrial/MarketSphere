import { NextResponse } from "next/server";
import { deleteProduct } from "@/server/services/product.service";
import { requireSeller, sessionUser, success, toErrorResponse } from "@/app/api/products/_helpers";

/** DELETE /api/products/[id] — deletes drafts only; published ones must be archived. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireSeller(user);
    if (denied) return denied;
    const { id } = await context.params;
    await deleteProduct(user!, id);
    return success({ deleted: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

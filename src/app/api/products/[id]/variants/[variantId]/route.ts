import { NextResponse } from "next/server";
import { removeVariant, updateVariant } from "@/server/services/product.service";
import { updateVariantSchema } from "@/server/validators/product";
import {
  requireActiveSeller,
  sessionUser,
  success,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/products/_helpers";

/** PATCH /api/products/[id]/variants/[variantId] */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; variantId: string }> }
): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireActiveSeller(user);
    if (denied) return denied;
    const { id, variantId } = await context.params;
    const parsed = updateVariantSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
    return success(await updateVariant(user!, id, variantId, parsed.data));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/products/[id]/variants/[variantId] */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; variantId: string }> }
): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireActiveSeller(user);
    if (denied) return denied;
    const { id, variantId } = await context.params;
    return success(await removeVariant(user!, id, variantId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

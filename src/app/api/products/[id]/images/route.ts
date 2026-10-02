import { NextResponse } from "next/server";
import { addProductImage } from "@/server/services/product.service";
import { productImageSchema } from "@/server/validators/product";
import {
  requireActiveSeller,
  sessionUser,
  success,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/products/_helpers";

/** POST /api/products/[id]/images — attach an image reference (object storage). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireActiveSeller(user);
    if (denied) return denied;
    const { id } = await context.params;
    const parsed = productImageSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
    return success(await addProductImage(user!, id, parsed.data), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

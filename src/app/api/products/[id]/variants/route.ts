import { NextResponse } from "next/server";
import { addVariant } from "@/server/services/product.service";
import { variantSchema } from "@/server/validators/product";
import {
  requireSeller,
  sessionUser,
  success,
  toErrorResponse,
  validationError,
  zodFieldDetails,
} from "@/app/api/products/_helpers";

/** POST /api/products/[id]/variants — add a size/colour/fabric option. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireSeller(user);
    if (denied) return denied;
    const { id } = await context.params;
    const parsed = variantSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
    return success(await addVariant(user!, id, parsed.data), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

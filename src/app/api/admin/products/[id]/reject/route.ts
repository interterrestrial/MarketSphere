import { NextResponse } from "next/server";
import { moderateProduct } from "@/server/services/admin-product.service";
import { readNote, requireAdminUser, success, toErrorResponse } from "@/app/api/admin/_helpers";

/** POST /api/admin/products/[id]/reject — reject a listing with a reason (FR-44) */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, denied } = await requireAdminUser();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const note = await readNote(request);
    return success(await moderateProduct(user!, id, "reject", note));
  } catch (error) {
    return toErrorResponse(error);
  }
}

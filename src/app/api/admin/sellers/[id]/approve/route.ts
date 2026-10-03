import { NextResponse } from "next/server";
import { decideSellerVerification } from "@/server/services/admin-seller.service";
import { readNote, requireAdminUser, success, toErrorResponse } from "@/app/api/admin/_helpers";

/** POST /api/admin/sellers/[id]/approve — approve a seller (FR-09) */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, denied } = await requireAdminUser();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const note = await readNote(request);
    return success(await decideSellerVerification(user!, id, "approve", note));
  } catch (error) {
    return toErrorResponse(error);
  }
}

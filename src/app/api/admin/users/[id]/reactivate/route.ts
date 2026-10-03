import { NextResponse } from "next/server";
import { setUserAccountStatus } from "@/server/services/admin-user.service";
import { readNote, requireAdminUser, success, toErrorResponse } from "@/app/api/admin/_helpers";

/** POST /api/admin/users/[id]/reactivate — reinstate a suspended account (FR-43) */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, denied } = await requireAdminUser();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const note = await readNote(request);
    return success(await setUserAccountStatus(user!, id, "reactivate", note));
  } catch (error) {
    return toErrorResponse(error);
  }
}

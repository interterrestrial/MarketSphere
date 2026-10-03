import { NextResponse } from "next/server";
import { paginated } from "@/lib/api-response";
import { listUsers } from "@/server/services/admin-user.service";
import { userListQuerySchema } from "@/server/validators/admin";
import { requireAdminUser } from "../_helpers";

/** GET /api/admin/users — account list (FR-43). */
export async function GET(request: Request): Promise<NextResponse> {
  const { denied } = await requireAdminUser();
  if (denied) return denied;

  const parsed = userListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid filters." } },
      { status: 400 }
    );
  }

  const { items, total } = await listUsers(parsed.data);
  return NextResponse.json(paginated(items, parsed.data.page, parsed.data.pageSize, total), {
    status: 200,
  });
}

import { NextResponse } from "next/server";
import { paginated } from "@/lib/api-response";
import { listAuditEntries } from "@/server/services/admin-core";
import { auditListQuerySchema } from "@/server/validators/admin";
import { requireAdminUser } from "../_helpers";

/** GET /api/admin/audit — administrative decision history (FR-46). */
export async function GET(request: Request): Promise<NextResponse> {
  const { denied } = await requireAdminUser();
  if (denied) return denied;

  const parsed = auditListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid pagination." } },
      { status: 400 }
    );
  }

  const { items, total } = await listAuditEntries(parsed.data);
  return NextResponse.json(paginated(items, parsed.data.page, parsed.data.pageSize, total), {
    status: 200,
  });
}

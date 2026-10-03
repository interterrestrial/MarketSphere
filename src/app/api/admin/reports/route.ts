import { NextResponse } from "next/server";
import { paginated } from "@/lib/api-response";
import { listReports } from "@/server/services/admin-report.service";
import { reportListQuerySchema } from "@/server/validators/admin";
import { requireAdminUser } from "../_helpers";

/** GET /api/admin/reports — report queue (FR-45). */
export async function GET(request: Request): Promise<NextResponse> {
  const { denied } = await requireAdminUser();
  if (denied) return denied;

  const parsed = reportListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid filters." } },
      { status: 400 }
    );
  }

  const { items, total } = await listReports(parsed.data);
  return NextResponse.json(paginated(items, parsed.data.page, parsed.data.pageSize, total), {
    status: 200,
  });
}

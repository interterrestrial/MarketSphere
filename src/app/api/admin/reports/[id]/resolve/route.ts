import { NextResponse } from "next/server";
import { resolveReport } from "@/server/services/admin-report.service";
import { resolutionSchema } from "@/server/validators/admin";
import { requireAdminUser, success, toErrorResponse } from "@/app/api/admin/_helpers";

/** POST /api/admin/reports/[id]/resolve — record the outcome of a report (FR-45). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, denied } = await requireAdminUser();
  if (denied) return denied;

  const parsed = resolutionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Record what was done so the outcome is on record.",
        },
      },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  try {
    return success(await resolveReport(user!, id, "resolve", parsed.data.resolution));
  } catch (error) {
    return toErrorResponse(error);
  }
}

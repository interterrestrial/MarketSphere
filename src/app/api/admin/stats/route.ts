import { NextResponse } from "next/server";
import { getPlatformStats } from "@/server/services/admin-stats.service";
import { requireAdminUser, success } from "../_helpers";

/** GET /api/admin/stats — platform statistics (FR-41). */
export async function GET(): Promise<NextResponse> {
  const { denied } = await requireAdminUser();
  if (denied) return denied;
  return success(await getPlatformStats());
}

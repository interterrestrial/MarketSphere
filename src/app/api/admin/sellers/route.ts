import { NextResponse } from "next/server";
import { paginated } from "@/lib/api-response";
import { listSellersForReview } from "@/server/services/admin-seller.service";
import { sellerReviewQuerySchema } from "@/server/validators/admin";
import { requireAdminUser } from "../_helpers";

/** GET /api/admin/sellers — seller verification queue (FR-42). */
export async function GET(request: Request): Promise<NextResponse> {
  const { denied } = await requireAdminUser();
  if (denied) return denied;

  const parsed = sellerReviewQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) return invalidFilters();

  const { items, total } = await listSellersForReview(parsed.data);
  return NextResponse.json(paginated(items, parsed.data.page, parsed.data.pageSize, total), {
    status: 200,
  });
}

function invalidFilters() {
  return NextResponse.json(
    { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid filters." } },
    { status: 400 }
  );
}

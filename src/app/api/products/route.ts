import { NextResponse } from "next/server";
import { paginated } from "@/lib/api-response";
import { createProduct } from "@/server/services/product.service";
import { searchProducts } from "@/server/services/product-search.service";
import { createProductSchema, productSearchQuerySchema } from "@/server/validators/product";
import {
  requireActiveSeller,
  sessionUser,
  success,
  toErrorResponse,
  unauthorized,
  validationError,
  zodFieldDetails,
} from "./_helpers";

/** GET /api/products — buyer discovery search with filters and paging. */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await sessionUser();
  if (!user) return unauthorized();
  const parsed = productSearchQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
  const { items, total } = await searchProducts(parsed.data);
  return NextResponse.json(paginated(items, parsed.data.page, parsed.data.pageSize, total), {
    status: 200,
  });
}

/** POST /api/products — create a draft listing owned by the seller. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    const denied = requireActiveSeller(user);
    if (denied) return denied;
    const parsed = createProductSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(zodFieldDetails(parsed.error));
    return success(await createProduct(user!, parsed.data), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

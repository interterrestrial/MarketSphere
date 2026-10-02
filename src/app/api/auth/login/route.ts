import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { zodFieldDetails } from "@/lib/validation";
import { authenticateUser } from "@/server/services/auth.service";
import { loginSchema } from "@/server/validators/auth";
import { authErrorResponse, authRateLimited, sessionResponse } from "../_helpers";

/** POST /api/auth/login — same-origin login for the browser UI. */
export async function POST(request: Request): Promise<NextResponse> {
  if (authRateLimited(request, "login")) {
    return NextResponse.json(fail("RATE_LIMITED", "Too many attempts. Please try again later."), {
      status: 429,
    });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(fail("BAD_JSON", "The request body is not valid JSON."), {
      status: 400,
    });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      fail(
        "VALIDATION_ERROR",
        "The request contains invalid fields.",
        zodFieldDetails(parsed.error)
      ),
      { status: 400 }
    );
  }
  try {
    const user = await authenticateUser(parsed.data);
    return await sessionResponse(user, 200);
  } catch (error) {
    return authErrorResponse(error);
  }
}

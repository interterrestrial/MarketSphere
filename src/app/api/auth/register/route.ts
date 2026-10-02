import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { zodFieldDetails } from "@/lib/validation";
import { registerUser } from "@/server/services/auth.service";
import { registerSchema } from "@/server/validators/auth";
import { authErrorResponse, authRateLimited, sessionResponse } from "../_helpers";

/** POST /api/auth/register — same-origin registration for the browser UI. */
export async function POST(request: Request): Promise<NextResponse> {
  if (authRateLimited(request, "register")) {
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
  const parsed = registerSchema.safeParse(body);
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
    const user = await registerUser(parsed.data);
    return await sessionResponse(user, 201);
  } catch (error) {
    return authErrorResponse(error);
  }
}

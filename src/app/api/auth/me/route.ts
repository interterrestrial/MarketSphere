import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { currentUser } from "../_helpers";

/** GET /api/auth/me — current session owner for the browser UI. */
export async function GET(): Promise<NextResponse> {
  const cookieHeader = (await headers()).get("cookie");
  const user = await currentUser(cookieHeader);
  if (!user) {
    return NextResponse.json(fail("UNAUTHENTICATED", "Sign in to access this resource."), {
      status: 401,
    });
  }
  return NextResponse.json(ok({ user }), { status: 200 });
}

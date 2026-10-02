import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "./lib/session";

/**
 * Route protection (UX layer — the backend re-enforces everything).
 * - Unauthenticated visitors to role areas go to /login?next=<path>.
 * - Signed-in users with the wrong role go home (their own Overview link
 *   in the header takes them to the right area).
 */
const ROLE_AREAS: Array<{ prefix: string; roles: Array<string> }> = [
  { prefix: "/buyer", roles: ["BUYER"] },
  { prefix: "/seller", roles: ["SELLER"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const area = ROLE_AREAS.find((entry) => pathname.startsWith(entry.prefix));
  if (!area) return NextResponse.next();

  const token = request.cookies.get("ms_session")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (!area.roles.includes(session.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/buyer/:path*", "/seller/:path*", "/admin/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * This proxy runs on EVERY request.
 * If the user doesn't have a valid session cookie, they get redirected to /login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow access to login/register pages, auth APIs, and static files
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (new auth) or legacy site_auth cookie
  const sessionCookie = request.cookies.get("session");
  const legacyCookie = request.cookies.get("site_auth");

  if (sessionCookie?.value || legacyCookie?.value === "authenticated") {
    return NextResponse.next();
  }

  // No valid cookie — redirect to login
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

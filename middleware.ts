import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * This middleware runs on EVERY request.
 * If the user doesn't have a valid auth cookie, they get redirected to /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow access to the login page, the login API, and static files
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check for the auth cookie
  const authCookie = request.cookies.get("site_auth");

  if (authCookie?.value === "authenticated") {
    return NextResponse.next();
  }

  // No valid cookie — redirect to login
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run middleware on all routes
  matcher: ["/((?!_next/static|_next/image).*)"],
};
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  // The password is stored as an environment variable — never in code
  const correctPassword = process.env.SITE_PASSWORD;

  if (!correctPassword) {
    // If no password is set, deny everything (safe default)
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true });

    // Set a cookie that lasts 30 days
    response.cookies.set("site_auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      //maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
      path: "/",
    });

    return response;
  }

  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}
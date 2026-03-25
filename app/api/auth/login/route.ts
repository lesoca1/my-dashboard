import { NextResponse } from "next/server";
import { verifyPassword } from "@/app/lib/password";
import { getUserByUsername, createSession } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = crypto.randomUUID();
    createSession(token, user.id);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.delete("site_auth");

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Login error:", message);
    return NextResponse.json(
      { error: `Login failed: ${message}` },
      { status: 500 }
    );
  }
}

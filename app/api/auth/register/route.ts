import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByUsername, createUser, createSession } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const { username, password, adminSecret } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be 2–20 characters" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    if (getUserByUsername(username)) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const isAdmin =
      !!adminSecret &&
      !!process.env.ADMIN_SECRET &&
      adminSecret === process.env.ADMIN_SECRET;

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    createUser({
      id: userId,
      username,
      passwordHash,
      balance: 0,
      isAdmin,
      createdAt: new Date().toISOString(),
    });

    const token = crypto.randomUUID();
    createSession(token, userId);

    const response = NextResponse.json({
      success: true,
      user: { id: userId, username, isAdmin },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    // Remove old site_auth cookie
    response.cookies.delete("site_auth");

    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

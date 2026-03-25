import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/session";
import { getUserById, getUserByUsername, updateUser, getUsers } from "@/app/lib/db";

// POST /api/admin/credits — give credits to a user
export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const { username, amount } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (!numAmount || !Number.isFinite(numAmount)) {
      return NextResponse.json(
        { error: "Amount must be a valid number" },
        { status: 400 }
      );
    }

    const target = getUserByUsername(username);
    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const newBalance = target.balance + numAmount;
    updateUser(target.id, { balance: newBalance });

    return NextResponse.json({
      success: true,
      username: target.username,
      previousBalance: target.balance,
      newBalance,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// GET /api/admin/credits — list all users and balances
export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const users = getUsers().map((u) => ({
    id: u.id,
    username: u.username,
    balance: u.balance,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({ users });
}

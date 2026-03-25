import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/app/lib/session";
import {
  getBetById,
  createWager,
  getUserById,
  updateUser,
} from "@/app/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bet = getBetById(id);
  if (!bet) {
    return NextResponse.json({ error: "Bet not found" }, { status: 404 });
  }

  if (bet.status !== "open") {
    return NextResponse.json(
      { error: "This bet is no longer accepting wagers" },
      { status: 400 }
    );
  }

  if (new Date(bet.expiresAt) <= new Date()) {
    return NextResponse.json(
      { error: "This bet has expired" },
      { status: 400 }
    );
  }

  try {
    const { position, amount } = await request.json();

    if (position !== "yes" && position !== "no") {
      return NextResponse.json(
        { error: "Position must be 'yes' or 'no'" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !Number.isFinite(numAmount)) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Re-fetch user to get latest balance
    const freshUser = getUserById(user.id);
    if (!freshUser || freshUser.balance < numAmount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Deduct balance
    updateUser(user.id, { balance: freshUser.balance - numAmount });

    // Create wager
    const wager = {
      id: crypto.randomUUID(),
      betId: id,
      userId: user.id,
      position: position as "yes" | "no",
      amount: numAmount,
      createdAt: new Date().toISOString(),
    };

    createWager(wager);

    return NextResponse.json({ success: true, wager });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

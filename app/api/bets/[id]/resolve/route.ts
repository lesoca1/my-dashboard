import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/session";
import {
  getBetById,
  updateBet,
  getWagersByBet,
  getUserById,
  updateUser,
} from "@/app/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const bet = getBetById(id);
  if (!bet) {
    return NextResponse.json({ error: "Bet not found" }, { status: 404 });
  }

  if (bet.status === "resolved") {
    return NextResponse.json(
      { error: "Bet already resolved" },
      { status: 400 }
    );
  }

  try {
    const { outcome } = await request.json();

    if (outcome !== "yes" && outcome !== "no") {
      return NextResponse.json(
        { error: "Outcome must be 'yes' or 'no'" },
        { status: 400 }
      );
    }

    const wagers = getWagersByBet(id);
    const winningPosition = outcome as "yes" | "no";
    const losingPosition = outcome === "yes" ? "no" : "yes";

    const winnerWagers = wagers.filter((w) => w.position === winningPosition);
    const loserWagers = wagers.filter((w) => w.position === losingPosition);

    const winnerPool = winnerWagers.reduce((sum, w) => sum + w.amount, 0);
    const loserPool = loserWagers.reduce((sum, w) => sum + w.amount, 0);

    // Distribute winnings: each winner gets their stake back + proportional share of loser pool
    const payouts: { userId: string; username: string; payout: number }[] = [];

    for (const wager of winnerWagers) {
      const share =
        winnerPool > 0 ? (wager.amount / winnerPool) * loserPool : 0;
      const payout = wager.amount + share;

      const wagerUser = getUserById(wager.userId);
      if (wagerUser) {
        updateUser(wager.userId, {
          balance: wagerUser.balance + payout,
        });
        payouts.push({
          userId: wager.userId,
          username: wagerUser.username,
          payout,
        });
      }
    }

    // Mark bet as resolved
    updateBet(id, { status: "resolved", outcome });

    return NextResponse.json({
      success: true,
      outcome,
      winnerPool,
      loserPool,
      payouts,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

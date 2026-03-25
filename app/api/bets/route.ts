import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/app/lib/session";
import {
  getBets,
  createBet,
  getWagersByBet,
  getUserById,
} from "@/app/lib/db";

// GET /api/bets — list all bets
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bets = getBets().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const enriched = bets.map((bet) => {
    const wagers = getWagersByBet(bet.id);
    const yesPool = wagers
      .filter((w) => w.position === "yes")
      .reduce((sum, w) => sum + w.amount, 0);
    const noPool = wagers
      .filter((w) => w.position === "no")
      .reduce((sum, w) => sum + w.amount, 0);
    const creator = getUserById(bet.creatorId);
    return {
      ...bet,
      creatorName: creator?.username ?? "Unknown",
      yesPool,
      noPool,
      totalPool: yesPool + noPool,
      wagerCount: wagers.length,
    };
  });

  return NextResponse.json({ bets: enriched });
}

// POST /api/bets — create a new bet
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, criteria, expiresAt } = await request.json();

    if (!title || !criteria || !expiresAt) {
      return NextResponse.json(
        { error: "Title, criteria, and expiry are required" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be under 200 characters" },
        { status: 400 }
      );
    }

    const expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime()) || expiry <= new Date()) {
      return NextResponse.json(
        { error: "Expiry must be a valid future date" },
        { status: 400 }
      );
    }

    const bet = {
      id: crypto.randomUUID(),
      creatorId: user.id,
      title,
      criteria,
      expiresAt: expiry.toISOString(),
      status: "open" as const,
      outcome: null,
      createdAt: new Date().toISOString(),
    };

    createBet(bet);

    return NextResponse.json({ success: true, bet });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

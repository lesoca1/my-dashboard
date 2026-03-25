import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/session";
import { getBetById, getWagersByBet, getUserById } from "@/app/lib/db";

export async function GET(
  _request: Request,
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

  const wagers = getWagersByBet(id);
  const yesPool = wagers
    .filter((w) => w.position === "yes")
    .reduce((sum, w) => sum + w.amount, 0);
  const noPool = wagers
    .filter((w) => w.position === "no")
    .reduce((sum, w) => sum + w.amount, 0);

  const creator = getUserById(bet.creatorId);

  // Get usernames for wagers
  const enrichedWagers = wagers.map((w) => {
    const wagerUser = getUserById(w.userId);
    return {
      ...w,
      username: wagerUser?.username ?? "Unknown",
    };
  });

  // User's own wagers on this bet
  const userWagers = wagers.filter((w) => w.userId === user.id);
  const userYes = userWagers
    .filter((w) => w.position === "yes")
    .reduce((sum, w) => sum + w.amount, 0);
  const userNo = userWagers
    .filter((w) => w.position === "no")
    .reduce((sum, w) => sum + w.amount, 0);

  return NextResponse.json({
    bet: {
      ...bet,
      creatorName: creator?.username ?? "Unknown",
      yesPool,
      noPool,
      totalPool: yesPool + noPool,
      wagerCount: wagers.length,
    },
    wagers: enrichedWagers,
    userPosition: { yes: userYes, no: userNo },
  });
}

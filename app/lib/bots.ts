/*
  ══════════════════════════════════════════════════════════════════════════
  BOT WALLET REGISTRY

  Each entry represents a wallet controlled by a different trading bot.
  To add a new bot, just add another object to the array below.

  Fields:
    id         – A short, URL-friendly identifier (no spaces, lowercase).
    name       – A human-readable name shown in the UI.
    strategy   – A brief description of the trading strategy this bot uses.
    wallet     – The Polymarket wallet address (0x...) this bot trades from.
    status     – "active" | "paused" | "stopped"  (controls the badge color).
  ══════════════════════════════════════════════════════════════════════════
*/

export interface Bot {
  id: string;
  name: string;
  strategy: string;
  wallet: string;
  status: "active" | "paused" | "stopped";
}

export const bots: Bot[] = [
  // ── Example bots (replace with your real wallet addresses) ──────────
  {
    id: "momentum-alpha",
    name: "Momentum Alpha",
    strategy: "Buys markets trending upward with strong volume confirmation.",
    wallet: "0x0000000000000000000000000000000000000001",
    status: "active",
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    strategy: "Bets on prices reverting to historical averages after sharp moves.",
    wallet: "0x0000000000000000000000000000000000000002",
    status: "paused",
  },
  {
    id: "sentiment-scanner",
    name: "Sentiment Scanner",
    strategy: "Uses news & social sentiment signals to enter early positions.",
    wallet: "0x0000000000000000000000000000000000000003",
    status: "stopped",
  },
];

export function getBotById(id: string): Bot | undefined {
  return bots.find((b) => b.id === id);
}

export function getAllBots(): Bot[] {
  return bots;
}

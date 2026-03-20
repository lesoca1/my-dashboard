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
    name: "Test 1",
    strategy: "Momentum Strategy: Buys markets trending upward with strong volume confirmation.",
    wallet: "Input Account Address (e.g. 0x00000...)",
    status: "active",
  },

];

export function getBotById(id: string): Bot | undefined {
  return bots.find((b) => b.id === id);
}

export function getAllBots(): Bot[] {
  return bots;
}

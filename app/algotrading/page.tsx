"use client";

import Nav from "@/app/components/Nav";
import Link from "next/link";
import { getAllBots } from "@/app/lib/bots";
import type { Bot } from "@/app/lib/bots";

const statusColors: Record<Bot["status"], string> = {
  active: "ab-status-active",
  paused: "ab-status-paused",
  stopped: "ab-status-stopped",
};

export default function AlgotradingPage() {
  const bots = getAllBots();

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="page-title">Bots</h1>
        <p className="ab-desc">
          Each card below represents a wallet controlled by a different trading
          bot. Click on any bot to view its live performance, positions, P&L,
          and trade history, pulled from Polymarket.
        </p>

        <div className="ab-grid">
          {bots.map((bot) => (
            <Link
              key={bot.id}
              href={`/algotrading/${bot.id}`}
              className="ab-card"
            >
              <div className="ab-card-top">
                <span className="ab-card-name">{bot.name}</span>
                <span className={`ab-status ${statusColors[bot.status]}`}>
                  {bot.status}
                </span>
              </div>
              <p className="ab-card-strategy">{bot.strategy}</p>
              <div className="ab-card-wallet">
                {bot.wallet.slice(0, 6)}...{bot.wallet.slice(-4)}
              </div>
            </Link>
          ))}
        </div>

        <div className="ab-hint">
          To add a new bot, edit{" "}
          <code>app/lib/bots.ts</code> and add an entry to the array.
        </div>
      </main>
    </>
  );
}

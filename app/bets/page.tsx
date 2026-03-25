"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/app/components/Nav";

interface BetSummary {
  id: string;
  title: string;
  criteria: string;
  creatorName: string;
  expiresAt: string;
  status: string;
  outcome: string | null;
  yesPool: number;
  noPool: number;
  totalPool: number;
  wagerCount: number;
  createdAt: string;
}

export default function BetsPage() {
  const [bets, setBets] = useState<BetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  useEffect(() => {
    fetch("/api/bets")
      .then((r) => r.json())
      .then((data) => setBets(data.bets || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? bets : bets.filter((b) => b.status === filter);

  const isExpired = (expiresAt: string) => new Date(expiresAt) <= new Date();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatMoney = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0 });

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <div className="bt-header">
          <h1 className="page-title">Bets</h1>
          <Link href="/bets/create" className="bt-create-btn">
            + New Bet
          </Link>
        </div>

        <p className="bt-desc">
          Create prediction markets and bet paper credits on outcomes. Any user
          can create a bet — the admin resolves them.
        </p>

        <div className="bt-filters">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              className={`bt-filter ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "all" && (
                <span className="bt-filter-count">
                  {bets.filter((b) =>
                    f === "open" ? b.status === "open" : b.status === "resolved"
                  ).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="bt-loading">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bt-empty">
            <p>No bets yet.</p>
            <Link href="/bets/create" className="bt-empty-link">
              Create the first one
            </Link>
          </div>
        ) : (
          <div className="bt-list">
            {filtered.map((bet) => (
              <Link
                href={`/bets/${bet.id}`}
                key={bet.id}
                className="bt-card"
              >
                <div className="bt-card-top">
                  <span className="bt-card-title">{bet.title}</span>
                  <span
                    className={`bt-status bt-status-${
                      bet.status === "resolved"
                        ? bet.outcome
                        : isExpired(bet.expiresAt)
                        ? "expired"
                        : "open"
                    }`}
                  >
                    {bet.status === "resolved"
                      ? `Resolved: ${bet.outcome?.toUpperCase()}`
                      : isExpired(bet.expiresAt)
                      ? "Expired"
                      : "Open"}
                  </span>
                </div>

                <p className="bt-card-criteria">{bet.criteria}</p>

                <div className="bt-card-meta">
                  <span>by {bet.creatorName}</span>
                  <span className="bt-card-sep">&middot;</span>
                  <span>Expires {formatDate(bet.expiresAt)}</span>
                  <span className="bt-card-sep">&middot;</span>
                  <span>{bet.wagerCount} wager{bet.wagerCount !== 1 ? "s" : ""}</span>
                </div>

                <div className="bt-card-pools">
                  <div className="bt-pool-bar">
                    <div
                      className="bt-pool-yes"
                      style={{
                        width:
                          bet.totalPool > 0
                            ? `${(bet.yesPool / bet.totalPool) * 100}%`
                            : "50%",
                      }}
                    />
                  </div>
                  <div className="bt-pool-labels">
                    <span className="bt-pool-label-yes">
                      Yes ${formatMoney(bet.yesPool)}
                    </span>
                    <span className="bt-pool-label-no">
                      No ${formatMoney(bet.noPool)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

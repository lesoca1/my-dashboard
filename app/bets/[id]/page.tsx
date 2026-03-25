"use client";

import { useState, useEffect, use } from "react";
import Nav from "@/app/components/Nav";
import Link from "next/link";

interface BetDetail {
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

interface WagerDetail {
  id: string;
  userId: string;
  username: string;
  position: "yes" | "no";
  amount: number;
  createdAt: string;
}

interface UserPosition {
  yes: number;
  no: number;
}

interface MeData {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
}

export default function BetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bet, setBet] = useState<BetDetail | null>(null);
  const [wagers, setWagers] = useState<WagerDetail[]>([]);
  const [userPos, setUserPos] = useState<UserPosition>({ yes: 0, no: 0 });
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [wagerError, setWagerError] = useState("");
  const [wagerLoading, setWagerLoading] = useState(false);
  const [resolveOutcome, setResolveOutcome] = useState<"yes" | "no">("yes");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveResult, setResolveResult] = useState("");

  const fetchData = () => {
    Promise.all([
      fetch(`/api/bets/${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([betData, meData]) => {
      setBet(betData.bet);
      setWagers(betData.wagers || []);
      setUserPos(betData.userPosition || { yes: 0, no: 0 });
      setMe(meData.user);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isExpired = bet ? new Date(bet.expiresAt) <= new Date() : false;
  const canWager = bet?.status === "open" && !isExpired;

  const handleWager = async (position: "yes" | "no") => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setWagerError("Enter a valid amount");
      return;
    }
    setWagerLoading(true);
    setWagerError("");

    try {
      const res = await fetch(`/api/bets/${id}/wager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, amount: numAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        setAmount("");
        fetchData();
      } else {
        setWagerError(data.error || "Failed to place wager");
      }
    } catch {
      setWagerError("Something went wrong");
    } finally {
      setWagerLoading(false);
    }
  };

  const handleResolve = async () => {
    setResolveLoading(true);
    setResolveResult("");
    try {
      const res = await fetch(`/api/bets/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: resolveOutcome }),
      });
      const data = await res.json();
      if (res.ok) {
        setResolveResult(
          `Resolved as ${data.outcome.toUpperCase()}. ${
            data.payouts.length
          } winner(s) paid out.`
        );
        fetchData();
      } else {
        setResolveResult(data.error || "Failed to resolve");
      }
    } catch {
      setResolveResult("Something went wrong");
    } finally {
      setResolveLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatMoney = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <>
        <Nav />
        <hr className="nav-rule" />
        <main className="page-content fade-in">
          <p className="bt-loading">Loading...</p>
        </main>
      </>
    );
  }

  if (!bet) {
    return (
      <>
        <Nav />
        <hr className="nav-rule" />
        <main className="page-content fade-in">
          <p>Bet not found.</p>
          <Link href="/bets" className="bt-back-link">
            &larr; Back to Bets
          </Link>
        </main>
      </>
    );
  }

  const yesPercent =
    bet.totalPool > 0
      ? Math.round((bet.yesPool / bet.totalPool) * 100)
      : 50;

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <Link href="/bets" className="bt-back-link">
          &larr; Back to Bets
        </Link>

        <h1 className="page-title">{bet.title}</h1>

        <div className="bt-detail-meta">
          <span>Created by {bet.creatorName}</span>
          <span className="bt-card-sep">&middot;</span>
          <span>Expires {formatDate(bet.expiresAt)}</span>
          <span className="bt-card-sep">&middot;</span>
          <span
            className={`bt-status-inline bt-status-${
              bet.status === "resolved"
                ? bet.outcome
                : isExpired
                ? "expired"
                : "open"
            }`}
          >
            {bet.status === "resolved"
              ? `Resolved: ${bet.outcome?.toUpperCase()}`
              : isExpired
              ? "Expired — awaiting resolution"
              : "Open"}
          </span>
        </div>

        <div className="bt-criteria-box">
          <span className="bt-criteria-label">Resolution Criteria</span>
          <p className="bt-criteria-text">{bet.criteria}</p>
        </div>

        {/* Pool visualization */}
        <div className="bt-pool-section">
          <div className="bt-pool-header">
            <span className="bt-pool-yes-pct">{yesPercent}% Yes</span>
            <span className="bt-pool-total">
              Total Pool: ${formatMoney(bet.totalPool)}
            </span>
            <span className="bt-pool-no-pct">{100 - yesPercent}% No</span>
          </div>
          <div className="bt-pool-bar bt-pool-bar-lg">
            <div
              className="bt-pool-yes"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          <div className="bt-pool-labels">
            <span className="bt-pool-label-yes">
              ${formatMoney(bet.yesPool)}
            </span>
            <span className="bt-pool-label-no">
              ${formatMoney(bet.noPool)}
            </span>
          </div>
        </div>

        {/* User position */}
        {(userPos.yes > 0 || userPos.no > 0) && (
          <div className="bt-your-position">
            <span className="bt-section-label">Your Position</span>
            <div className="bt-your-pos-values">
              {userPos.yes > 0 && (
                <span className="bt-pos-yes">
                  YES ${formatMoney(userPos.yes)}
                </span>
              )}
              {userPos.no > 0 && (
                <span className="bt-pos-no">
                  NO ${formatMoney(userPos.no)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Place wager */}
        {canWager && me && (
          <div className="bt-wager-section">
            <span className="bt-section-label">Place a Wager</span>
            <div className="bt-wager-balance">
              Balance: ${formatMoney(me.balance)}
            </div>
            <div className="bt-wager-row">
              <input
                type="number"
                className="bt-input bt-wager-input"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={me.balance}
              />
              <button
                className="bt-wager-btn bt-wager-yes"
                onClick={() => handleWager("yes")}
                disabled={wagerLoading}
              >
                Bet YES
              </button>
              <button
                className="bt-wager-btn bt-wager-no"
                onClick={() => handleWager("no")}
                disabled={wagerLoading}
              >
                Bet NO
              </button>
            </div>
            {wagerError && <div className="bt-error">{wagerError}</div>}
          </div>
        )}

        {/* Admin resolve */}
        {me?.isAdmin && bet.status !== "resolved" && (
          <div className="bt-resolve-section">
            <span className="bt-section-label">Admin: Resolve Bet</span>
            <div className="bt-resolve-row">
              <select
                className="bt-input bt-resolve-select"
                value={resolveOutcome}
                onChange={(e) =>
                  setResolveOutcome(e.target.value as "yes" | "no")
                }
              >
                <option value="yes">YES — condition was met</option>
                <option value="no">NO — condition was not met</option>
              </select>
              <button
                className="bt-resolve-btn"
                onClick={handleResolve}
                disabled={resolveLoading}
              >
                {resolveLoading ? "..." : "Resolve"}
              </button>
            </div>
            {resolveResult && (
              <div className="bt-resolve-result">{resolveResult}</div>
            )}
          </div>
        )}

        {/* Wager history */}
        <div className="bt-wagers-section">
          <div className="bt-wagers-header">
            <span className="bt-section-label">Wagers</span>
            <span className="bt-wager-count">{wagers.length}</span>
          </div>
          {wagers.length === 0 ? (
            <p className="bt-no-wagers">No wagers yet. Be the first!</p>
          ) : (
            <table className="tk-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Position</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {wagers.map((w) => (
                  <tr key={w.id}>
                    <td>{w.username}</td>
                    <td>
                      <span
                        className={
                          w.position === "yes" ? "side-yes" : "side-no"
                        }
                      >
                        {w.position.toUpperCase()}
                      </span>
                    </td>
                    <td>${formatMoney(w.amount)}</td>
                    <td>{formatDate(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}

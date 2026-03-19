"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   POLYMARKET DATA API
   All endpoints are public — no authentication needed.
   Docs: https://docs.polymarket.com
   ═══════════════════════════════════════════════════════════════════════ */

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

interface Position {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  endDate: string;
}

interface ClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  timestamp: number;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  endDate: string;
}

interface Activity {
  proxyWallet: string;
  timestamp: number;
  conditionId: string;
  type: string;
  size: number;
  usdcSize: number;
  transactionHash: string;
  price: number;
  side: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  outcome: string;
}

interface ProfileData {
  name: string;
  pseudonym: string;
  bio: string;
  profileImage: string;
  proxyWallet: string;
}

interface PortfolioValue {
  value: number;
}

async function fetchPositions(address: string): Promise<Position[]> {
  const res = await fetch(
    `${DATA_API}/positions?user=${address}&sizeThreshold=0&limit=500`
  );
  if (!res.ok) throw new Error("Failed to fetch positions");
  return res.json();
}

async function fetchClosedPositions(address: string): Promise<ClosedPosition[]> {
  const res = await fetch(
    `${DATA_API}/closed-positions?user=${address}&limit=500`
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchActivity(address: string): Promise<Activity[]> {
  const res = await fetch(
    `${DATA_API}/activity?user=${address}&limit=200`
  );
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

async function fetchPortfolioValue(address: string): Promise<number> {
  const res = await fetch(
    `${DATA_API}/value?user=${address}`
  );
  if (!res.ok) return 0;
  const data: PortfolioValue = await res.json();
  return data.value || 0;
}

async function fetchProfile(address: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(
      `${GAMMA_API}/profiles/${address}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════════════ */

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtUsd(n: number): string {
  return "$" + fmt(Math.abs(n));
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";
  return Math.floor(seconds / 604800) + "w ago";
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

/* ═══════════════════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════════════════ */

function ThemeToggle({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return (
    <button
      className="theme-toggle"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
      }}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 9.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EQUITY CHART — built from real trade history
   ═══════════════════════════════════════════════════════════════════════ */

function EquityChart({ activities }: { activities: Activity[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!activities.length) return;
    let cancelled = false;

    async function loadChart() {
      const ChartModule = await import("chart.js");
      const { Chart, registerables } = ChartModule;
      Chart.register(...registerables);

      if (cancelled || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const sorted = [...activities]
        .filter((a) => a.type === "TRADE")
        .sort((a, b) => a.timestamp - b.timestamp);

      if (!sorted.length) return;

      let cumPnl = 0;
      const labels: string[] = [];
      const data: number[] = [];

      sorted.forEach((trade) => {
        const isBuy = trade.side === "BUY";
        cumPnl += isBuy ? -(trade.usdcSize || 0) : (trade.usdcSize || 0);
        const date = new Date(trade.timestamp * 1000);
        labels.push(
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
        data.push(Math.round(cumPnl * 100) / 100);
      });

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const isPositive = data[data.length - 1] >= 0;
      const lineColor = isPositive ? "#22C55E" : "#EF4444";

      // Read CSS variables for theming
      const computedStyle = getComputedStyle(document.documentElement);
      const gridColor = computedStyle.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.03)";
      const tickColor = computedStyle.getPropertyValue("--chart-tick").trim() || "#404040";
      const tooltipBg = computedStyle.getPropertyValue("--chart-tooltip-bg").trim() || "#1a1a1a";
      const tooltipBorder = computedStyle.getPropertyValue("--chart-tooltip-border").trim() || "rgba(255,255,255,0.08)";
      const tooltipTitle = computedStyle.getPropertyValue("--chart-tooltip-title").trim() || "#808080";
      const tooltipBody = computedStyle.getPropertyValue("--chart-tooltip-body").trim() || "#e8e8e8";

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              data,
              borderColor: lineColor,
              borderWidth: 1.5,
              backgroundColor: (context: any) => {
                const g = context.chart.ctx.createLinearGradient(0, 0, 0, 240);
                g.addColorStop(0, isPositive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)");
                g.addColorStop(1, isPositive ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)");
                return g;
              },
              fill: true,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 3,
              pointHoverBackgroundColor: lineColor,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 16, right: 16, top: 16, bottom: 8 } },
          scales: {
            x: {
              display: true,
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: "'Space Mono', monospace", size: 10 },
                maxTicksLimit: 6,
              },
              border: { display: false },
            },
            y: {
              display: true,
              position: "right" as const,
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: "'Space Mono', monospace", size: 10 },
                callback: (v: any) => "$" + Number(v).toFixed(0),
              },
              border: { display: false },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderWidth: 0.5,
              titleFont: { family: "'Space Mono', monospace", size: 11 },
              bodyFont: { family: "'Space Mono', monospace", size: 12 },
              titleColor: tooltipTitle,
              bodyColor: tooltipBody,
              padding: 10,
              cornerRadius: 4,
              displayColors: false,
              callbacks: {
                label: (ctx: any) => "$" + fmt(ctx.parsed.y),
              },
            },
          },
          interaction: { intersect: false, mode: "index" as const },
        },
      });
    }

    loadChart();
    return () => {
      cancelled = true;
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [activities]);

  if (!activities.filter((a) => a.type === "TRADE").length) {
    return (
      <div className="chart-area" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No trade history yet</span>
      </div>
    );
  }

  return (
    <div className="chart-area">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════ */

function EmptyState({
  onSubmit,
  inputValue,
  setInputValue,
  error,
  loading,
}: {
  onSubmit: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  error: string;
  loading: boolean;
}) {
  return (
    <div className="empty-state fade-in">
      <div className="empty-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="12" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          <path d="M4 20h40" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          <circle cx="34" cy="30" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        </svg>
      </div>
      <div className="empty-title">Track your Polymarket portfolio</div>
      <div className="empty-desc">
        Enter your Polymarket wallet address to view your positions, P&L, and trade history. All data is fetched from Polymarket&apos;s public API.
      </div>
      <div className="address-input-group">
        <input
          type="text"
          className="address-input"
          placeholder="0x..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.trim())}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          className="empty-btn"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load portfolio"}
        </button>
      </div>
      {error && <div className="input-error">{error}</div>}
      <div className="empty-hint">
        Don&apos;t have one? Find any wallet on the{" "}
        <a href="https://polymarket.com/leaderboard" target="_blank" rel="noopener noreferrer">
          Polymarket leaderboard
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setMounted(true);
    // Load saved theme preference
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const loadPortfolio = useCallback(async () => {
    const addr = inputValue;
    if (!isValidAddress(addr)) {
      setError("Invalid address. Must be 0x followed by 40 hex characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Step 1: Fetch profile to get the proxy wallet address
      const prof = await fetchProfile(addr);

      // Use the proxy wallet from profile if available, otherwise use the input address
      const dataAddress = prof?.proxyWallet || addr;

      // Step 2: Fetch all data using the resolved address
      const [pos, closed, act, val] = await Promise.all([
        fetchPositions(dataAddress).catch(() => [] as Position[]),
        fetchClosedPositions(dataAddress).catch(() => [] as ClosedPosition[]),
        fetchActivity(dataAddress).catch(() => [] as Activity[]),
        fetchPortfolioValue(dataAddress).catch(() => 0),
      ]);

      // If proxy wallet returned nothing, try the original address too
      let finalPos = pos;
      let finalClosed = closed;
      let finalAct = act;
      let finalVal = val;

      if (pos.length === 0 && closed.length === 0 && act.length === 0 && dataAddress !== addr) {
        const [pos2, closed2, act2, val2] = await Promise.all([
          fetchPositions(addr).catch(() => [] as Position[]),
          fetchClosedPositions(addr).catch(() => [] as ClosedPosition[]),
          fetchActivity(addr).catch(() => [] as Activity[]),
          fetchPortfolioValue(addr).catch(() => 0),
        ]);
        if (pos2.length > 0 || closed2.length > 0 || act2.length > 0) {
          finalPos = pos2;
          finalClosed = closed2;
          finalAct = act2;
          finalVal = val2;
        }
      }

      setPositions(finalPos);
      setClosedPositions(finalClosed);
      setActivities(finalAct);
      setPortfolioValue(finalVal);
      setProfile(prof);
      setWalletAddress(addr);
      setConnected(true);
    } catch (err) {
      setError("Failed to fetch data. Check the address and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [inputValue]);

  const handleDisconnect = () => {
    setConnected(false);
    setWalletAddress("");
    setInputValue("");
    setPositions([]);
    setClosedPositions([]);
    setActivities([]);
    setPortfolioValue(0);
    setProfile(null);
  };

  // ── Computed metrics from BOTH open and closed positions ──
  // Unrealized P&L: from open positions only
  const unrealizedPnl = positions.reduce((sum, p) => sum + (p.cashPnl || 0), 0);

  // Realized P&L: from open positions' realizedPnl + all closed positions' realizedPnl
  const realizedFromOpen = positions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const realizedFromClosed = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const totalRealizedPnl = realizedFromOpen + realizedFromClosed;

  // Total P&L: unrealized + realized
  const totalPnl = unrealizedPnl + totalRealizedPnl;

  // Total invested: from open positions' initialValue + closed positions' totalBought
  const investedOpen = positions.reduce((sum, p) => sum + (p.initialValue || 0), 0);
  const investedClosed = closedPositions.reduce((sum, p) => sum + (p.totalBought || 0), 0);
  const totalInvested = investedOpen + investedClosed;

  const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const openCount = positions.filter((p) => p.size > 0 && !p.redeemable).length;
  const totalMarkets = positions.length + closedPositions.length;

  const displayName =
    profile?.pseudonym || profile?.name || (walletAddress ? walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4) : "");

  return (
    <main className="dashboard">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="header fade-in">
        <div className="logo">Leonardo Sorensen</div>
        <div className="header-right">
          {mounted && <ThemeToggle theme={theme} setTheme={setTheme} />}
          {connected ? (
            <button className="wallet-btn connected" onClick={handleDisconnect} title="Click to disconnect">
              <span className="wallet-dot"></span>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </button>
          ) : (
            <span className="header-tagline">prediction market tracker</span>
          )}
        </div>
      </header>

      {/* ── Show empty state OR dashboard ───────────────────────── */}
      {!connected ? (
        <EmptyState
          onSubmit={loadPortfolio}
          inputValue={inputValue}
          setInputValue={setInputValue}
          error={error}
          loading={loading}
        />
      ) : (
        <>
          {/* ── Wallet Identity Banner ──────────────────────────── */}
          <section className="fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="wallet-identity">
              {profile?.profileImage && (
                <img
                  src={profile.profileImage}
                  alt={displayName}
                  className="wallet-avatar"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="wallet-identity-info">
                <div className="wallet-display-name">{displayName}</div>
                <div className="wallet-address-full">
                  {walletAddress}
                </div>
              </div>
            </div>
          </section>

          {/* ── Metrics ─────────────────────────────────────────── */}
          <section className="fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="section-label">Portfolio overview</div>
            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Portfolio value</div>
                <div className="metric-value">
                  {mounted ? fmtUsd(portfolioValue) : "—"}
                </div>
                <div className="metric-sub">current positions</div>
              </div>
              <div className="metric">
                <div className="metric-label">Total P&L</div>
                <div className={`metric-value ${totalPnl >= 0 ? "positive" : "negative"}`}>
                  {totalPnl >= 0 ? "+" : "-"}{mounted ? fmtUsd(totalPnl) : "—"}
                </div>
                <div className="metric-sub">
                  {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}% all-time
                </div>
              </div>
              <div className="metric">
                <div className="metric-label">Open positions</div>
                <div className="metric-value">{openCount}</div>
                <div className="metric-sub">{totalMarkets} total tracked</div>
              </div>
              <div className="metric">
                <div className="metric-label">Total invested</div>
                <div className="metric-value">
                  {mounted ? fmtUsd(totalInvested) : "—"}
                </div>
                <div className="metric-sub">initial cost basis</div>
              </div>
            </div>
          </section>

          {/* ── Equity Chart ────────────────────────────────────── */}
          <section className="fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="chart-section">
              <div className="chart-header">
                <div className="section-label" style={{ marginBottom: 0 }}>
                  Cumulative trade flow
                </div>
              </div>
              {mounted && <EquityChart activities={activities} />}
            </div>
          </section>

          {/* ── Positions Table ─────────────────────────────────── */}
          {positions.length > 0 && (
            <section className="fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="positions-section">
                <div className="positions-header">
                  <div className="section-label" style={{ marginBottom: 0 }}>
                    Positions
                  </div>
                  <div className="pos-count">{openCount} open</div>
                </div>
                <table className="positions-table">
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Outcome</th>
                      <th>Avg price</th>
                      <th>Current</th>
                      <th>Size</th>
                      <th>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions
                      .filter((p) => p.size > 0)
                      .sort((a, b) => Math.abs(b.cashPnl) - Math.abs(a.cashPnl))
                      .map((pos, i) => (
                        <tr key={pos.conditionId + pos.outcome + i}>
                          <td>
                            <a
                              href={`https://polymarket.com/event/${pos.eventSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="market-name"
                              style={{ textDecoration: "none" }}
                            >
                              {pos.title}
                            </a>
                          </td>
                          <td>
                            <span className={pos.outcome === "Yes" ? "side-yes" : "side-no"}>
                              {pos.outcome}
                            </span>
                          </td>
                          <td>${(pos.avgPrice || 0).toFixed(2)}</td>
                          <td>${(pos.curPrice || 0).toFixed(2)}</td>
                          <td>{mounted ? fmt(pos.size) : "—"} shares</td>
                          <td>
                            <span className={(pos.cashPnl || 0) >= 0 ? "pnl-positive" : "pnl-negative"}>
                              {(pos.cashPnl || 0) >= 0 ? "+" : ""}
                              {mounted ? fmtUsd(pos.cashPnl || 0) : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Closed Positions Table ──────────────────────────── */}
          {closedPositions.length > 0 && (
            <section className="fade-in" style={{ animationDelay: "0.35s" }}>
              <div className="positions-section">
                <div className="positions-header">
                  <div className="section-label" style={{ marginBottom: 0 }}>
                    Closed positions
                  </div>
                  <div className="pos-count">{closedPositions.length} settled</div>
                </div>
                <table className="positions-table">
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Outcome</th>
                      <th>Avg price</th>
                      <th>Invested</th>
                      <th>Realized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPositions
                      .sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl))
                      .map((pos, i) => (
                        <tr key={pos.conditionId + pos.outcome + i}>
                          <td>
                            <a
                              href={`https://polymarket.com/event/${pos.eventSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="market-name"
                              style={{ textDecoration: "none" }}
                            >
                              {pos.title}
                            </a>
                          </td>
                          <td>
                            <span className={pos.outcome === "Yes" ? "side-yes" : "side-no"}>
                              {pos.outcome}
                            </span>
                          </td>
                          <td>${(pos.avgPrice || 0).toFixed(2)}</td>
                          <td>{mounted ? fmtUsd(pos.totalBought || 0) : "—"}</td>
                          <td>
                            <span className={(pos.realizedPnl || 0) >= 0 ? "pnl-positive" : "pnl-negative"}>
                              {(pos.realizedPnl || 0) >= 0 ? "+" : ""}
                              {mounted ? fmtUsd(pos.realizedPnl || 0) : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Activity Feed ───────────────────────────────────── */}
          {activities.length > 0 && (
            <section className="fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="activity-section">
                <div className="section-label">Recent activity</div>
                {activities.slice(0, 15).map((act, i) => (
                  <div className="activity-item" key={act.transactionHash + i}>
                    <div className="activity-left">
                      <div className={`activity-dot ${act.side === "BUY" ? "buy" : "sell"}`}></div>
                      <span className="activity-market">
                        {act.side === "BUY" ? "Bought" : "Sold"} {act.outcome} — {act.title}
                      </span>
                    </div>
                    <div className="activity-right">
                      <span className="activity-detail">
                        {fmt(act.size)} @ ${(act.price || 0).toFixed(2)}
                      </span>
                      <span className="activity-time">{timeAgo(act.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Empty portfolio message ─────────────────────────── */}
          {positions.length === 0 && closedPositions.length === 0 && activities.length === 0 && (
            <section className="fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="empty-portfolio">
                <div className="empty-title" style={{ fontSize: 16 }}>No positions found</div>
                <div className="empty-desc">
                  This wallet has no open positions or trade history on Polymarket.
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-left">Applied HMM Models and Bayesian frameworks on prediction markets</div>
        <div className="footer-links">
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="footer-link">
            Polymarket
          </a>
          <a href="https://github.com/lesoca1" target="_blank" rel="noopener noreferrer" className="footer-link">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
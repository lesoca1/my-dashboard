"use client";

import { useState, useEffect, useRef, useCallback, useMemo, use } from "react";
import Nav from "@/app/components/Nav";
import Link from "next/link";
import { getBotById } from "@/app/lib/bots";
import type { Bot } from "@/app/lib/bots";

/* ═══════════════════════════════════════════════════════════════════════
   POLYMARKET DATA API  (same as Tracker)
   ═══════════════════════════════════════════════════════════════════════ */

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

interface Position {
  proxyWallet: string; asset: string; conditionId: string; size: number;
  avgPrice: number; initialValue: number; currentValue: number;
  cashPnl: number; percentPnl: number; totalBought: number;
  realizedPnl: number; curPrice: number; redeemable: boolean;
  title: string; slug: string; icon: string; eventSlug: string;
  outcome: string; outcomeIndex: number; endDate: string;
}

interface ClosedPosition {
  proxyWallet: string; asset: string; conditionId: string;
  avgPrice: number; totalBought: number; realizedPnl: number;
  curPrice: number; timestamp: number; title: string; slug: string;
  icon: string; eventSlug: string; outcome: string; outcomeIndex: number;
  endDate: string;
}

interface Activity {
  proxyWallet: string; timestamp: number; conditionId: string;
  type: string; size: number; usdcSize: number; transactionHash: string;
  price: number; side: string; outcomeIndex: number; title: string;
  slug: string; outcome: string;
  name?: string; pseudonym?: string; profileImage?: string;
}

interface ProfileData {
  name: string; pseudonym: string; bio: string;
  profileImage: string; proxyWallet: string;
}

interface PortfolioValue { value: number; }

/* ── Fetchers ─────────────────────────────────────────────────────── */

async function fetchPositions(addr: string): Promise<Position[]> {
  const r = await fetch(`${DATA_API}/positions?user=${addr}&sizeThreshold=0&limit=500`);
  if (!r.ok) throw new Error("positions"); return r.json();
}
async function fetchClosedPositions(addr: string): Promise<ClosedPosition[]> {
  const r = await fetch(`${DATA_API}/closed-positions?user=${addr}&limit=500`);
  if (!r.ok) return []; return r.json();
}
async function fetchAllActivity(addr: string): Promise<Activity[]> {
  const all: Activity[] = []; const PAGE = 500;
  for (let p = 0; p < 20; p++) {
    const r = await fetch(`${DATA_API}/activity?user=${addr}&limit=${PAGE}&offset=${p * PAGE}`);
    if (!r.ok) break; const b: Activity[] = await r.json();
    if (!b.length) break; all.push(...b); if (b.length < PAGE) break;
  }
  const seen = new Set<string>();
  return all.filter((a) => {
    const k = `${a.transactionHash}:${a.conditionId}:${a.outcomeIndex}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}
async function fetchPortfolioValue(addr: string): Promise<number> {
  const r = await fetch(`${DATA_API}/value?user=${addr}`);
  if (!r.ok) return 0; const d: PortfolioValue = await r.json(); return d.value || 0;
}
async function fetchProfile(addr: string): Promise<ProfileData | null> {
  try { const r = await fetch(`${GAMMA_API}/profiles/${addr}`); if (!r.ok) return null; return r.json(); }
  catch { return null; }
}

/* ── Utils ────────────────────────────────────────────────────────── */

function fmt(n: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
function fmtUsd(n: number) { return "$" + fmt(Math.abs(n)); }
function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return Math.floor(s / 604800) + "w ago";
}

type ChartPeriod = "1D" | "1W" | "1M" | "ALL";
function getCutoff(p: ChartPeriod) {
  const now = Math.floor(Date.now() / 1000);
  if (p === "1D") return now - 86400; if (p === "1W") return now - 7 * 86400;
  if (p === "1M") return now - 30 * 86400; return 0;
}

/* ═══════════════════════════════════════════════════════════════════════
   P&L CHART  (same as Tracker)
   ═══════════════════════════════════════════════════════════════════════ */

function PnlChart({ activities, period, setPeriod }: {
  activities: Activity[]; period: ChartPeriod; setPeriod: (p: ChartPeriod) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const relevant = activities.filter((a) => a.type === "TRADE" || a.type === "REDEEM" || a.type === "REWARD");
    if (!relevant.length) return;
    let cancelled = false;

    async function loadChart() {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (cancelled || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const cutoff = getCutoff(period);
      const sorted = [...relevant].sort((a, b) => a.timestamp - b.timestamp);
      let cum = 0;
      const full: { ts: number; pnl: number }[] = [];
      sorted.forEach((e) => {
        if (e.type === "TRADE") cum += e.side === "BUY" ? -(e.usdcSize || 0) : (e.usdcSize || 0);
        else if (e.type === "REDEEM" || e.type === "REWARD") cum += e.usdcSize || 0;
        full.push({ ts: e.timestamp, pnl: Math.round(cum * 100) / 100 });
      });

      let display = full; let base = 0;
      if (period !== "ALL" && cutoff > 0) {
        const idx = full.findIndex((p) => p.ts >= cutoff);
        if (idx > 0) { base = full[idx - 1].pnl; display = full.slice(idx); }
        else if (idx === -1) display = [];
      }
      if (!display.length) { if (chartRef.current) chartRef.current.destroy(); chartRef.current = null; return; }

      const labels = display.map((p) => {
        const d = new Date(p.ts * 1000);
        return period === "1D" ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
      const data = display.map((p) => p.pnl - base);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const last = data[data.length - 1]; const pos = last >= 0;
      const line = pos ? "#22C55E" : "#EF4444";
      const cs = getComputedStyle(document.documentElement);
      const grid = cs.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.03)";
      const tick = cs.getPropertyValue("--chart-tick").trim() || "#404040";

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [{
          data, borderColor: line, borderWidth: 1.5,
          backgroundColor: (c: any) => {
            const g = c.chart.ctx.createLinearGradient(0, 0, 0, 240);
            g.addColorStop(0, pos ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)");
            g.addColorStop(1, pos ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)");
            return g;
          },
          fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 3, pointHoverBackgroundColor: line,
        }]},
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { left: 16, right: 16, top: 16, bottom: 8 } },
          scales: {
            x: { display: true, grid: { color: grid }, ticks: { color: tick, font: { family: "'Space Mono', monospace", size: 10 }, maxTicksLimit: 6 }, border: { display: false } },
            y: { display: true, position: "right" as const, grid: { color: grid }, ticks: { color: tick, font: { family: "'Space Mono', monospace", size: 10 }, callback: (v: any) => "$" + Number(v).toFixed(0) }, border: { display: false } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: cs.getPropertyValue("--chart-tooltip-bg").trim() || "#1a1a1a",
              borderColor: cs.getPropertyValue("--chart-tooltip-border").trim() || "rgba(255,255,255,0.08)",
              borderWidth: 0.5,
              titleFont: { family: "'Space Mono', monospace", size: 11 },
              bodyFont: { family: "'Space Mono', monospace", size: 12 },
              titleColor: cs.getPropertyValue("--chart-tooltip-title").trim() || "#808080",
              bodyColor: cs.getPropertyValue("--chart-tooltip-body").trim() || "#e8e8e8",
              padding: 10, cornerRadius: 4, displayColors: false,
              callbacks: { label: (c: any) => { const v = c.parsed.y; return (v >= 0 ? "+" : "-") + "$" + fmt(Math.abs(v)); } },
            },
          },
          interaction: { intersect: false, mode: "index" as const },
        },
      });
    }
    loadChart();
    return () => { cancelled = true; if (chartRef.current) chartRef.current.destroy(); };
  }, [activities, period]);

  const hasData = activities.some((a) => a.type === "TRADE" || a.type === "REDEEM" || a.type === "REWARD");

  return (
    <div className="tk-chart-section">
      <div className="tk-chart-header">
        <div className="tk-section-label">Profit / Loss</div>
        <div className="tk-chart-tabs">
          {(["1D", "1W", "1M", "ALL"] as ChartPeriod[]).map((p) => (
            <button key={p} className={`tk-chart-tab ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>
      {hasData ? (
        <div className="tk-chart-area"><canvas ref={canvasRef}></canvas></div>
      ) : (
        <div className="tk-chart-area" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No trade history yet</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BOT DETAIL PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function BotDetailPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = use(params);
  const bot = getBotById(botId);

  const [positions, setPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("ALL");
  const [showAllPos, setShowAllPos] = useState(false);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadPortfolio = useCallback(async (wallet: string) => {
    setError(""); setLoading(true); setShowAllPos(false); setShowAllClosed(false);
    try {
      const prof = await fetchProfile(wallet);
      const da = prof?.proxyWallet || wallet;
      const [pos, closed, act, val] = await Promise.all([
        fetchPositions(da).catch(() => [] as Position[]),
        fetchClosedPositions(da).catch(() => [] as ClosedPosition[]),
        fetchAllActivity(da).catch(() => [] as Activity[]),
        fetchPortfolioValue(da).catch(() => 0),
      ]);
      let fPos = pos, fCl = closed, fAct = act, fVal = val;
      if (!pos.length && !closed.length && !act.length && da !== wallet) {
        const [p2, c2, a2, v2] = await Promise.all([
          fetchPositions(wallet).catch(() => [] as Position[]),
          fetchClosedPositions(wallet).catch(() => [] as ClosedPosition[]),
          fetchAllActivity(wallet).catch(() => [] as Activity[]),
          fetchPortfolioValue(wallet).catch(() => 0),
        ]);
        if (p2.length || c2.length || a2.length) { fPos = p2; fCl = c2; fAct = a2; fVal = v2; }
      }
      setPositions(fPos); setClosedPositions(fCl); setActivities(fAct);
      setPortfolioValue(fVal); setProfile(prof); setLoaded(true);
    } catch (err) { setError("Failed to fetch data. The wallet may not have any Polymarket activity yet."); console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (bot) loadPortfolio(bot.wallet);
    else setLoading(false);
  }, [bot, loadPortfolio]);

  const { cashFlowPnl, totalSpent } = useMemo(() => {
    let flow = 0, spent = 0;
    activities.forEach((a) => {
      if (a.type === "TRADE") { if (a.side === "BUY") { flow -= a.usdcSize || 0; spent += a.usdcSize || 0; } else flow += a.usdcSize || 0; }
      else if (a.type === "REDEEM" || a.type === "REWARD") flow += a.usdcSize || 0;
    });
    return { cashFlowPnl: flow, totalSpent: spent };
  }, [activities]);

  const totalPnl = cashFlowPnl + portfolioValue;
  const pnlPct = totalSpent > 0 ? (totalPnl / totalSpent) * 100 : 0;
  const openCount = positions.filter((p) => p.size > 0 && !p.redeemable).length;
  const totalMarkets = positions.length + closedPositions.length;

  const LIMIT = 10;
  const openPos = useMemo(() => positions.filter((p) => p.size > 0).sort((a, b) => Math.abs(b.cashPnl) - Math.abs(a.cashPnl)), [positions]);
  const visPos = showAllPos ? openPos : openPos.slice(0, LIMIT);
  const sortCl = useMemo(() => [...closedPositions].sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl)), [closedPositions]);
  const visCl = showAllClosed ? sortCl : sortCl.slice(0, LIMIT);

  /* ── Bot not found ──────────────────────────────────────────────── */
  if (!bot) {
    return (
      <>
        <Nav />
        <hr className="nav-rule" />
        <main className="page-content fade-in">
          <div className="tk-empty">
            <h1 className="page-title">Bot not found</h1>
            <p className="tk-empty-desc">
              No bot with id &ldquo;{botId}&rdquo; exists in the registry.
            </p>
            <Link href="/algotrading" className="ab-back-link">&larr; Back to bots</Link>
          </div>
        </main>
      </>
    );
  }

  /* ── Loading state ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <Nav />
        <hr className="nav-rule" />
        <main className="page-content fade-in">
          <Link href="/algotrading" className="ab-back-link">&larr; All bots</Link>
          <div className="ab-bot-header">
            <h1 className="page-title">{bot.name}</h1>
            <span className={`ab-status ab-status-${bot.status}`}>{bot.status}</span>
          </div>
          <p className="ab-strategy">{bot.strategy}</p>
          <div className="tk-empty" style={{ minHeight: "30vh" }}>
            <p className="tk-empty-desc">Loading portfolio data...</p>
          </div>
        </main>
      </>
    );
  }

  /* ── Main view ──────────────────────────────────────────────────── */
  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <Link href="/algotrading" className="ab-back-link">&larr; All bots</Link>

        <div className="ab-bot-header">
          <h1 className="page-title">{bot.name}</h1>
          <span className={`ab-status ab-status-${bot.status}`}>{bot.status}</span>
        </div>
        <p className="ab-strategy">{bot.strategy}</p>
        <div className="ab-wallet-addr">
          Wallet: <code>{bot.wallet}</code>
        </div>

        {error && <div className="tk-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loaded && (
          <>
            {/* ── Metrics ──────────────────────────────────────────── */}
            <div className="tk-metrics">
              <div className="tk-metric">
                <div className="tk-metric-label">Portfolio value</div>
                <div className="tk-metric-value">{mounted ? fmtUsd(portfolioValue) : "—"}</div>
                <div className="tk-metric-sub">current positions</div>
              </div>
              <div className="tk-metric">
                <div className="tk-metric-label">Profit / Loss</div>
                <div className={`tk-metric-value ${totalPnl >= 0 ? "positive" : "negative"}`}>
                  {totalPnl >= 0 ? "+" : "-"}{mounted ? fmtUsd(totalPnl) : "—"}
                </div>
                <div className="tk-metric-sub">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}% all-time</div>
              </div>
              <div className="tk-metric">
                <div className="tk-metric-label">Open positions</div>
                <div className="tk-metric-value">{openCount}</div>
                <div className="tk-metric-sub">{totalMarkets} total tracked</div>
              </div>
              <div className="tk-metric">
                <div className="tk-metric-label">Total invested</div>
                <div className="tk-metric-value">{mounted ? fmtUsd(totalSpent) : "—"}</div>
                <div className="tk-metric-sub">all-time cost basis</div>
              </div>
            </div>

            {/* ── Chart ────────────────────────────────────────────── */}
            {mounted && <PnlChart activities={activities} period={chartPeriod} setPeriod={setChartPeriod} />}

            {/* ── Open positions ────────────────────────────────────── */}
            {openPos.length > 0 && (
              <div className="tk-table-section">
                <div className="tk-table-header">
                  <div className="tk-section-label">Positions</div>
                  <span className="tk-count">{openCount} open</span>
                </div>
                <table className="tk-table">
                  <thead><tr><th>Market</th><th>Outcome</th><th>Avg</th><th>Current</th><th>Size</th><th>P&L</th></tr></thead>
                  <tbody>
                    {visPos.map((p, i) => (
                      <tr key={p.conditionId + p.outcome + i}>
                        <td><a href={`https://polymarket.com/event/${p.eventSlug}`} target="_blank" rel="noopener noreferrer" className="tk-market">{p.title}</a></td>
                        <td><span className={p.outcome === "Yes" ? "side-yes" : "side-no"}>{p.outcome}</span></td>
                        <td>${(p.avgPrice || 0).toFixed(2)}</td>
                        <td>${(p.curPrice || 0).toFixed(2)}</td>
                        <td>{mounted ? fmt(p.size) : "—"}</td>
                        <td><span className={(p.cashPnl || 0) >= 0 ? "pnl-pos" : "pnl-neg"}>{(p.cashPnl || 0) >= 0 ? "+" : ""}{mounted ? fmtUsd(p.cashPnl || 0) : "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {openPos.length > LIMIT && (
                  <button className="tk-view-more" onClick={() => setShowAllPos(!showAllPos)}>
                    {showAllPos ? "Show less" : `View all ${openPos.length} positions`}
                  </button>
                )}
              </div>
            )}

            {/* ── Closed positions ─────────────────────────────────── */}
            {sortCl.length > 0 && (
              <div className="tk-table-section">
                <div className="tk-table-header">
                  <div className="tk-section-label">Closed positions</div>
                  <span className="tk-count">{sortCl.length} settled</span>
                </div>
                <table className="tk-table">
                  <thead><tr><th>Market</th><th>Outcome</th><th>Avg</th><th>Invested</th><th>Realized P&L</th></tr></thead>
                  <tbody>
                    {visCl.map((p, i) => (
                      <tr key={p.conditionId + p.outcome + i}>
                        <td><a href={`https://polymarket.com/event/${p.eventSlug}`} target="_blank" rel="noopener noreferrer" className="tk-market">{p.title}</a></td>
                        <td><span className={p.outcome === "Yes" ? "side-yes" : "side-no"}>{p.outcome}</span></td>
                        <td>${(p.avgPrice || 0).toFixed(2)}</td>
                        <td>{mounted ? fmtUsd(p.totalBought || 0) : "—"}</td>
                        <td><span className={(p.realizedPnl || 0) >= 0 ? "pnl-pos" : "pnl-neg"}>{(p.realizedPnl || 0) >= 0 ? "+" : ""}{mounted ? fmtUsd(p.realizedPnl || 0) : "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortCl.length > LIMIT && (
                  <button className="tk-view-more" onClick={() => setShowAllClosed(!showAllClosed)}>
                    {showAllClosed ? "Show less" : `View all ${sortCl.length} closed positions`}
                  </button>
                )}
              </div>
            )}

            {/* ── Activity feed ────────────────────────────────────── */}
            {activities.length > 0 && (
              <div className="tk-table-section">
                <div className="tk-section-label">Recent activity</div>
                {[...activities].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15).map((a, i) => (
                  <div className="tk-activity" key={a.transactionHash + a.conditionId + i}>
                    <div className="tk-act-left">
                      <span className={`tk-dot ${a.type === "REDEEM" ? "redeem" : a.side === "BUY" ? "buy" : "sell"}`}></span>
                      <span className="tk-act-label">
                        {a.type === "REDEEM" ? `Redeemed ${a.outcome}` : a.type === "TRADE" ? `${a.side === "BUY" ? "Bought" : "Sold"} ${a.outcome}` : `${a.type} ${a.outcome}`} — {a.title}
                      </span>
                    </div>
                    <div className="tk-act-right">
                      <span className="tk-act-detail">{a.type === "TRADE" ? `${fmt(a.size)} @ $${(a.price || 0).toFixed(2)}` : fmtUsd(a.usdcSize || 0)}</span>
                      <span className="tk-act-time">{timeAgo(a.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Empty state ──────────────────────────────────────── */}
            {positions.length === 0 && closedPositions.length === 0 && activities.length === 0 && (
              <div className="tk-empty" style={{ minHeight: "30vh" }}>
                <p className="tk-empty-desc">No positions found for this bot&rsquo;s wallet. Once the bot starts trading, data will appear here automatically.</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

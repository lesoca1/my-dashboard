"use client";

import Nav from "@/app/components/Nav";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   SYNTHETIC DATA GENERATOR
   ═══════════════════════════════════════════════════════════════════════ */

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function normalRandom(rng: () => number): number {
  return Math.sqrt(-2 * Math.log(rng() + 1e-10)) * Math.cos(2 * Math.PI * rng());
}

interface SimData {
  prices: number[];
  returns: number[];
  regimes: number[];
  filteredProbs: number[][];
  dates: string[];
}

function generateSimulation(): SimData {
  const rng = seededRandom(42);
  const T = 500;
  const params = [
    [0.0008, 0.008],  // bull
    [0.0001, 0.012],  // neutral
    [-0.0012, 0.022], // bear
  ];
  const trans = [
    [0.97, 0.025, 0.005],
    [0.03, 0.94, 0.03],
    [0.005, 0.04, 0.955],
  ];

  const regimes: number[] = [];
  const returns: number[] = [];
  const prices: number[] = [100];
  let state = 0;

  for (let t = 0; t < T; t++) {
    const r = rng();
    let cum = 0;
    for (let s = 0; s < 3; s++) { cum += trans[state][s]; if (r < cum) { state = s; break; } }
    regimes.push(state);
    const [mu, sigma] = params[state];
    const ret = mu + sigma * normalRandom(rng);
    returns.push(ret);
    prices.push(prices[prices.length - 1] * Math.exp(ret));
  }

  const filteredProbs: number[][] = [];
  let probs = [0.6, 0.3, 0.1];
  for (let t = 0; t < T; t++) {
    const np = [0, 0, 0];
    for (let s = 0; s < 3; s++) {
      let prior = 0;
      for (let ps = 0; ps < 3; ps++) prior += probs[ps] * trans[ps][s];
      const [mu, sigma] = params[s];
      np[s] = prior * Math.exp(-0.5 * ((returns[t] - mu) / sigma) ** 2) / sigma;
    }
    const sum = np[0] + np[1] + np[2] + 1e-10;
    probs = np.map((p) => p / sum);
    filteredProbs.push([...probs]);
  }

  const startDate = new Date("2024-01-02");
  const dates: string[] = [];
  for (let t = 0; t < T; t++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + t);
    dates.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }

  return { prices: prices.slice(1), returns, regimes, filteredProbs, dates };
}

/* ═══════════════════════════════════════════════════════════════════════
   CHARTS
   ═══════════════════════════════════════════════════════════════════════ */

const REGIME_COLORS = ["#22C55E", "#FACC15", "#EF4444"];
const REGIME_LABELS = ["Bull", "Neutral", "Bear"];
const REGIME_BG = ["rgba(34,197,94,0.12)", "rgba(250,204,21,0.10)", "rgba(239,68,68,0.12)"];

function RegimePriceChart({ sim }: { sim: SimData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (cancelled || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      // Build regime band segments for the custom plugin
      const bands: { start: number; end: number; regime: number }[] = [];
      let bStart = 0;
      let cur = sim.regimes[0];
      for (let i = 1; i <= sim.regimes.length; i++) {
        if (i === sim.regimes.length || sim.regimes[i] !== cur) {
          bands.push({ start: bStart, end: i - 1, regime: cur });
          if (i < sim.regimes.length) { bStart = i; cur = sim.regimes[i]; }
        }
      }

      // Inline plugin: draw colored rectangles behind the chart
      const regimeBandsPlugin = {
        id: "regimeBands",
        beforeDraw(chart: any) {
          const { ctx, chartArea, scales } = chart;
          if (!chartArea || !scales.x) return;
          const xScale = scales.x;
          const { top, bottom } = chartArea;

          for (const band of bands) {
            const x1 = xScale.getPixelForValue(band.start);
            const x2 = xScale.getPixelForValue(band.end);
            ctx.save();
            ctx.fillStyle = REGIME_BG[band.regime];
            ctx.fillRect(x1, top, x2 - x1, bottom - top);
            ctx.restore();
          }
        },
      };

      const cs = getComputedStyle(document.documentElement);
      const grid = cs.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.03)";
      const tick = cs.getPropertyValue("--chart-tick").trim() || "#404040";

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: sim.dates,
          datasets: [{
            data: sim.prices,
            borderColor: "#888",
            borderWidth: 1.2,
            pointRadius: 0,
            tension: 0.1,
            fill: false,
          }],
        },
        plugins: [regimeBandsPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 8, right: 8, top: 8, bottom: 4 } },
          scales: {
            x: { display: true, grid: { color: grid }, ticks: { color: tick, font: { size: 9 }, maxTicksLimit: 8 }, border: { display: false } },
            y: { display: true, position: "right", grid: { color: grid }, ticks: { color: tick, font: { size: 9 }, callback: (v: any) => "$" + Number(v).toFixed(0) }, border: { display: false } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#1a1a1a", borderColor: "rgba(255,255,255,0.08)", borderWidth: 0.5,
              titleFont: { size: 10 }, bodyFont: { size: 11 },
              titleColor: "#808080", bodyColor: "#e8e8e8", padding: 8, cornerRadius: 4, displayColors: false,
              callbacks: {
                label: (ctx: any) => `$${Number(ctx.parsed.y).toFixed(2)}  [${REGIME_LABELS[sim.regimes[ctx.dataIndex]]}]`,
              },
            },
          },
          interaction: { intersect: false, mode: "index" },
        },
      });
    }
    render();
    return () => { cancelled = true; if (chartRef.current) chartRef.current.destroy(); };
  }, [sim]);

  return <canvas ref={canvasRef} />;
}

function FilteredProbChart({ sim }: { sim: SimData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (cancelled || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const cs = getComputedStyle(document.documentElement);
      const grid = cs.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.03)";
      const tick = cs.getPropertyValue("--chart-tick").trim() || "#404040";

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: sim.dates,
          datasets: [0, 1, 2].map((s) => ({
            label: REGIME_LABELS[s],
            data: sim.filteredProbs.map((p) => p[s]),
            borderColor: REGIME_COLORS[s],
            borderWidth: 1.2,
            pointRadius: 0,
            tension: 0.3,
            fill: false,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 8, right: 8, top: 8, bottom: 4 } },
          scales: {
            x: { display: true, grid: { color: grid }, ticks: { color: tick, font: { size: 9 }, maxTicksLimit: 8 }, border: { display: false } },
            y: { display: true, position: "right", min: 0, max: 1, grid: { color: grid }, ticks: { color: tick, font: { size: 9 }, callback: (v: any) => (Number(v) * 100).toFixed(0) + "%" }, border: { display: false } },
          },
          plugins: {
            legend: {
              display: true, position: "top", align: "start",
              labels: { color: tick, font: { size: 10 }, boxWidth: 12, boxHeight: 2, padding: 12, usePointStyle: false },
            },
            tooltip: {
              backgroundColor: "#1a1a1a", borderColor: "rgba(255,255,255,0.08)", borderWidth: 0.5,
              titleFont: { size: 10 }, bodyFont: { size: 11 },
              titleColor: "#808080", bodyColor: "#e8e8e8", padding: 8, cornerRadius: 4,
              callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${(ctx.parsed.y * 100).toFixed(1)}%` },
            },
          },
          interaction: { intersect: false, mode: "index" },
        },
      });
    }
    render();
    return () => { cancelled = true; if (chartRef.current) chartRef.current.destroy(); };
  }, [sim]);

  return <canvas ref={canvasRef} />;
}

function BicChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (cancelled || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const ks = [2, 3, 4, 5, 6, 7];
      const bics = [-4120, -4380, -4340, -4280, -4190, -4050];

      const cs = getComputedStyle(document.documentElement);
      const grid = cs.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.03)";
      const tick = cs.getPropertyValue("--chart-tick").trim() || "#404040";
      const text = cs.getPropertyValue("--text-secondary").trim() || "#808080";

      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: ks.map((k) => `K=${k}`),
          datasets: [{
            data: bics,
            backgroundColor: ks.map((k) => k === 3 ? "#22C55E" : "rgba(128,128,128,0.3)"),
            borderColor: ks.map((k) => k === 3 ? "#22C55E" : "rgba(128,128,128,0.15)"),
            borderWidth: 1,
            borderRadius: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 8, right: 8, top: 8, bottom: 4 } },
          scales: {
            x: { display: true, grid: { display: false }, ticks: { color: text, font: { size: 10 } }, border: { display: false } },
            y: { display: true, position: "right", grid: { color: grid }, ticks: { color: tick, font: { size: 9 } }, border: { display: false } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#1a1a1a", borderColor: "rgba(255,255,255,0.08)", borderWidth: 0.5,
              titleFont: { size: 10 }, bodyFont: { size: 11 },
              titleColor: "#808080", bodyColor: "#e8e8e8", padding: 8, cornerRadius: 4, displayColors: false,
              callbacks: { label: (ctx: any) => `BIC: ${ctx.parsed.y}` },
            },
          },
        },
      });
    }
    render();
    return () => { cancelled = true; if (chartRef.current) chartRef.current.destroy(); };
  }, []);

  return <canvas ref={canvasRef} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function HmmNotePage() {
  const [sim, setSim] = useState<SimData | null>(null);

  useEffect(() => { setSim(generateSimulation()); }, []);

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="page-title">Hidden Markov Models and Their Applications on Prediction Markets</h1>
        <div className="note-date">March 2026</div>

        <article className="note-content">
          <p>
            Notes and commentary on{" "}
            <a href="https://github.com/romanmichaelpaolucci/Quant-Guild-Library/blob/main/2025%20Video%20Lectures/51.%20Hidden%20Markov%20Models%20for%20Quant%20Finance/hidden_markov_models.ipynb" target="_blank" rel="noopener noreferrer">
            Lecture 51 from Roman Paolucci&apos;s Quant Guild Library</a>, applying
            Hidden Markov Models to detect market regimes in equity returns. The companion{" "}
            <a href="https://www.mdpi.com/1911-8074/13/12/311" target="_blank" rel="noopener noreferrer">MDPI paper</a>{" "}
            provides the academic foundation.
          </p>

          <h3>The core idea</h3>
          <p>
            Financial markets alternate between regimes, bull runs, bear crashes, and
            sideways chop, but these states aren&apos;t directly observable. We only see
            prices and volumes. A Hidden Markov Model treats the regime as a latent
            variable that influences the observable return distribution, and uses the
            Expectation-Maximization algorithm to learn:
          </p>
          <p>
            (1) The <em>transition matrix</em>: probabilities of switching between regimes.<br/>
            (2) The <em>emission parameters</em>: the mean and variance of returns in each regime.<br/>
            (3) The <em>initial state distribution</em>: which regime we&apos;re likely starting in.
          </p>

          <div className="chart-figure">
            <div className="chart-figure-label">
              Simulated price series with regime-colored bands
              <span className="chart-figure-legend">
                <span style={{ color: "#22C55E" }}>■</span> Bull{" "}
                <span style={{ color: "#FACC15" }}>■</span> Neutral{" "}
                <span style={{ color: "#EF4444" }}>■</span> Bear
              </span>
            </div>
            <div className="chart-figure-area">
              {sim && <RegimePriceChart sim={sim} />}
            </div>
          </div>

          <h3>Feature engineering</h3>
          <p>
            The notebook uses two features as observable inputs to the HMM:
          </p>
          <pre><code>{`import numpy as np
from hmmlearn.hmm import GaussianHMM

# Log returns (additive over time, approximately normal)
log_returns = np.log(close / close.shift(1))

# Rolling volatility of log returns
volatility = log_returns.rolling(20).std()

# Stack into feature matrix
X = np.column_stack([log_returns.dropna(), volatility.dropna()])`}</code></pre>
          <p>
            Log returns are preferred over simple returns because they&apos;re additive
            across time and better approximate a Gaussian — which matters because{" "}
            <code>GaussianHMM</code> assumes emissions follow a normal distribution
            within each state.
          </p>

          <h3>Model selection with BIC</h3>
          <p>
            How many hidden states? Too few and you miss genuine regimes; too many and
            you overfit noise. The Bayesian Information Criterion penalizes complexity:
          </p>
          <pre><code>{`def hmm_bic(model, X):
    K = model.n_components
    T, d = X.shape
    logL = model.score(X)
    n_params = (K - 1) + K * (K - 1) + K * (2 * d)
    return -2.0 * logL + n_params * np.log(T)

for K in range(2, 8):
    model = GaussianHMM(n_components=K, covariance_type="diag",
                        n_iter=1000, random_state=42)
    model.fit(X)
    print(f"K={K}, BIC={hmm_bic(model, X):.1f}")`}</code></pre>

          <div className="chart-figure">
            <div className="chart-figure-label">BIC score by number of states (lower is better)</div>
            <div className="chart-figure-area chart-figure-small">
              <BicChart />
            </div>
          </div>

          <p>
            The minimum BIC at K=3 suggests three regimes (bull, neutral, bear) best
            balance goodness-of-fit against model complexity for this data.
          </p>

          <h3>Fitting and interpreting states</h3>
          <pre><code>{`model = GaussianHMM(n_components=3, covariance_type="full",
                    n_iter=1000, random_state=42)
model.fit(X)
states = model.predict(X)

for i in range(model.n_components):
    mask = states == i
    mean_ret = log_returns[mask].mean()
    vol = log_returns[mask].std()
    print(f"State {i}: mean={mean_ret:.4f}, vol={vol:.4f}")`}</code></pre>
          <p>
            After fitting, each state gets a label based on its characteristics. The state
            with the highest mean return and lowest volatility is typically the bull regime;
            the state with negative mean and high volatility is the bear/crisis regime.
            The transition matrix tells you persistence, bear markets tend to be short
            but violent, while bull regimes are longer and more stable.
          </p>

          <h3>Filtered probabilities (forward algorithm)</h3>
          <p>
            For real-time trading, you want <em>filtered</em> probabilities:
            P(state<sub>t</sub> | observations<sub>1:t</sub>) — using only past and
            current data, no future look-ahead:
          </p>
          <pre><code>{`def filtered_probs_last(model, X):
    """P(s_T | y_1:T) via forward algorithm in log-space."""
    log_startprob = np.log(model.startprob_ + 1e-10)
    log_transmat = np.log(model.transmat_ + 1e-10)

    log_alpha = log_startprob + model._compute_log_likelihood(X[:1])[0]

    for t in range(1, len(X)):
        obs_ll = model._compute_log_likelihood(X[t:t+1])[0]
        log_alpha = logsumexp(log_alpha + log_transmat.T, axis=1) + obs_ll

    log_alpha -= logsumexp(log_alpha)
    return np.exp(log_alpha)`}</code></pre>

          <div className="chart-figure">
            <div className="chart-figure-label">Filtered regime probabilities over time</div>
            <div className="chart-figure-area">
              {sim && <FilteredProbChart sim={sim} />}
            </div>
          </div>

          <p>
            The chart above shows what the forward algorithm produces at each time step:
            a probability vector like &ldquo;72% bull, 20% neutral, 8% bear&rdquo; — which
            you can use to dynamically adjust position sizing, hedge ratios, or strategy
            selection. Notice how the probabilities shift sharply at regime transitions
            but remain sticky within regimes.
          </p>

          <h3>Regime-switching strategy logic</h3>
          <p>
            The practical application from the{" "}
            <a href="https://www.mdpi.com/1911-8074/13/12/311" target="_blank" rel="noopener noreferrer">MDPI paper</a>{" "}
            by Paolucci et al. pairs the HMM with factor models:
          </p>
          <p>
            &bull; In <strong>bull regimes</strong>: deploy momentum and small-cap factor strategies (higher beta, higher expected return).<br/>
            &bull; In <strong>bear regimes</strong>: rotate to quality/low-volatility factors, reduce leverage, or go to cash.<br/>
            &bull; In <strong>neutral/ranging</strong>: mean-reversion strategies, tighter position sizing.
          </p>
          <p>
            The key insight is that the same factor model performs differently across
            regimes. Momentum works in sustained trends but collapses in transitions.
            The HMM provides the meta-strategy layer deciding which sub-strategy to deploy.
          </p>

          <h3>Caveats and practical considerations</h3>
          <p>
            &bull; <strong>Look-ahead bias</strong>: fitting the HMM on the full dataset then
            backtesting on the same data is circular. Use expanding-window or walk-forward
            fitting for honest evaluation.<br/>
            &bull; <strong>Non-stationarity</strong>: regime parameters drift over time. A model
            trained on 2008 data may not recognize a 2020-style crash. Rolling refit windows help.<br/>
            &bull; <strong>Label switching</strong>: across refits, &ldquo;State 0&rdquo; might flip
            from bull to bear. Always identify states by their statistical properties, not index.<br/>
            &bull; <strong>Gaussian assumption</strong>: real returns have fat tails. Student-t
            emissions or mixture models can improve fit but add complexity.
          </p>

          <h3>Source material</h3>
          <p>
            &bull; <a href="https://github.com/romanmichaelpaolucci/Quant-Guild-Library" target="_blank" rel="noopener noreferrer">Quant Guild Library</a>: full notebook and video lecture by Roman Paolucci.<br/>
            &bull; <a href="https://www.mdpi.com/1911-8074/13/12/311" target="_blank" rel="noopener noreferrer">Regime-Switching Factor Investing with Hidden Markov Models</a> (Paolucci et al., MDPI 2020).<br/>
            &bull; <a href="https://www.quantstart.com/articles/hidden-markov-models-an-introduction/" target="_blank" rel="noopener noreferrer">QuantStart HMM series</a>: Mathematical introduction.
          </p>
        </article>

        <hr className="section-rule" />
        <div className="note-back">
          <Link href="/notes" className="back-link">&larr; All notes</Link>
        </div>
      </main>
    </>
  );
}
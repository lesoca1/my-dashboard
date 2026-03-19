/**
 * Notes data store.
 * To add a new note, push an object to the array below.
 * Content supports HTML. Notes display newest-first.
 */

export interface Note {
  slug: string;
  title: string;
  date: string;        // e.g. "March 2026"
  sortDate: string;    // ISO for sorting, e.g. "2026-03-15"
  description?: string;
  content: string;     // HTML string
}

export const notes: Note[] = [

   {
    slug: "hmm-quant-finance",
    title: "Hidden Markov Models and Their Application on Prediction Markets",
    date: "March 2026",
    sortDate: "2026-03-19",
    description: "Notes on regime detection with Gaussian HMMs, based on Roman Paolucci's Quant Guild lecture.",
    content: `
      <p>
        Notes and commentary on
        <a href="https://github.com/romanmichaelpaolucci/Quant-Guild-Library/blob/main/2025%20Video%20Lectures/51.%20Hidden%20Markov%20Models%20for%20Quant%20Finance/hidden_markov_models.ipynb" target="_blank" rel="noopener noreferrer">
        Lecture 51 from Roman Paolucci's Quant Guild Library</a> applying Hidden Markov Models
        to detect market regimes in equity returns. The companion
        <a href="https://www.mdpi.com/1911-8074/13/12/311" target="_blank" rel="noopener noreferrer">MDPI paper</a>
        provides the academic foundation.
      </p>
 
      <h3>The core idea</h3>
      <p>
        Financial markets alternate between regimes (bull runs, bear crashes, and
        sideways chop) but these states aren't directly observable. We only see
        prices and volumes. A Hidden Markov Model treats the regime as a latent
        variable that influences the observable return distribution, and uses the
        Expectation-Maximization algorithm to learn:
      </p>
      <p>
        (1) The <em>transition matrix</em>: probabilities of switching between regimes.<br/>
        (2) The <em>emission parameters</em>: the mean and variance of returns in each regime.<br/>
        (3) The <em>initial state distribution</em>: which regime we're likely starting in.
      </p>
 
      <h3>Feature engineering</h3>
      <p>
        The notebook uses two features as observable inputs to the HMM:
      </p>
      <pre><code>import numpy as np
import pandas as pd
from hmmlearn.hmm import GaussianHMM
 
# Log returns (additive over time, approximately normal)
log_returns = np.log(close / close.shift(1))
 
# Rolling volatility of log returns
volatility = log_returns.rolling(20).std()
 
# Stack into feature matrix
X = np.column_stack([log_returns.dropna(), volatility.dropna()])</code></pre>
      <p>
        Log returns are preferred over simple returns in this context because they're
        additive across time and better approximate a Gaussian distribution — which
        matters because <code>GaussianHMM</code> assumes emissions follow a normal
        distribution within each state.
      </p>
 
      <h3>Model selection with BIC</h3>
      <p>
        A key question: how many hidden states? Too few and you miss genuine regimes;
        too many and you overfit noise. The notebook uses the Bayesian Information
        Criterion (BIC) to select the optimal number of states:
      </p>
      <pre><code>def hmm_bic(model, X):
    K = model.n_components
    T, d = X.shape
    logL = model.score(X)
    # Free parameters: initial probs + transitions + emissions
    n_params = (K - 1) + K * (K - 1) + K * (2 * d)
    return -2.0 * logL + n_params * np.log(T)
 
# Sweep over candidate state counts
for K in range(2, 8):
    model = GaussianHMM(
        n_components=K,
        covariance_type="diag",
        n_iter=1000,
        random_state=42,
    )
    model.fit(X)
    score = hmm_bic(model, X)
    print(f"K={K}, BIC={score:.1f}")</code></pre>
      <p>
        BIC penalizes model complexity (more states = more parameters), so the
        minimum BIC balances goodness-of-fit against parsimony. In practice,
        K=3 (bull/bear/neutral) or K=5 (strong bull/weak bull/ranging/weak bear/strong bear)
        tend to emerge as natural choices for equity indices.
      </p>
 
      <h3>Fitting and interpreting states</h3>
      <pre><code>model = GaussianHMM(
    n_components=3,
    covariance_type="full",
    n_iter=1000,
    random_state=42,
)
model.fit(X)
 
# Predict most likely state for each time step
states = model.predict(X)
 
# Interpret: sort states by mean return
for i in range(model.n_components):
    mask = states == i
    mean_ret = log_returns[mask].mean()
    vol = log_returns[mask].std()
    print(f"State {i}: mean={mean_ret:.4f}, vol={vol:.4f}, days={mask.sum()}")</code></pre>
      <p>
        After fitting, each state gets a label based on its characteristics. The state
        with the highest mean return and lowest volatility is typically the bull regime;
        the state with negative mean return and high volatility is the bear/crisis regime.
        The transition matrix tells you the persistence of each regime; bear markets
        tend to be short but violent, while bull regimes are longer and more stable.
      </p>
 
      <h3>Filtered probabilities (forward algorithm)</h3>
      <p>
        For real-time trading, you don't want smoothed probabilities (which use future data).
        You want <em>filtered</em> probabilities: P(state<sub>t</sub> | observations<sub>1:t</sub>).
        The forward algorithm computes these recursively:
      </p>
      <pre><code>def filtered_probs_last(model, X):
    """P(s_T | y_1:T) via forward algorithm in log-space."""
    log_startprob = np.log(model.startprob_ + 1e-10)
    log_transmat = np.log(model.transmat_ + 1e-10)
 
    # Initial forward variable
    log_alpha = log_startprob + model._compute_log_likelihood(X[:1])[0]
 
    for t in range(1, len(X)):
        obs_ll = model._compute_log_likelihood(X[t:t+1])[0]
        log_alpha = logsumexp(log_alpha + log_transmat.T, axis=1) + obs_ll
 
    # Normalize to probabilities
    log_alpha -= logsumexp(log_alpha)
    return np.exp(log_alpha)</code></pre>
      <p>
        This gives you a probability vector at each time step: e.g., "72% bull, 20% neutral,
        8% bear", which you can use to dynamically adjust position sizing, hedge ratios, or
        strategy selection.
      </p>
 
      <h3>Regime-switching strategy logic</h3>
      <p>
        The practical application from the
        <a href="https://www.mdpi.com/1911-8074/13/12/311" target="_blank" rel="noopener noreferrer">MDPI paper</a>
        by Paolucci et al. pairs the HMM with factor models. The idea:
      </p>
      <p>
        &bull; In <strong>bull regimes</strong>: deploy momentum and small-cap factor strategies (higher beta, higher expected return).<br/>
        &bull; In <strong>bear regimes</strong>: rotate to quality/low-volatility factors, reduce leverage, or go to cash.<br/>
        &bull; In <strong>neutral/ranging</strong>: mean-reversion strategies, tighter position sizing.
      </p>
      <p>
        The key insight is that the same factor model performs differently across regimes.
        Momentum works well in sustained trends but gets destroyed in regime transitions.
        The HMM provides the "meta-strategy" layer that decides which sub-strategy to deploy.
      </p>
 
      <h3>Caveats and practical considerations</h3>
      <p>
        &bull; <strong>Look-ahead bias</strong>: fitting the HMM on the full dataset and then
        backtesting on the same data is circular. Use expanding-window or walk-forward
        fitting for honest evaluation.<br/>
        &bull; <strong>Non-stationarity</strong>: the regime parameters themselves drift over time.
        A model trained on 2008 crisis data may not recognize a 2020-style crash.
        Rolling refit windows help.<br/>
        &bull; <strong>Label switching</strong>: across refits, "State 0" might flip from bull to bear.
        Always identify states by their statistical properties (mean, variance), not their index.<br/>
        &bull; <strong>Gaussian assumption</strong>: real returns have fat tails. Student-t emission
        models or mixture models can improve fit but add complexity.
      </p>
 
      <h3>Source material</h3>
      <p>
        &bull; <a href="https://github.com/romanmichaelpaolucci/Quant-Guild-Library" target="_blank" rel="noopener noreferrer">Quant Guild Library</a> — full notebook and video lecture by Roman Paolucci.<br/>
        &bull; <a href="https://www.mdpi.com/1911-8074/13/12/311" target="_blank" rel="noopener noreferrer">Regime-Switching Factor Investing with Hidden Markov Models</a> (Paolucci et al., MDPI 2020).<br/>
        &bull; <a href="https://www.quantstart.com/articles/hidden-markov-models-an-introduction/" target="_blank" rel="noopener noreferrer">QuantStart HMM series</a> — excellent mathematical introduction.
      </p>
    `,
  },

   {
    slug: "page.tsx",
    title: "Testing",
    date: "March 2026",
    sortDate: "2026-03-17",
    description: "Test.",
    content: `
Test case
    `,
  },
 
];



/** Get all notes sorted newest first */
export function getAllNotes(): Note[] {
  return [...notes].sort(
    (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
  );
}

/** Get a single note by slug */
export function getNoteBySlug(slug: string): Note | undefined {
  return notes.find((n) => n.slug === slug);
}
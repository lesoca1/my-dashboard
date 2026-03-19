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
    slug: "prediction-markets-hmm",
    title: "Hidden Markov Models on Prediction Markets",
    date: "March 2026",
    sortDate: "2026-03-15",
    description: "Applying regime detection to Polymarket event contracts.",
    content: `
      <p>
        Prediction markets present a unique opportunity for quantitative modeling.
        Unlike traditional financial markets, event contracts have a known terminal value
        (0 or 1), which constrains the price process in interesting ways.
      </p>
      <p>
        I've been experimenting with Hidden Markov Models to detect regime shifts
        in prediction market prices — specifically, transitions between
        "informationally efficient" and "momentum-driven" states.
      </p>
      <p>
        The intuition is simple: when new information arrives (a poll, a news event),
        prices jump and the market enters an adjustment regime. Between shocks,
        prices tend to mean-revert or drift with retail flow. An HMM can learn
        these latent states from price and volume data alone.
      </p>
      <h3>Preliminary results</h3>
      <p>
        On a sample of 200+ resolved Polymarket contracts, a 2-state Gaussian HMM
        trained on log-returns and volume z-scores achieves ~60% accuracy at
        predicting whether a contract will move more than 5 cents in the next 24 hours
        when the model signals "high-information" state.
      </p>
      <p>
        More work is needed on feature engineering and out-of-sample validation.
        Will update this note as the research progresses.
      </p>
    `,
  },
  {
    slug: "bayesian-kelly-sizing",
    title: "Bayesian Kelly Criterion for Event Contracts",
    date: "February 2026",
    sortDate: "2026-02-20",
    description: "Position sizing under uncertainty in binary markets.",
    content: `
      <p>
        The Kelly criterion tells you the optimal fraction of your bankroll to wager
        when you know your edge. In prediction markets, the challenge is that your
        edge estimate is itself uncertain.
      </p>
      <p>
        A Bayesian approach treats the true probability as a random variable with
        a posterior distribution (say, Beta-distributed). Instead of plugging in a
        point estimate, you integrate the Kelly fraction over the posterior.
        This naturally produces more conservative sizing when uncertainty is high.
      </p>
      <h3>Key result</h3>
      <p>
        For a Beta(α, β) posterior and market price <em>p</em>, the Bayesian Kelly
        fraction is approximately:
      </p>
      <pre><code>f* ≈ (α/(α+β) - p) / (1 - p) × (α+β) / (α+β+1)</code></pre>
      <p>
        The last factor acts as a "confidence discount" — it shrinks toward zero
        as your sample size (α+β) decreases, preventing over-betting on thin evidence.
      </p>
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
import Nav from "./components/Nav";
import Link from "next/link";
import { getAllNotes } from "./lib/notes";

export default function Home() {
  const notes = getAllNotes();

  // Group notes by date label (e.g. "March 2026")
  const grouped = notes.reduce<Record<string, typeof notes>>((acc, note) => {
    if (!acc[note.date]) acc[note.date] = [];
    acc[note.date].push(note);
    return acc;
  }, {});

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="home-name">Leonardo Sorensen</h1>

        <p className="home-bio">
          This is where I store public notes on topics I&apos;ve spent some time
          thinking about — mostly prediction markets, quantitative modeling,
          and Bayesian inference applied to event contracts.
        </p>

        <div className="home-links">
          <a href="https://github.com/lesoca1" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className="link-sep">//</span>
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer">
            Polymarket
          </a>
          <span className="link-sep">//</span>
          <Link href="/tracker">
            Portfolio Tracker
          </Link>
        </div>

        <hr className="section-rule" />

        <ul className="notes-timeline">
          {Object.entries(grouped).map(([date, items]) =>
            items.map((note) => (
              <li key={note.slug} className="timeline-item">
                <span className="timeline-date">{note.date}:</span>
                <Link href={`/notes/${note.slug}`} className="timeline-link">
                  {note.title}
                </Link>
              </li>
            ))
          )}
        </ul>
      </main>
    </>
  );
}
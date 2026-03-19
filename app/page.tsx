import Nav from "@/app/components/Nav";
import Link from "next/link";
import { getAllNotes, type Note } from "@/app/lib/notes";

export default function Home() {
  const allNotes: Note[] = getAllNotes();

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="home-name">AlgoTrading Project</h1>

        <p className="home-bio">
          Respository of notes, comments and progress updates on topics related to algorithmic trading, and its implementations on prediction markets and alike.
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
          {allNotes.map((note: Note) => (
            <li key={note.slug} className="timeline-item">
              <span className="timeline-date">{note.date}:</span>
              <Link href={`/notes/${note.slug}`} className="timeline-link">
                {note.title}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
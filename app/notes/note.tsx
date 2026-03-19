import Nav from "../components/Nav";
import Link from "next/link";
import { getAllNotes } from "../lib/notes";

export const metadata = {
  title: "Notes — Leonardo Sorensen",
};

export default function NotesPage() {
  const notes = getAllNotes();

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="page-title">Notes</h1>

        <hr className="section-rule" />

        <ul className="notes-timeline">
          {notes.map((note) => (
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
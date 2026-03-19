import Nav from "@/app/components/Nav";
import Link from "next/link";
import { getAllNotes, type Note } from "@/app/lib/notes";

export const metadata = {
  title: "Notes — Leonardo Sorensen",
};

export default function NotesPage() {
  const allNotes: Note[] = getAllNotes();

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="page-title">Notes</h1>

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
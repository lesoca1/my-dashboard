import Nav from "../../components/Nav";
import Link from "next/link";
import { getNoteBySlug, getAllNotes } from "../../lib/notes";
import { notFound } from "next/navigation";

/** Pre-generate all note pages at build time */
export function generateStaticParams() {
  return getAllNotes().map((note) => ({ slug: note.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const note = getNoteBySlug(params.slug);
  return {
    title: note ? `${note.title} — Leonardo Sorensen` : "Note not found",
  };
}

export default function NotePage({ params }: { params: { slug: string } }) {
  const note = getNoteBySlug(params.slug);

  if (!note) {
    notFound();
  }

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="page-title">{note.title}</h1>
        <div className="note-date">{note.date}</div>

        <article
          className="note-content"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />

        <hr className="section-rule" />

        <div className="note-back">
          <Link href="/notes" className="back-link">
            &larr; All notes
          </Link>
        </div>
      </main>
    </>
  );
}
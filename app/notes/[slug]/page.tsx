import Nav from "@/app/components/Nav";
import Link from "next/link";
import { getNoteBySlug, getAllNotes } from "@/app/lib/notes";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getAllNotes().map((note) => ({ slug: note.slug }));
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = getNoteBySlug(slug);

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
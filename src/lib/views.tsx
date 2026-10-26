import "server-only";
import { notFound } from "next/navigation";
import Review from "@/components/Review";
import PageList, { notebookLabel } from "@/components/PageList";
import Book from "@/components/Book";
import { getPage, imageUrl, imageUrls, isOwner, listPages } from "./server";

/** Shared by the private routes (/p, /book) and the open demo (/demo, /demo/book). */

export async function ListView({ demo, intro }: { demo: boolean; intro?: React.ReactNode }) {
  const [pages, owner] = await Promise.all([listPages(demo), isOwner()]);
  const thumbs = await imageUrls(pages);
  return (
    <PageList pages={pages} thumbs={thumbs} base={demo ? "/demo" : "/p"} demo={demo} owner={owner} intro={intro} />
  );
}

export async function ReviewView({ id, demo }: { id: string; demo: boolean }) {
  const page = await getPage(id);
  if (!page || page.is_demo !== demo) notFound();
  const pages = await listPages(demo);
  const idx = pages.findIndex((p) => p.id === id);
  const nextTodo = pages.slice(idx + 1).find((p) => p.status !== "done") ?? null;
  const url = await imageUrl(page);
  const label = `${notebookLabel(page.notebook)} · पन्ना ${page.seq}`;
  return (
    <Review
      key={page.id + page.updated_at}
      page={page}
      imageUrl={url}
      base={demo ? "/demo" : "/p"}
      prevId={idx > 0 ? pages[idx - 1].id : null}
      nextId={idx >= 0 && idx < pages.length - 1 ? pages[idx + 1].id : null}
      nextTodoId={nextTodo?.id ?? null}
      position={`${idx + 1} / ${pages.length}`}
      label={label}
    />
  );
}

export async function BookView({ demo, std }: { demo: boolean; std: boolean }) {
  const [pages, owner] = await Promise.all([listPages(demo), isOwner()]);
  return <Book pages={pages} std={std} demo={demo} owner={owner} />;
}

import "server-only";
import { notFound } from "next/navigation";
import Review from "@/components/Review";
import PageList, { notebookLabel } from "@/components/PageList";
import Book from "@/components/Book";
import { getPage, imageUrl, imageUrls, listPages } from "./server";

/** Shared by the private routes (/p, /book) and the open demo (/demo, /demo/book). */

export async function ListView({ demo, intro }: { demo: boolean; intro?: React.ReactNode }) {
  const pages = await listPages(demo);
  const thumbs = await imageUrls(pages);
  return (
    <PageList
      pages={pages}
      thumbs={thumbs}
      base={demo ? "/demo" : "/p"}
      bookHref={demo ? "/demo/book" : "/book"}
      intro={intro}
    />
  );
}

export async function ReviewView({ id, demo }: { id: string; demo: boolean }) {
  const page = await getPage(id);
  if (!page || page.is_demo !== demo) notFound();
  const pages = await listPages(demo);
  const idx = pages.findIndex((p) => p.id === id);
  const next = pages.slice(idx + 1).find((p) => p.status !== "done") ?? null;
  const url = await imageUrl(page);
  const label = `${notebookLabel(page.notebook)} · पन्ना ${page.seq}${page.adhyay ? ` · अध्याय ${page.adhyay}` : ""}`;
  return (
    <Review
      key={page.id + page.updated_at}
      page={page}
      imageUrl={url}
      base={demo ? "/demo" : "/p"}
      nextId={next?.id ?? null}
      label={label}
    />
  );
}

export async function BookView({ demo, std }: { demo: boolean; std: boolean }) {
  const pages = await listPages(demo);
  return <Book pages={pages} std={std} base={demo ? "/demo" : "/p"} bookHref={demo ? "/demo/book" : "/book"} />;
}

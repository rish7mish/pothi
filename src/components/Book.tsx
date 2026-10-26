import Link from "next/link";
import { plainText, skandhaName, standardize } from "@/lib/text";
import type { PageRow } from "@/lib/types";
import PrintButton from "./PrintButton";
import Nav from "./Nav";

interface Chapter {
  skandha: number | null;
  adhyay: number | null;
  pages: PageRow[];
}

/**
 * Pages without a heading continue the chapter of the previous page in the same notebook.
 * Chapters are then ordered by skandha and adhyay, whichever notebook they came from.
 */
export function assemble(pages: PageRow[]): Chapter[] {
  const sorted = [...pages].sort((a, b) => a.notebook.localeCompare(b.notebook) || a.seq - b.seq);
  const chapters: Chapter[] = [];
  let curBook = "";
  for (const p of sorted) {
    if (!p.blocks?.length) continue;
    const prev: Chapter | undefined = chapters[chapters.length - 1];
    const newBook = p.notebook !== curBook || !prev;
    const inherited: number | null = newBook ? null : prev.skandha;
    const sk: number | null = p.skandha ?? inherited;
    const starts = newBook || p.adhyay !== null || (p.skandha !== null && p.skandha !== prev.skandha);
    if (starts) {
      chapters.push({ skandha: sk, adhyay: p.adhyay, pages: [p] });
    } else {
      prev.pages.push(p);
    }
    curBook = p.notebook;
  }
  const key = (n: number | null) => (n === null ? 999 : n);
  return chapters.sort((a, b) => key(a.skandha) - key(b.skandha) || key(a.adhyay) - key(b.adhyay));
}

export default function Book({
  pages,
  std,
  demo,
  owner,
}: {
  pages: PageRow[];
  std: boolean;
  demo: boolean;
  owner: boolean;
}) {
  const bookHref = demo ? "/demo/book" : "/book";
  const chapters = assemble(pages);
  const pending = pages.filter((p) => p.blocks?.length && p.status !== "done").length;
  const fix = (s: string) => (std ? standardize(s) : s);
  let lastSkandha: number | null | undefined = undefined;

  return (
    <>
      <Nav active="book" demo={demo} owner={owner} />
      <div className="bookbar no-print">
        <div className="wrap">
          <span className="muted" style={{ fontSize: 16 }}>वर्तनी:</span>
          <span className="seg">
            <Link className={std ? "" : "on"} href={bookHref}>
              जैसी लिखी
            </Link>
            <Link className={std ? "on" : ""} href={`${bookHref}?std=1`}>
              मानक (में, हुए…)
            </Link>
          </span>
          <PrintButton />
          {pending > 0 && <span className="chip warn">{pending} पन्ने अभी जाँचे नहीं गए</span>}
        </div>
      </div>

      <article className="book">
        <section className="cover">
          <h1>श्रीमद्भागवत कथा</h1>
          <div className="sub">कथा सुनते हुए लिखी गई टिप्पणियाँ</div>
          {process.env.BOOK_AUTHOR && <div className="by">{process.env.BOOK_AUTHOR}</div>}
        </section>

        {chapters.length === 0 && <p>अभी किताब में कोई पन्ना नहीं है।</p>}

        {chapters.map((ch, ci) => {
          const showSk = ch.skandha !== lastSkandha;
          lastSkandha = ch.skandha;
          return (
            <section key={ci}>
              {showSk && <h2 className="sk">{skandhaName(ch.skandha)}</h2>}
              {ch.adhyay !== null && <div className="ch-label">अध्याय {ch.adhyay}</div>}
              {ch.pages.map((p) => (
                <div key={p.id}>
                  {p.blocks.map((b, i) => {
                    const t = fix(plainText(b.text, p.flags));
                    if (!t) return null;
                    const note = p.notes?.[i];
                    return (
                      <div key={i}>
                        {b.type === "heading" ? <h3>{t}</h3> : <p>{t}</p>}
                        {note && (
                          <div className="bnote">
                            <b>भावार्थ</b>
                            <div>{fix(note)}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="src no-print">
                    {p.notebook} · पन्ना {p.seq}
                    {p.date_written ? ` · ${p.date_written}` : ""}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </article>
    </>
  );
}

import Link from "next/link";
import { openFlagCount } from "@/lib/text";
import type { PageRow } from "@/lib/types";

function StatusChip({ p }: { p: PageRow }) {
  if (p.status === "done") return <span className="chip ok">✓ पूरा</span>;
  if (p.status === "ocr_failed") return <span className="chip bad">पढ़ा नहीं गया</span>;
  if (p.status === "new") return <span className="chip">तैयार हो रहा है</span>;
  const n = openFlagCount(p);
  return n ? <span className="chip warn">{n} शब्द बाकी</span> : <span className="chip warn">जाँचना है</span>;
}

export function notebookLabel(nb: string) {
  return /^\d{4}$/.test(nb) ? `${nb} की कॉपी` : nb;
}

export default function PageList({
  pages,
  thumbs,
  base,
  bookHref,
  intro,
}: {
  pages: PageRow[];
  thumbs: Record<string, string>;
  base: string;
  bookHref: string;
  intro?: React.ReactNode;
}) {
  const done = pages.filter((p) => p.status === "done").length;
  const next = pages.find((p) => p.status === "review");
  const books = Array.from(new Set(pages.map((p) => p.notebook)));

  return (
    <main className="wrap">
      <div className="topbar">
        <h1>पोथी</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {next && (
            <Link className="btn primary" href={`${base}/${next.id}`}>
              काम शुरू करें →
            </Link>
          )}
          <Link className="btn" href={bookHref}>
            📖 किताब देखें
          </Link>
        </div>
      </div>
      {intro}
      <div className="muted">
        {pages.length} में से {done} पन्ने पूरे
      </div>
      <div className="progress" aria-hidden>
        <i style={{ width: `${pages.length ? (done / pages.length) * 100 : 0}%` }} />
      </div>

      {pages.length === 0 && <p className="muted">अभी कोई पन्ना नहीं है।</p>}

      {books.map((nb) => (
        <section className="notebook" key={nb}>
          <h2>{notebookLabel(nb)}</h2>
          <div className="grid">
            {pages
              .filter((p) => p.notebook === nb)
              .map((p) => (
                <Link className="card pcard" key={p.id} href={`${base}/${p.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbs[p.id]} alt="" loading="lazy" />
                  <span className="meta">
                    <b>पन्ना {p.seq}</b>
                    {p.adhyay ? <span className="muted" style={{ fontSize: 15 }}>अध्याय {p.adhyay}</span> : null}
                    <StatusChip p={p} />
                  </span>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}

import Link from "next/link";
import { openFlagCount } from "@/lib/text";
import type { PageRow } from "@/lib/types";
import Nav from "./Nav";

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
  demo,
  owner,
  intro,
}: {
  pages: PageRow[];
  thumbs: Record<string, string>;
  base: string;
  demo: boolean;
  owner: boolean;
  intro?: React.ReactNode;
}) {
  const done = pages.filter((p) => p.status === "done").length;
  const next = pages.find((p) => p.status === "review");
  const books = Array.from(new Set(pages.map((p) => p.notebook)));

  return (
    <>
      <Nav active="pages" demo={demo} owner={owner} />
      <main className="wrap">
        {intro}

        {next ? (
          <Link className="card nextcard" href={`${base}/${next.id}`}>
            <span>
              <span className="muted" style={{ fontSize: 16 }}>अगला पन्ना</span>
              <b>
                {notebookLabel(next.notebook)} · पन्ना {next.seq}
              </b>
              <StatusChip p={next} />
            </span>
            <span className="btn primary">शुरू करें →</span>
          </Link>
        ) : pages.length > 0 ? (
          <div className="card nextcard done">
            <b>✓ सब पन्ने पूरे हो गए</b>
            <Link className="btn" href={demo ? "/demo/book" : "/book"}>
              📖 किताब देखें
            </Link>
          </div>
        ) : null}

        {(owner || demo) && (
          <div className="quickadd">
            {!demo && (
              <Link className="btn" href="/admin">
                📷 फोटो से पन्ना जोड़ें
              </Link>
            )}
            <Link className="btn" href={demo ? "/demo/add" : "/admin?mode=speak"}>
              🎙 बोलकर पन्ना जोड़ें
            </Link>
          </div>
        )}

        <div className="muted" style={{ marginTop: 16 }}>
          {pages.length} में से {done} पन्ने पूरे
        </div>
        <div className="progress" aria-hidden>
          <i style={{ width: `${pages.length ? (done / pages.length) * 100 : 0}%` }} />
        </div>

        {pages.length === 0 && (
          <p className="muted">
            अभी कोई पन्ना नहीं है।{" "}
            {owner && !demo && <Link href="/admin">पन्ने जोड़ें →</Link>}
          </p>
        )}

        {books.map((nb) => {
          const list = pages.filter((p) => p.notebook === nb);
          const nbDone = list.filter((p) => p.status === "done").length;
          return (
            <section className="notebook" key={nb}>
              <h2>
                {notebookLabel(nb)}{" "}
                <span className="muted" style={{ fontSize: 16, fontWeight: 400 }}>
                  ({nbDone}/{list.length} पूरे)
                </span>
              </h2>
              <div className="grid">
                {list.map((p) => (
                  <Link className="card pcard" key={p.id} href={`${base}/${p.id}`}>
                    {thumbs[p.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[p.id]} alt="" loading="lazy" />
                    ) : (
                      <span className="nothumb">🎙<small>बोलकर लिखा</small></span>
                    )}
                    <span className="meta">
                      <b>पन्ना {p.seq}</b>
                      {p.adhyay ? <span className="muted" style={{ fontSize: 15 }}>अध्याय {p.adhyay}</span> : null}
                      <StatusChip p={p} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}

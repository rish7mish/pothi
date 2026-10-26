import Link from "next/link";
import { isOwner } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const owner = await isOwner();
  return (
    <main className="wrap">
      <section className="hero">
        <h1>पोथी</h1>
        <p style={{ fontSize: 22, margin: "6px 0 4px" }}>हाथ से लिखी कॉपी से छपी हुई किताब तक</p>
        <p className="en">
          My mother wrote her retelling of the Shrimad Bhagavat by hand, in notebooks from 2008 and 2022. A typist&apos;s
          copy lost the meaning. Pothi reads each page with OCR, highlights only the words it is unsure of, and lets her
          correct them and add explanations <b>by voice</b> on her tablet. The result is a print-ready book.
        </p>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn primary" href="/demo">
          Try the demo →
        </Link>
        {owner && (
          <>
            <Link className="btn" href="/p">
              मेरे पन्ने
            </Link>
            <Link className="btn" href="/admin">
              Upload pages
            </Link>
          </>
        )}
      </div>

      <div className="steps">
        <div className="card">
          <b>1 · फोटो</b>
          <span className="muted">Each notebook page is photographed and uploaded.</span>
        </div>
        <div className="card">
          <b>2 · OCR</b>
          <span className="muted">Claude transcribes her handwriting exactly as written and flags every word it doubts.</span>
        </div>
        <div className="card">
          <b>3 · आवाज़ से जाँच</b>
          <span className="muted">She taps a yellow word and speaks the right one with Wispr Flow. No typing.</span>
        </div>
        <div className="card">
          <b>4 · किताब</b>
          <span className="muted">Chapters are assembled in Bhagavat order and printed as an A5 book.</span>
        </div>
      </div>
    </main>
  );
}

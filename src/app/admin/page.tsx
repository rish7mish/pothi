import Link from "next/link";
import Uploader from "@/components/Uploader";
import { listPages } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const pages = await listPages(false);
  const pendingOcr = pages
    .filter((p) => p.status === "new" || p.status === "ocr_failed")
    .map((p) => ({ id: p.id, label: `${p.notebook} · पन्ना ${p.seq}`, error: p.ocr_error }));
  const notebooks = Array.from(new Set(["2008", "2022", ...pages.map((p) => p.notebook)]));
  return (
    <main className="wrap">
      <div className="topbar">
        <h1>पन्ने जोड़ें</h1>
        <Link className="btn small" href="/p">
          ← पन्ने
        </Link>
      </div>
      <p className="muted">
        Choose the notebook, pick photos in page order, and upload. Each page is read by OCR right after upload (about
        30–60 seconds a page). Her link is <code>/k/&lt;ACCESS_KEY&gt;</code>.
      </p>
      <Uploader notebooks={notebooks} pendingOcr={pendingOcr} />
    </main>
  );
}

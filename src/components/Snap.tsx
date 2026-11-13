"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { shrink } from "@/lib/shrink";
import { notebookLabel } from "./PageList";

/** Reading runs behind the scenes, two pages at a time; a page that fails waits on the admin screen. */
const waiting: string[] = [];
let running = 0;
function readLater(id: string) {
  waiting.push(id);
  while (running < 2 && waiting.length) {
    const next = waiting.shift()!;
    running++;
    fetch(`/api/ocr/${next}`, { method: "POST", keepalive: true })
      .catch(() => {})
      .finally(() => {
        running--;
        if (waiting.length) readLater(waiting.shift()!);
      });
  }
}

export default function Snap({ notebook, saved }: { notebook: string; saved: number }) {
  const camera = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState(saved);
  const [sending, setSending] = useState(0);
  const [last, setLast] = useState<{ url: string; seq: number } | null>(null);
  const [failed, setFailed] = useState<Blob[]>([]);

  async function send(photo: Blob) {
    setSending((n) => n + 1);
    try {
      const fd = new FormData();
      fd.append("file", photo, "page.jpg");
      fd.append("notebook", notebook);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.status);
      setCount((n) => n + 1);
      setLast((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { url: URL.createObjectURL(photo), seq: j.seq };
      });
      readLater(j.id);
    } catch {
      setFailed((f) => [...f, photo]);
    } finally {
      setSending((n) => n - 1);
    }
  }

  async function taken(file: File | undefined) {
    if (!file) return;
    try {
      await send(await shrink(file));
    } catch {
      setFailed((f) => [...f, file]);
    }
  }

  function retry() {
    const again = failed;
    setFailed([]);
    // One at a time, so the pages keep their order.
    again.reduce((p, b) => p.then(() => send(b)), Promise.resolve());
  }

  return (
    <main className="snap">
      <Link href="/p" className="snapback">
        ← पन्ने
      </Link>
      <button className="snapbtn" onClick={() => camera.current?.click()}>
        <span className="ic">📷</span>
        फोटो खींचें
      </button>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          taken(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="snapstate" aria-live="polite">
        {sending > 0 && <p className="chip warn">सेव हो रही है…</p>}
        {failed.length > 0 && (
          <p className="snapfail">
            {failed.length} फोटो सेव नहीं हुई।{" "}
            <button className="btn small" onClick={retry}>
              फिर से भेजें
            </button>
          </p>
        )}
        {last && sending === 0 && failed.length === 0 && (
          <p className="snapok">✓ पन्ना {last.seq} सेव हो गया</p>
        )}
        {last && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="snapthumb" src={last.url} alt="" />
        )}
      </div>

      <p className="muted snapfoot">
        {notebookLabel(notebook)} · {count} पन्ने सेव हैं
      </p>
    </main>
  );
}

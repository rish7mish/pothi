"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { name: string; state: string };

/** Shrink a phone photo to ~2000px JPEG, honouring EXIF rotation. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize failed"))), "image/jpeg", 0.85),
  );
}

async function ocr(id: string): Promise<string> {
  const r = await fetch(`/api/ocr/${id}`, { method: "POST" });
  const j = await r.json().catch(() => ({}));
  return r.ok ? `✓ पढ़ लिया (${j.flags} शब्द जाँचने हैं)` : `OCR विफल: ${j.error ?? r.status}`;
}

export default function Uploader({
  notebooks,
  pendingOcr,
}: {
  notebooks: string[];
  pendingOcr: { id: string; label: string; error: string | null }[];
}) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(notebooks[0] ?? "2008");
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const set = (i: number, state: string) => setRows((r) => r.map((x, k) => (k === i ? { ...x, state } : x)));

  async function run() {
    setBusy(true);
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setRows(list.map((f) => ({ name: f.name, state: "रुका है" })));
    for (let i = 0; i < list.length; i++) {
      try {
        set(i, "छोटा कर रहे हैं…");
        const blob = await shrink(list[i]);
        set(i, "अपलोड…");
        const fd = new FormData();
        fd.append("file", blob, "page.jpg");
        fd.append("notebook", notebook);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? r.status);
        set(i, `पन्ना ${j.seq} · OCR चल रहा है…`);
        set(i, `पन्ना ${j.seq} · ${await ocr(j.id)}`);
      } catch (e) {
        set(i, `गड़बड़: ${e instanceof Error ? e.message : e}`);
      }
    }
    setBusy(false);
    setFiles([]);
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          कॉपी{" "}
          <input
            list="nbs"
            value={notebook}
            onChange={(e) => setNotebook(e.target.value)}
            style={{ minHeight: 44, border: "2px solid var(--line)", borderRadius: 10, padding: "4px 10px", width: 120 }}
          />
          <datalist id="nbs">
            {notebooks.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        <button className="btn primary" disabled={busy || !files.length || !notebook.trim()} onClick={run}>
          {busy ? "चल रहा है…" : `${files.length || ""} पन्ने अपलोड करें`}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 15 }}>
        Files are uploaded in filename order, so camera names like 20261025_144458.jpg keep the page order.
      </p>
      {rows.map((r, i) => (
        <div className="uprow" key={i}>
          <span className="n">{r.name}</span>
          <span>{r.state}</span>
        </div>
      ))}

      {pendingOcr.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>पढ़ना बाकी</h3>
          {pendingOcr.map((p) => (
            <RetryRow key={p.id} {...p} />
          ))}
        </>
      )}
    </div>
  );
}

function RetryRow({ id, label, error }: { id: string; label: string; error: string | null }) {
  const router = useRouter();
  const [state, setState] = useState(error ? `पिछली बार: ${error}` : "");
  return (
    <div className="uprow">
      <span className="n">{label}</span>
      <span className="muted">{state}</span>
      <button
        className="btn small"
        onClick={async () => {
          setState("OCR चल रहा है…");
          setState(await ocr(id));
          router.refresh();
        }}
      >
        फिर से पढ़ें
      </button>
    </div>
  );
}

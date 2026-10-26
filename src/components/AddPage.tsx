"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { skandhaName } from "@/lib/text";

type Row = { name: string; state: string; id?: string };
type Mode = "photo" | "speak";

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

async function ocr(id: string): Promise<{ ok: boolean; msg: string }> {
  const r = await fetch(`/api/ocr/${id}`, { method: "POST" });
  const j = await r.json().catch(() => ({}));
  return r.ok
    ? { ok: true, msg: `✓ पढ़ लिया — ${j.flags} शब्द जाँचने हैं` }
    : { ok: false, msg: `पढ़ा नहीं गया: ${j.error ?? r.status}` };
}

function NotebookPicker({
  notebooks,
  value,
  onChange,
}: {
  notebooks: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [custom, setCustom] = useState(false);
  return (
    <div className="field">
      <span className="flabel">कौन सी कॉपी?</span>
      <div className="choices">
        {notebooks.map((n) => (
          <button
            key={n}
            type="button"
            className={`choice ${!custom && value === n ? "on" : ""}`}
            onClick={() => {
              setCustom(false);
              onChange(n);
            }}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className={`choice ${custom ? "on" : ""}`}
          onClick={() => {
            setCustom(true);
            onChange("");
          }}
        >
          + नई
        </button>
      </div>
      {custom && (
        <input className="tin" value={value} placeholder="कॉपी का नाम" onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function AddPage({
  notebooks,
  pendingOcr,
  demo,
  initialMode,
}: {
  notebooks: string[];
  pendingOcr: { id: string; label: string; error: string | null }[];
  demo: boolean;
  initialMode: Mode;
}) {
  const base = demo ? "/demo" : "/p";
  const [mode, setMode] = useState<Mode>(demo ? "speak" : initialMode);

  return (
    <main className="wrap">
      <h1 className="h1">पन्ना जोड़ें</h1>
      <div className="modes">
        {!demo && (
          <button className={`mode ${mode === "photo" ? "on" : ""}`} onClick={() => setMode("photo")}>
            <span className="ic">📷</span>
            <b>फोटो से</b>
            <span className="muted">कॉपी के पन्ने की फोटो लें — कंप्यूटर पढ़ लेगा</span>
          </button>
        )}
        <button className={`mode ${mode === "speak" ? "on" : ""}`} onClick={() => setMode("speak")}>
          <span className="ic">🎙</span>
          <b>बोलकर</b>
          <span className="muted">फोटो के बिना — सीधे बोलकर पन्ना लिखें</span>
        </button>
      </div>

      {mode === "photo" && !demo && <PhotoAdd notebooks={notebooks} base={base} />}
      {mode === "speak" && <SpeakAdd notebooks={notebooks} base={base} demo={demo} />}

      {!demo && pendingOcr.length > 0 && (
        <section className="card" style={{ padding: 16, marginTop: 20 }}>
          <h3 style={{ margin: "0 0 8px" }}>पढ़ना बाकी</h3>
          {pendingOcr.map((p) => (
            <RetryRow key={p.id} {...p} />
          ))}
        </section>
      )}
    </main>
  );
}

function PhotoAdd({ notebooks, base }: { notebooks: string[]; base: string }) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(notebooks[0] ?? "2008");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  async function run(files: File[]) {
    if (!files.length || !notebook.trim()) return;
    setBusy(true);
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const start = rows.length;
    setRows((r) => [...r, ...list.map((f) => ({ name: f.name, state: "रुका है" }))]);
    const set = (i: number, patch: Partial<Row>) =>
      setRows((r) => r.map((x, k) => (k === start + i ? { ...x, ...patch } : x)));
    for (let i = 0; i < list.length; i++) {
      try {
        set(i, { state: "भेज रहे हैं…" });
        const fd = new FormData();
        fd.append("file", await shrink(list[i]), "page.jpg");
        fd.append("notebook", notebook.trim());
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? r.status);
        set(i, { name: `${notebook} · पन्ना ${j.seq}`, state: "पढ़ रहे हैं… (लगभग 1 मिनट)", id: j.id });
        const res = await ocr(j.id);
        set(i, { state: res.msg });
      } catch (e) {
        set(i, { state: `गड़बड़: ${e instanceof Error ? e.message : e}` });
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="card addcard">
      <NotebookPicker notebooks={notebooks} value={notebook} onChange={setNotebook} />
      <div className="row2">
        <button className="btn primary big" disabled={busy || !notebook.trim()} onClick={() => camera.current?.click()}>
          📷 फोटो खींचें
        </button>
        <button className="btn big" disabled={busy || !notebook.trim()} onClick={() => gallery.current?.click()}>
          🖼 पहले से ली गई फोटो चुनें
        </button>
      </div>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          run(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          run(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <p className="hint">
        पन्ना सीधा रखें, रोशनी में, एक फोटो में एक ही पन्ना। हर फोटो के बाद अगला पन्ना खींच सकते हैं — पढ़ना साथ-साथ
        चलता रहेगा।
      </p>
      {rows.length > 0 && (
        <div className="uplist">
          {rows.map((r, i) => (
            <div className="uprow" key={i}>
              <span className="n">{r.name}</span>
              <span>{r.state}</span>
              {r.id && r.state.startsWith("✓") && (
                <Link className="btn small" href={`${base}/${r.id}`}>
                  जाँचें →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SpeakAdd({ notebooks, base, demo }: { notebooks: string[]; base: string; demo: boolean }) {
  const router = useRouter();
  const [notebook, setNotebook] = useState(notebooks[0] ?? "बोले गए पन्ने");
  const [skandha, setSkandha] = useState<number | null>(null);
  const [adhyay, setAdhyay] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/dictate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ demo, notebook, title, text, skandha, adhyay }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? "सेव नहीं हुआ");
      return;
    }
    router.push(`${base}/${j.id}`);
  }

  return (
    <section className="card addcard">
      <NotebookPicker notebooks={notebooks} value={notebook} onChange={setNotebook} />
      <div className="field inline">
        <label>
          <span className="flabel">स्कन्ध</span>
          <select
            className="tin"
            value={skandha ?? ""}
            onChange={(e) => setSkandha(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">पिछले पन्ने जैसा</option>
            <option value="0">माहात्म्य</option>
            {Array.from({ length: 12 }, (_, k) => (
              <option key={k + 1} value={k + 1}>
                {skandhaName(k + 1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="flabel">अध्याय</span>
          <input
            className="tin"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            style={{ width: 110 }}
            value={adhyay ?? ""}
            onChange={(e) => setAdhyay(e.target.value === "" ? null : Math.max(1, Math.floor(Number(e.target.value))))}
          />
        </label>
      </div>
      <label className="field">
        <span className="flabel">शीर्षक (अगर हो)</span>
        <input className="tin serif" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span className="flabel">पन्ने का पाठ</span>
        <textarea
          className="tin serif dict"
          value={text}
          placeholder="यहाँ टैप करें, Wispr माइक दबाएँ और बोलें…"
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className="hint">नया भाग शुरू करना हो तो नई पंक्ति पर बोलें। सेव करने के बाद किसी भी शब्द पर टैप करके उसे बदल सकती हैं, और हर भाग का अर्थ भी जोड़ सकती हैं।</p>
      {err && <p className="chip bad">{err}</p>}
      <button className="btn ok big" disabled={busy || !text.trim()} onClick={save}>
        {busy ? "सेव हो रहा है…" : "✓ पन्ना सेव करें"}
      </button>
    </section>
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
          setState("पढ़ रहे हैं…");
          setState((await ocr(id)).msg);
          router.refresh();
        }}
      >
        फिर से पढ़ें
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flagText, openFlagCount, plainText, skandhaName, tokenize, MARKER } from "@/lib/text";
import type { Block, Flag, PagePatch, PageRow } from "@/lib/types";

type Sheet =
  | { kind: "flag"; id: string }
  | { kind: "para"; index: number }
  | { kind: "note"; index: number }
  | null;

type SaveState = "idle" | "saving" | "saved" | "error";

const ZOOMS = [100, 150, 200, 300];

export default function Review({
  page,
  imageUrl,
  base,
  nextId,
  label,
}: {
  page: PageRow;
  imageUrl: string;
  base: string;
  nextId: string | null;
  label: string;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(page.blocks);
  const [flags, setFlags] = useState<Record<string, Flag>>(page.flags);
  const [notes, setNotes] = useState<Record<string, string>>(page.notes ?? {});
  const [skandha, setSkandha] = useState<number | null>(page.skandha);
  const [adhyay, setAdhyay] = useState<number | null>(page.adhyay);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [zoom, setZoom] = useState(0);
  const [confirmDone, setConfirmDone] = useState(false);

  // ---- saving: merge changes, send after a short pause ----
  const pending = useRef<PagePatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    if (!Object.keys(patch).length) return true;
    pending.current = {};
    setSave("saving");
    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSave("saved");
      return true;
    } catch {
      pending.current = { ...patch, ...pending.current };
      setSave("error");
      return false;
    }
  }, [page.id]);

  const queue = useCallback(
    (patch: PagePatch) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (Object.keys(pending.current).length) {
        navigator.sendBeacon?.(
          `/api/pages/${page.id}`,
          new Blob([JSON.stringify(pending.current)], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [page.id]);

  const updateFlags = (next: Record<string, Flag>) => {
    setFlags(next);
    queue({ flags: next });
  };
  const updateBlocks = (nextBlocks: Block[], nextFlags: Record<string, Flag>) => {
    setBlocks(nextBlocks);
    setFlags(nextFlags);
    queue({ blocks: nextBlocks, flags: nextFlags });
  };
  const updateNotes = (next: Record<string, string>) => {
    setNotes(next);
    queue({ notes: next });
  };

  const open = openFlagCount({ blocks, flags });

  async function finish() {
    if (open > 0 && !confirmDone) {
      setConfirmDone(true);
      return;
    }
    pending.current = { ...pending.current, status: "done" };
    const ok = await flush();
    if (!ok) return;
    router.push(nextId ? `${base}/${nextId}` : base);
    router.refresh();
  }

  // ---- render ----
  return (
    <div className="review">
      <header className="rhead">
        <Link className="btn small" href={base}>
          ← सभी पन्ने
        </Link>
        <span className="title">{label}</span>
        <span className="save muted" aria-live="polite">
          {save === "saving" && "सेव हो रहा है…"}
          {save === "saved" && "✓ सेव हो गया"}
          {save === "error" && (
            <button className="btn small" onClick={flush}>
              सेव नहीं हुआ — फिर कोशिश करें
            </button>
          )}
        </span>
      </header>

      <div className="rbody">
        <div className="photo">
          <div className="zoom">
            <button aria-label="छोटा करें" onClick={() => setZoom((z) => Math.max(0, z - 1))}>
              −
            </button>
            <button aria-label="बड़ा करें" onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}>
              +
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="हाथ से लिखा पन्ना" style={{ width: `${ZOOMS[zoom]}%` }} />
        </div>

        <div className="text">
          <p className={`status-line ${open ? "todo" : "done"}`}>
            {open
              ? `${open} शब्द जाँचने हैं — पीले शब्द पर टैप करें`
              : "✓ सब शब्द जाँच लिए। चाहें तो अर्थ जोड़ें, फिर “पूरा हुआ” दबाएँ।"}
          </p>

          {blocks.length === 0 && <p className="muted">इस पन्ने का पाठ अभी तैयार नहीं है।</p>}

          {blocks.map((b, i) => (
            <div className="blk" key={i}>
              {b.type === "heading" ? (
                <h3>
                  <Tokens text={b.text} flags={flags} onFlag={(id) => setSheet({ kind: "flag", id })} />
                </h3>
              ) : (
                <p>
                  <Tokens text={b.text} flags={flags} onFlag={(id) => setSheet({ kind: "flag", id })} />
                </p>
              )}
              {notes[i] && (
                <div className="note-box">
                  <div className="lbl">भावार्थ</div>
                  <p>{notes[i]}</p>
                </div>
              )}
              <div className="tools">
                <button className="btn small" onClick={() => setSheet({ kind: "para", index: i })}>
                  ✎ बदलें
                </button>
                {b.type === "para" && (
                  <button className="btn small" onClick={() => setSheet({ kind: "note", index: i })}>
                    {notes[i] ? "✎ अर्थ बदलें" : "+ अर्थ जोड़ें"}
                  </button>
                )}
              </div>
            </div>
          ))}

          <details className="meta-row">
            <summary>अध्याय जानकारी: {skandhaName(skandha)}{adhyay ? ` · अध्याय ${adhyay}` : ""}</summary>
            <div className="f">
              <label>
                स्कन्ध{" "}
                <select
                  value={skandha ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setSkandha(v);
                    queue({ skandha: v });
                  }}
                >
                  <option value="">पता नहीं / पिछले पन्ने जैसा</option>
                  <option value="0">माहात्म्य</option>
                  {Array.from({ length: 12 }, (_, k) => (
                    <option key={k + 1} value={k + 1}>
                      {skandhaName(k + 1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                अध्याय{" "}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  value={adhyay ?? ""}
                  style={{ width: 90 }}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Math.max(1, Math.floor(Number(e.target.value)));
                    setAdhyay(v);
                    queue({ adhyay: v });
                  }}
                />
              </label>
            </div>
          </details>
        </div>
      </div>

      <footer className="rfoot">
        {confirmDone && open > 0 && (
          <span className="warn">अभी {open} शब्द बाकी हैं — फिर भी पूरा करें? (किताब में वही शब्द छपेंगे जो अभी दिख रहे हैं)</span>
        )}
        <span className="muted" style={{ fontSize: 15 }}>
          बोलने के लिए: खाने में टैप करें, फिर Wispr माइक दबाएँ
        </span>
        <button className="btn ok" onClick={finish}>
          {confirmDone && open > 0 ? "हाँ, पूरा हुआ" : "पूरा हुआ ✓"} {nextId ? "— अगला पन्ना" : ""}
        </button>
      </footer>

      {sheet && <div className="scrim" onClick={() => setSheet(null)} />}
      {sheet?.kind === "flag" && flags[sheet.id] && (
        <FlagSheet
          flag={flags[sheet.id]}
          onClose={() => setSheet(null)}
          onEditPara={() => {
            const idx = blocks.findIndex((b) => b.text.includes(`⟦${sheet.id}⟧`));
            setSheet(idx >= 0 ? { kind: "para", index: idx } : null);
          }}
          onSave={(f) => {
            updateFlags({ ...flags, [sheet.id]: f });
            setConfirmDone(false);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "para" && blocks[sheet.index] && (
        <TextSheet
          title="यह भाग बदलें"
          hint="जहाँ गलत है वहाँ टैप करके सही बोलें या लिखें। पूरा भाग दोबारा भी बोल सकती हैं।"
          initial={plainText(blocks[sheet.index].text, flags)}
          onClose={() => setSheet(null)}
          onSave={(text) => {
            const old = blocks[sheet.index];
            const nextFlags = { ...flags };
            for (const m of old.text.matchAll(MARKER)) delete nextFlags[m[1]];
            const nextBlocks = blocks.map((b, k) => (k === sheet.index ? { ...b, text: text.trim() } : b));
            updateBlocks(nextBlocks, nextFlags);
            setConfirmDone(false);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "note" && (
        <TextSheet
          title="इस भाग का अर्थ"
          hint="इस भाग का भाव अपने शब्दों में बोलें। यह किताब में इसी भाग के नीचे छपेगा।"
          initial={notes[sheet.index] ?? ""}
          onClose={() => setSheet(null)}
          onDelete={
            notes[sheet.index]
              ? () => {
                  const next = { ...notes };
                  delete next[sheet.index];
                  updateNotes(next);
                  setSheet(null);
                }
              : undefined
          }
          onSave={(text) => {
            const next = { ...notes };
            if (text.trim()) next[sheet.index] = text.trim();
            else delete next[sheet.index];
            updateNotes(next);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function Tokens({
  text,
  flags,
  onFlag,
}: {
  text: string;
  flags: Record<string, Flag>;
  onFlag: (id: string) => void;
}) {
  return (
    <>
      {tokenize(text).map((t, k) => {
        if (t.kind === "text") return <span key={k}>{t.s}</span>;
        const f = flags[t.id];
        if (!f) return null;
        if (f.resolved) {
          const word = flagText(f);
          return word ? (
            <button key={k} className="fl done" onClick={() => onFlag(t.id)}>
              {word}
            </button>
          ) : (
            <button key={k} className="fl gone" onClick={() => onFlag(t.id)} aria-label="हटाया गया हिस्सा">
              ✂
            </button>
          );
        }
        if (f.reason === "struck")
          return (
            <button key={k} className="fl struck" onClick={() => onFlag(t.id)}>
              ✂ कटा हुआ
            </button>
          );
        if (f.reason === "order")
          return (
            <button key={k} className="fl order" onClick={() => onFlag(t.id)}>
              ↕ क्रम देखें
            </button>
          );
        return (
          <button key={k} className="fl" onClick={() => onFlag(t.id)}>
            {f.guess || "???"}
          </button>
        );
      })}
    </>
  );
}

function FlagSheet({
  flag,
  onSave,
  onClose,
  onEditPara,
}: {
  flag: Flag;
  onSave: (f: Flag) => void;
  onClose: () => void;
  onEditPara: () => void;
}) {
  const [value, setValue] = useState(flag.value ?? flag.guess);

  if (flag.reason === "order") {
    return (
      <div className="sheet" role="dialog" aria-modal="true">
        <h4>पढ़ने का क्रम</h4>
        {flag.note && <p className="big" style={{ fontSize: 22 }}>{flag.note}</p>}
        <p className="hint">फोटो से मिलाकर देखें कि वाक्य सही क्रम में हैं या नहीं।</p>
        <div className="row">
          <button className="btn ok" onClick={() => onSave({ ...flag, resolved: true })}>
            ✓ क्रम ठीक है
          </button>
          <button className="btn" onClick={onEditPara}>
            ✎ भाग बदलें
          </button>
          <button className="btn ghost" onClick={onClose}>
            रद्द करें
          </button>
        </div>
      </div>
    );
  }

  if (flag.reason === "struck") {
    return (
      <div className="sheet" role="dialog" aria-modal="true">
        <h4>कटा हुआ हिस्सा</h4>
        <p className="hint">{flag.note || "कॉपी में यहाँ कुछ काटा गया है।"} किताब में रखना है या नहीं?</p>
        <input
          type="text"
          value={value}
          placeholder="रखना हो तो शब्द बोलें या लिखें"
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="row">
          <button className="btn primary" onClick={() => onSave({ ...flag, value: "", resolved: true })}>
            हटाएँ — किताब में नहीं
          </button>
          <button
            className="btn"
            disabled={!value.trim()}
            onClick={() => onSave({ ...flag, value: value.trim(), resolved: true })}
          >
            रखें
          </button>
          <button className="btn ghost" onClick={onClose}>
            रद्द करें
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <h4>यह शब्द सही है?</h4>
      <p className="big">{flag.guess || "???"}</p>
      {flag.note && <p className="hint">{flag.note}</p>}
      <p className="hint">गलत हो तो नीचे खाने में टैप करें और सही शब्द बोलें।</p>
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="row">
        <button
          className="btn ok"
          disabled={!value.trim()}
          onClick={() => onSave({ ...flag, value: value.trim(), resolved: true })}
        >
          ✓ ठीक है
        </button>
        <button className="btn ghost" onClick={onClose}>
          रद्द करें
        </button>
      </div>
    </div>
  );
}

function TextSheet({
  title,
  hint,
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  title: string;
  hint: string;
  initial: string;
  onSave: (text: string) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <h4>{title}</h4>
      <p className="hint">{hint}</p>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="row">
        <button className="btn ok" onClick={() => onSave(value)}>
          सेव करें
        </button>
        {onDelete && (
          <button className="btn" onClick={onDelete}>
            हटाएँ
          </button>
        )}
        <button className="btn ghost" onClick={onClose}>
          रद्द करें
        </button>
      </div>
    </div>
  );
}

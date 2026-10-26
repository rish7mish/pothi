"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flagIdsIn, flagText, plainText, skandhaName, tokenize, MARKER } from "@/lib/text";
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
  prevId,
  nextId,
  nextTodoId,
  position,
  label,
}: {
  page: PageRow;
  imageUrl: string;
  base: string;
  prevId: string | null;
  nextId: string | null;
  nextTodoId: string | null;
  position: string;
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

  // Unresolved flags in reading order.
  const openIds = flagIdsIn(blocks).filter((id) => flags[id] && !flags[id].resolved);
  const open = openIds.length;

  /** Open a flag and scroll the text so its word is visible behind the sheet. */
  const openFlag = (id: string) => {
    setSheet({ kind: "flag", id });
    document.getElementById(`flag-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  async function go(href: string) {
    await flush();
    router.push(href);
  }

  async function finish() {
    if (open > 0 && !confirmDone) {
      setConfirmDone(true);
      return;
    }
    pending.current = { ...pending.current, status: "done" };
    const ok = await flush();
    if (!ok) return;
    router.push(nextTodoId ? `${base}/${nextTodoId}` : base);
    router.refresh();
  }

  // ---- render ----
  return (
    <div className={`review ${imageUrl ? "" : "nophoto"}`}>
      <header className="rhead">
        <button className="btn small" onClick={() => go(base)}>
          ← सभी पन्ने
        </button>
        <span className="title">
          {label}
          <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 16 }}>
            ({position})
          </span>
        </span>
        <span className="save muted" aria-live="polite">
          {save === "saving" && "सेव हो रहा है…"}
          {save === "saved" && "✓ सेव"}
          {save === "error" && (
            <button className="btn small" onClick={flush}>
              सेव नहीं हुआ — फिर से
            </button>
          )}
        </span>
        <span className="pager">
          <button className="btn small" disabled={!prevId} onClick={() => prevId && go(`${base}/${prevId}`)} aria-label="पिछला पन्ना">
            ‹ पिछला
          </button>
          <button className="btn small" disabled={!nextId} onClick={() => nextId && go(`${base}/${nextId}`)} aria-label="अगला पन्ना">
            अगला ›
          </button>
        </span>
      </header>

      <div className="rbody">
        {imageUrl && (
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
        )}

        <div className="text">
          {open > 0 ? (
            <button className="status-line todo" onClick={() => openFlag(openIds[0])}>
              <span>
                <b>{open} शब्द जाँचने हैं</b> — एक-एक करके दिखाएँगे
              </span>
              <span className="btn small primary">जाँचना शुरू करें →</span>
            </button>
          ) : (
            <p className="status-line done">✓ सब शब्द जाँच लिए। चाहें तो किसी भाग का अर्थ जोड़ें, फिर नीचे “पूरा हुआ” दबाएँ।</p>
          )}

          {blocks.length === 0 && <p className="muted">इस पन्ने का पाठ अभी तैयार नहीं है।</p>}

          {blocks.map((b, i) => (
            <div className="blk" key={i}>
              {b.type === "heading" ? (
                <h3>
                  <Tokens text={b.text} flags={flags} onFlag={openFlag} />
                </h3>
              ) : (
                <p>
                  <Tokens text={b.text} flags={flags} onFlag={openFlag} />
                </p>
              )}
              {notes[i] && (
                <button className="note-box" onClick={() => setSheet({ kind: "note", index: i })}>
                  <span className="lbl">भावार्थ ✎</span>
                  <span className="nt">{notes[i]}</span>
                </button>
              )}
              {b.type === "para" && (
                <div className="tools">
                  {!notes[i] && (
                    <button className="link" onClick={() => setSheet({ kind: "note", index: i })}>
                      + अर्थ जोड़ें
                    </button>
                  )}
                  <button className="link" onClick={() => setSheet({ kind: "para", index: i })}>
                    ✎ पूरा भाग बदलें
                  </button>
                </div>
              )}
            </div>
          ))}

          <details className="meta-row">
            <summary>
              अध्याय जानकारी: {skandhaName(skandha)}
              {adhyay ? ` · अध्याय ${adhyay}` : ""}
            </summary>
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
          <span className="warn">
            अभी {open} शब्द बाकी हैं। फिर भी पूरा करें? (किताब में वही शब्द छपेंगे जो अभी दिख रहे हैं)
          </span>
        )}
        {open > 0 ? (
          <button className="btn" onClick={() => openFlag(openIds[0])}>
            🟡 अगला पीला शब्द ({open})
          </button>
        ) : (
          <span />
        )}
        <button className="btn ok" onClick={finish}>
          {confirmDone && open > 0 ? "हाँ, पूरा हुआ" : "पूरा हुआ ✓"}
          {nextTodoId ? " — अगला पन्ना" : ""}
        </button>
      </footer>

      {sheet && <div className="scrim" onClick={() => setSheet(null)} />}
      {sheet?.kind === "flag" && flags[sheet.id] && (
        <FlagSheet
          key={sheet.id}
          flag={flags[sheet.id]}
          context={contextFor(blocks, flags, sheet.id)}
          step={(() => {
            const all = flagIdsIn(blocks).filter((id) => flags[id]);
            return `${all.indexOf(sheet.id) + 1} / ${all.length}`;
          })()}
          onClose={() => setSheet(null)}
          onEditPara={() => {
            const idx = blocks.findIndex((b) => b.text.includes(`⟦${sheet.id}⟧`));
            setSheet(idx >= 0 ? { kind: "para", index: idx } : null);
          }}
          onSave={(f) => {
            const next = { ...flags, [sheet.id]: f };
            setFlags(next);
            queue({ flags: next });
            setConfirmDone(false);
            // Guided flow: move straight on to the next unresolved word.
            const remaining = flagIdsIn(blocks).filter((id) => next[id] && !next[id].resolved);
            if (remaining.length) openFlag(remaining[0]);
            else setSheet(null);
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
            setBlocks(nextBlocks);
            setFlags(nextFlags);
            queue({ blocks: nextBlocks, flags: nextFlags });
            setConfirmDone(false);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "note" && (
        <TextSheet
          title="इस भाग का अर्थ"
          hint="इस भाग का भाव अपने शब्दों में बोलें। यह किताब में इसी भाग के नीचे छपेगा।"
          quote={blocks[sheet.index] ? plainText(blocks[sheet.index].text, flags) : undefined}
          initial={notes[sheet.index] ?? ""}
          onClose={() => setSheet(null)}
          onDelete={
            notes[sheet.index]
              ? () => {
                  const next = { ...notes };
                  delete next[sheet.index];
                  setNotes(next);
                  queue({ notes: next });
                  setSheet(null);
                }
              : undefined
          }
          onSave={(text) => {
            const next = { ...notes };
            if (text.trim()) next[sheet.index] = text.trim();
            else delete next[sheet.index];
            setNotes(next);
            queue({ notes: next });
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

/** A few words either side of a flag, so she can judge it without looking behind the sheet. */
function contextFor(blocks: Block[], flags: Record<string, Flag>, id: string) {
  const b = blocks.find((x) => x.text.includes(`⟦${id}⟧`));
  if (!b) return { before: "", after: "" };
  const [pre, post = ""] = b.text.split(`⟦${id}⟧`);
  const words = (s: string) => plainText(s, flags).split(/\s+/).filter(Boolean);
  return { before: words(pre).slice(-6).join(" "), after: words(post).slice(0, 6).join(" ") };
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
        const id = `flag-${t.id}`;
        if (f.resolved && f.reason === "order") return null;
        if (f.resolved) {
          const word = flagText(f);
          return word ? (
            <button key={k} id={id} className="fl done" onClick={() => onFlag(t.id)}>
              {word}
            </button>
          ) : (
            <button key={k} id={id} className="fl gone" onClick={() => onFlag(t.id)} aria-label="हटाया गया हिस्सा">
              ✂
            </button>
          );
        }
        if (f.reason === "struck")
          return (
            <button key={k} id={id} className="fl struck" onClick={() => onFlag(t.id)}>
              ✂ कटा हुआ
            </button>
          );
        if (f.reason === "order")
          return (
            <button key={k} id={id} className="fl order" onClick={() => onFlag(t.id)}>
              ↕ क्रम देखें
            </button>
          );
        return (
          <button key={k} id={id} className="fl" onClick={() => onFlag(t.id)}>
            {f.guess || "???"}
          </button>
        );
      })}
    </>
  );
}

function SheetHead({ title, step, onClose }: { title: string; step: string | null; onClose: () => void }) {
  return (
    <div className="sheethead">
      <h4>{title}</h4>
      {step && <span className="chip">शब्द {step}</span>}
      <button className="x" onClick={onClose} aria-label="बंद करें">
        ✕
      </button>
    </div>
  );
}

function Context({ before, after, word }: { before: string; after: string; word: React.ReactNode }) {
  return (
    <p className="ctx">
      {before && <>…{before} </>}
      <mark>{word}</mark>
      {after && <> {after}…</>}
    </p>
  );
}

function FlagSheet({
  flag,
  context,
  step,
  onSave,
  onClose,
  onEditPara,
}: {
  flag: Flag;
  context: { before: string; after: string };
  step: string | null;
  onSave: (f: Flag) => void;
  onClose: () => void;
  onEditPara: () => void;
}) {
  const [value, setValue] = useState(flag.value ?? flag.guess);

  if (flag.reason === "order") {
    return (
      <div className="sheet" role="dialog" aria-modal="true">
        <SheetHead title="पढ़ने का क्रम" step={step} onClose={onClose} />
        <Context {...context} word="↕" />
        {flag.note && <p className="hint">{flag.note}</p>}
        <p className="hint">फोटो से मिलाकर देखें कि वाक्य सही क्रम में हैं।</p>
        <div className="row">
          <button className="btn ok" onClick={() => onSave({ ...flag, resolved: true })}>
            ✓ क्रम ठीक है
          </button>
          <button className="btn" onClick={onEditPara}>
            ✎ भाग बदलें
          </button>
        </div>
      </div>
    );
  }

  if (flag.reason === "struck") {
    return (
      <div className="sheet" role="dialog" aria-modal="true">
        <SheetHead title="कटा हुआ हिस्सा" step={step} onClose={onClose} />
        <Context {...context} word="✂" />
        <p className="hint">{flag.note || "कॉपी में यहाँ कुछ काटा गया है।"} किताब में रखना है?</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <SheetHead title="यह शब्द सही है?" step={step} onClose={onClose} />
      <Context {...context} word={flag.guess || "???"} />
      {flag.note && <p className="hint">कंप्यूटर: {flag.note}</p>}
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)} aria-label="सही शब्द" />
      <p className="hint">गलत हो तो खाने में टैप करें और Wispr माइक से सही शब्द बोलें।</p>
      <div className="row">
        <button
          className="btn ok"
          disabled={!value.trim()}
          onClick={() => onSave({ ...flag, value: value.trim(), resolved: true })}
        >
          ✓ ठीक है — आगे
        </button>
      </div>
    </div>
  );
}

function TextSheet({
  title,
  hint,
  quote,
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  title: string;
  hint: string;
  quote?: string;
  initial: string;
  onSave: (text: string) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <SheetHead title={title} step={null} onClose={onClose} />
      {quote && <p className="ctx quote">{quote.length > 160 ? quote.slice(0, 160) + "…" : quote}</p>}
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
      </div>
    </div>
  );
}

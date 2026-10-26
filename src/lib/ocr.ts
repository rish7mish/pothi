import type { Block, Flag, FlagReason } from "./types";

export const OCR_PROMPT = `You are transcribing a photo of ONE handwritten Hindi (Devanagari) notebook page. An elderly woman wrote it: her own retelling of the Shrimad Bhagavat, often written while listening to katha. She will check your transcription herself, so faithfulness matters far more than polish.

Rules:
1. Transcribe EXACTLY what is written. Keep her spelling and grammar even when non-standard (मे, है, हुये, चाहिये, नही, etc.). Never correct, modernise, complete, summarise or paraphrase.
2. When you are not confident about a word, give your best reading as a FLAG. Be generous with flags: a flagged word costs her two seconds, a silently wrong word ends up in the printed book.
3. Crossed-out / struck-through text: never drop it silently. Record it as a flag with reason "struck" and your best reading of the crossed-out text ("" if illegible).
4. Follow the page's real reading order. She sometimes squeezes the end of a sentence next to a heading, adds words above a line with a caret, or continues in the margin. Reassemble natural reading order. Wherever you had to reorder, or the order is uncertain, insert a flag with reason "order", guess "" and a short Hindi note.
5. Ignore printed notebook furniture (Date/Page boxes, margins, ruled lines) and any text from neighbouring pages visible at the photo edges.
6. Blocks: an "अध्याय" line, a chapter title (often in quotes or underlined) and an "ॐ ..." invocation are type "heading". Everything else is "para". Start a new para only where she starts a new paragraph; join lines that merely wrap.
7. Metadata, only if written on this page: date_written exactly as written (e.g. "21.8" or "6.11.2022"); adhyay as a number ("अध्याय 19" → 19, "पहला अध्याय" → 1, "दूसरा अध्याय" → 2); heading = the chapter title text; skandha only if a skandha number is written. If the text is the Bhagavat Mahatmya (माहात्म्य), set mahatmya true. A page that continues a chapter without a heading has null metadata.

Flag syntax: inside a block's text, write ⟦N⟧ exactly where the flagged word belongs (N = 1, 2, 3 …). The marker REPLACES the word: do not also write the word in the text. List every flag in "flags".

Reply with ONLY this JSON, no prose, no code fence:
{"date_written": string|null, "adhyay": number|null, "skandha": number|null, "mahatmya": boolean, "heading": string|null,
 "blocks": [{"type": "heading"|"para", "text": string}],
 "flags": [{"n": number, "guess": string, "reason": "unclear"|"struck"|"order", "note": string}]}
"note" is one short Hindi phrase such as "शायद करोड़ों" or "स्याही धुंधली".`;

export interface OcrResult {
  date_written: string | null;
  adhyay: number | null;
  skandha: number | null;
  heading: string | null;
  blocks: Block[];
  flags: Record<string, Flag>;
}

const REASONS: FlagReason[] = ["unclear", "struck", "order"];

/** Turn the model's JSON into our page fields. Throws on malformed output. */
export function parseOcr(raw: string): OcrResult {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("OCR reply had no JSON");
  const j = JSON.parse(raw.slice(start, end + 1));

  const flags: Record<string, Flag> = {};
  for (const f of Array.isArray(j.flags) ? j.flags : []) {
    const n = Number(f.n);
    if (!Number.isFinite(n)) continue;
    flags[`f${n}`] = {
      guess: String(f.guess ?? ""),
      reason: REASONS.includes(f.reason) ? f.reason : "unclear",
      note: f.note ? String(f.note) : undefined,
      resolved: false,
    };
  }

  const blocks: Block[] = (Array.isArray(j.blocks) ? j.blocks : [])
    .map((b: { type?: string; text?: string }) => ({
      type: b.type === "heading" ? "heading" : "para",
      text: String(b.text ?? "").replace(/⟦\s*(\d+)\s*⟧/g, (_m, n) => `⟦f${n}⟧`),
    }))
    .filter((b: Block) => b.text.trim().length > 0);

  // A marker without a matching flag would render as nothing: turn it into an unclear flag.
  for (const b of blocks) {
    for (const m of b.text.matchAll(/⟦(f\d+)⟧/g)) {
      if (!flags[m[1]]) flags[m[1]] = { guess: "", reason: "unclear", note: "शब्द पढ़ा नहीं गया", resolved: false };
    }
  }

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    date_written: j.date_written ? String(j.date_written) : null,
    adhyay: num(j.adhyay),
    skandha: j.mahatmya === true ? 0 : num(j.skandha),
    heading: j.heading ? String(j.heading) : null,
    blocks,
    flags,
  };
}

export async function runOcr(imageBase64: string, mediaType = "image/jpeg"): Promise<OcrResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OCR_MODEL || "claude-opus-5-5",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: OCR_PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OCR request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((c: { type: string }) => c.type === "text")
    .map((c: { text: string }) => c.text)
    .join("");
  return parseOcr(text);
}

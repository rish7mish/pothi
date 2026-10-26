import type { Block, Flag, PageRow } from "./types";

export const MARKER = /⟦(f\d+)⟧/g;

export type Token = { kind: "text"; s: string } | { kind: "flag"; id: string };

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER)) {
    if (m.index! > last) out.push({ kind: "text", s: text.slice(last, m.index) });
    out.push({ kind: "flag", id: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", s: text.slice(last) });
  return out;
}

/** The word to show/print for a flag right now. */
export function flagText(f: Flag | undefined): string {
  if (!f) return "";
  if (f.reason === "struck") return f.resolved ? f.value ?? "" : "";
  if (f.reason === "order") return "";
  return f.resolved ? f.value ?? f.guess : f.guess;
}

/** Block text with every flag replaced by its current word. */
export function plainText(text: string, flags: Record<string, Flag>): string {
  return text
    .replace(MARKER, (_, id: string) => flagText(flags[id]))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function flagIdsIn(blocks: Block[]): string[] {
  const ids: string[] = [];
  for (const b of blocks) for (const m of b.text.matchAll(MARKER)) ids.push(m[1]);
  return ids;
}

export function openFlagCount(page: Pick<PageRow, "blocks" | "flags">): number {
  return flagIdsIn(page.blocks).filter((id) => page.flags[id] && !page.flags[id].resolved).length;
}

// ---- Optional spelling standardisation (her choice, applied only at book export) ----

const EDGE = "[\\s।॥,;:!?\"'()\\-—–]";
const SWAPS: [string, string][] = [
  ["मे", "में"],
  ["मै", "मैं"],
  ["नही", "नहीं"],
  ["हुये", "हुए"],
  ["हुयी", "हुई"],
  ["गये", "गए"],
  ["गयी", "गई"],
  ["किये", "किए"],
  ["दिये", "दिए"],
  ["लिये", "लिए"],
  ["चाहिये", "चाहिए"],
  ["कीजिये", "कीजिए"],
  ["बताइये", "बताइए"],
  ["कहिये", "कहिए"],
];
const SWAP_RES = SWAPS.map(
  ([from, to]) => [new RegExp(`(^|${EDGE})${from}(?=$|${EDGE})`, "g"), `$1${to}`] as const,
);

export function standardize(s: string): string {
  return SWAP_RES.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}

// ---- Chapter naming ----

const ORDINAL = ["", "प्रथम", "द्वितीय", "तृतीय", "चतुर्थ", "पञ्चम", "षष्ठ", "सप्तम", "अष्टम", "नवम", "दशम", "एकादश", "द्वादश"];

export function skandhaName(n: number | null): string {
  if (n === 0) return "श्रीमद्भागवत माहात्म्य";
  if (n && n >= 1 && n <= 12) return `${ORDINAL[n]} स्कन्ध`;
  return "स्कन्ध अज्ञात";
}

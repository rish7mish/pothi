export type FlagReason = "unclear" | "struck" | "order";

export interface Flag {
  /** What OCR read (for "struck", the crossed-out text). */
  guess: string;
  reason: FlagReason;
  /** Short Hindi hint from OCR, e.g. "शायद करोड़ों". */
  note?: string;
  /** Her decision. For "struck": "" means remove, the text means keep. */
  value?: string;
  resolved: boolean;
}

export interface Block {
  type: "heading" | "para";
  /** Text with flag markers like ⟦f3⟧ where a flagged word sits. */
  text: string;
}

export type PageStatus = "new" | "ocr_failed" | "review" | "done";

export interface PageRow {
  id: string;
  is_demo: boolean;
  notebook: string;
  seq: number;
  image_path: string;
  status: PageStatus;
  skandha: number | null;
  adhyay: number | null;
  heading: string | null;
  date_written: string | null;
  blocks: Block[];
  flags: Record<string, Flag>;
  /** Her spoken explanations, keyed by block index. */
  notes: Record<string, string>;
  ocr_error: string | null;
  updated_at: string;
}

export type PagePatch = Partial<
  Pick<PageRow, "blocks" | "flags" | "notes" | "status" | "skandha" | "adhyay" | "heading">
>;

import type { Block, Flag } from "@/lib/types";
import p2008 from "./demo-2008.json";
import p2022 from "./demo-2022.json";

/**
 * Two real pages from the notebooks with the app's real OCR output (claude-opus-5-5, the prompt in lib/ocr.ts).
 * "Reset demo" restores exactly this state.
 */
export interface DemoPage {
  notebook: string;
  seq: number;
  image_path: string;
  skandha: number | null;
  adhyay: number | null;
  heading: string | null;
  date_written: string | null;
  blocks: Block[];
  flags: Record<string, Flag>;
}

type Ocr = Omit<DemoPage, "notebook" | "seq" | "image_path">;

export const DEMO_PAGES: DemoPage[] = [
  // The page does not say which skandha; Prithu's hundred ashvamedhas are Skandha 4, set here as the editor would.
  { notebook: "2008", seq: 1, image_path: "/demo/2008-a19.jpg", ...(p2008 as Ocr), skandha: 4 },
  { notebook: "2022", seq: 1, image_path: "/demo/2022-p1.jpg", ...(p2022 as Ocr) },
];

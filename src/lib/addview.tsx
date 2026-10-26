import "server-only";
import AddPage from "@/components/AddPage";
import Nav from "@/components/Nav";
import { isOwner, listPages } from "./server";

export async function AddView({ demo, mode = "photo" }: { demo: boolean; mode?: "photo" | "speak" }) {
  const [pages, owner] = await Promise.all([listPages(demo), isOwner()]);
  const pendingOcr = pages
    .filter((p) => p.status === "new" || p.status === "ocr_failed")
    .map((p) => ({ id: p.id, label: `${p.notebook} · पन्ना ${p.seq}`, error: p.ocr_error }));
  const notebooks = Array.from(new Set([...(demo ? [] : ["2008", "2022"]), ...pages.map((p) => p.notebook)]));
  return (
    <>
      <Nav active="upload" demo={demo} owner={owner} />
      <AddPage notebooks={notebooks} pendingOcr={pendingOcr} demo={demo} initialMode={mode} />
    </>
  );
}

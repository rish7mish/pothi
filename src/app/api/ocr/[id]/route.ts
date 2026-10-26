import { NextResponse } from "next/server";
import { BUCKET, db, getPage, isOwner } from "@/lib/server";
import { runOcr } from "@/lib/ocr";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwner())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const page = await getPage(id);
  if (!page || page.is_demo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const file = await db().storage.from(BUCKET).download(page.image_path);
  if (file.error) return NextResponse.json({ error: file.error.message }, { status: 500 });
  const b64 = Buffer.from(await file.data.arrayBuffer()).toString("base64");

  try {
    const r = await runOcr(b64);
    const { error } = await db()
      .from("pages")
      .update({
        status: "review",
        blocks: r.blocks,
        flags: r.flags,
        notes: {},
        date_written: r.date_written,
        adhyay: r.adhyay,
        skandha: r.skandha,
        heading: r.heading,
        ocr_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, flags: Object.keys(r.flags).length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db().from("pages").update({ status: "ocr_failed", ocr_error: msg.slice(0, 500) }).eq("id", id);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

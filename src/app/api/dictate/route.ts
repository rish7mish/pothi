import { NextResponse } from "next/server";
import { db, isOwner } from "@/lib/server";
import type { Block } from "@/lib/types";

/**
 * A page made from speech alone (no photo): for pages too damaged to read, or passages she wants to add.
 * The text arrives already written by her voice keyboard (Wispr Flow); each new line starts a new paragraph.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    demo?: boolean;
    notebook?: string;
    title?: string;
    text?: string;
    skandha?: number | null;
    adhyay?: number | null;
  } | null;
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const demo = body.demo === true;
  if (!demo && !(await isOwner())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const notebook = String(body.notebook ?? "").trim() || "बोले गए पन्ने";
  if (notebook.length > 40) return NextResponse.json({ error: "bad notebook name" }, { status: 400 });
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (text.length > (demo ? 4000 : 40000)) return NextResponse.json({ error: "too long" }, { status: 413 });

  const int = (v: unknown, max: number) =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : null;
  const skandha = int(body.skandha, 12);
  const adhyay = int(body.adhyay, 99);
  const title = String(body.title ?? "").trim().slice(0, 200);

  const blocks: Block[] = [];
  if (title) blocks.push({ type: "heading", text: title });
  for (const para of text.split(/\n+/)) {
    const t = para.replace(/\s+/g, " ").trim();
    if (t) blocks.push({ type: "para", text: t });
  }

  if (demo) {
    const { count } = await db().from("pages").select("id", { count: "exact", head: true }).eq("is_demo", true);
    if ((count ?? 0) >= 12) return NextResponse.json({ error: "demo is full — press Reset demo" }, { status: 429 });
  }

  const { data: last } = await db()
    .from("pages")
    .select("seq")
    .eq("is_demo", demo)
    .eq("notebook", notebook)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db()
    .from("pages")
    .insert({
      is_demo: demo,
      notebook,
      seq: (last?.seq ?? 0) + 1,
      image_path: "",
      status: "review",
      skandha,
      adhyay,
      heading: title || null,
      blocks,
      flags: {},
      notes: {},
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

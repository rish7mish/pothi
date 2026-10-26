import { NextResponse } from "next/server";
import { BUCKET, db, isOwner } from "@/lib/server";

export async function POST(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const notebook = String(form.get("notebook") ?? "").trim();
  if (!(file instanceof Blob) || !file.size) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (!/^[\wऀ-ॿ -]{1,40}$/.test(notebook)) {
    return NextResponse.json({ error: "bad notebook name" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "file too large" }, { status: 413 });

  const { data: last } = await db()
    .from("pages")
    .select("seq")
    .eq("is_demo", false)
    .eq("notebook", notebook)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  const seq = (last?.seq ?? 0) + 1;

  const path = `${encodeURIComponent(notebook)}/${String(seq).padStart(4, "0")}-${crypto.randomUUID()}.jpg`;
  const up = await db().storage.from(BUCKET).upload(path, file, { contentType: "image/jpeg" });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  const { data, error } = await db()
    .from("pages")
    .insert({ notebook, seq, image_path: path, status: "new" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, seq });
}

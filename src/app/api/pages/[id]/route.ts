import { NextResponse } from "next/server";
import { canEdit, db, getPage } from "@/lib/server";
import type { PagePatch } from "@/lib/types";

const ALLOWED: (keyof PagePatch)[] = ["blocks", "flags", "notes", "status", "skandha", "adhyay", "heading"];
const STATUSES = ["new", "ocr_failed", "review", "done"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(page))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const k of ALLOWED) if (k in body) patch[k] = body[k];
  if ("status" in patch && !STATUSES.includes(String(patch.status))) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }
  for (const k of ["skandha", "adhyay"] as const) {
    if (k in patch && patch[k] !== null && !Number.isInteger(patch[k])) {
      return NextResponse.json({ error: `bad ${k}` }, { status: 400 });
    }
  }
  // Keep demo pages small so the open demo can't be used as free storage.
  if (page.is_demo && JSON.stringify(patch).length > 60_000) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  patch.updated_at = new Date().toISOString();

  const { error } = await db().from("pages").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated_at: patch.updated_at });
}

/** navigator.sendBeacon (used when the tab is closed mid-edit) can only POST. */
export const POST = PATCH;

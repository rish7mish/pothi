import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { DEMO_PAGES } from "@/data/demo";

/** Restore the open demo to its original state. Anyone may call it. */
export async function POST() {
  const del = await db().from("pages").delete().eq("is_demo", true);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  const rows = DEMO_PAGES.map((p) => ({ ...p, is_demo: true, status: "review", notes: {} }));
  const ins = await db().from("pages").insert(rows);
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pages: rows.length });
}

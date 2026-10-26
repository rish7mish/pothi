import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { PageRow } from "./types";

export const BUCKET = "pages";
export const KEY_COOKIE = "pothi_key";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/** True when the visitor opened her private link (or the admin link). */
export async function isOwner(): Promise<boolean> {
  const expected = process.env.ACCESS_KEY;
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(KEY_COOKIE)?.value === expected;
}

const COLS =
  "id,is_demo,notebook,seq,image_path,status,skandha,adhyay,heading,date_written,blocks,flags,notes,ocr_error,updated_at";

export async function listPages(demo: boolean): Promise<PageRow[]> {
  const { data, error } = await db()
    .from("pages")
    .select(COLS)
    .eq("is_demo", demo)
    .order("notebook")
    .order("seq");
  if (error) throw new Error(error.message);
  return (data ?? []) as PageRow[];
}

export async function getPage(id: string): Promise<PageRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("pages").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PageRow) ?? null;
}

/** Demo photos ship with the app under /public; real ones live in the private bucket. */
export async function imageUrl(page: Pick<PageRow, "is_demo" | "image_path">): Promise<string> {
  // Dictated pages have no photo.
  if (!page.image_path || page.is_demo) return page.image_path;
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(page.image_path, 60 * 60 * 6);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function imageUrls(pages: PageRow[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const real = pages.filter((p) => !p.is_demo && p.image_path);
  for (const p of pages) if (p.is_demo) out[p.id] = p.image_path;
  if (real.length) {
    const { data, error } = await db()
      .storage.from(BUCKET)
      .createSignedUrls(real.map((p) => p.image_path), 60 * 60 * 6);
    if (error) throw new Error(error.message);
    data.forEach((d, i) => {
      if (d.signedUrl) out[real[i].id] = d.signedUrl;
    });
  }
  return out;
}

/** May this visitor write to this page? Demo pages are open to everyone. */
export async function canEdit(page: Pick<PageRow, "is_demo">): Promise<boolean> {
  return page.is_demo || (await isOwner());
}

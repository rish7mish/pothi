import Snap from "@/components/Snap";
import { db } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Her one-button photo screen. Photos go to the notebook that was added to most recently (or ?nb=...). */
export default async function Page({ searchParams }: { searchParams: Promise<{ nb?: string }> }) {
  const { nb } = await searchParams;
  let notebook = (nb ?? "").trim();
  if (!notebook) {
    const { data } = await db()
      .from("pages")
      .select("notebook")
      .eq("is_demo", false)
      .neq("image_path", "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    notebook = data?.notebook ?? "2008";
  }
  const { count } = await db()
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("is_demo", false)
    .eq("notebook", notebook);
  return <Snap notebook={notebook} saved={count ?? 0} />;
}

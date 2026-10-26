import { AddView } from "@/lib/addview";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <AddView demo={false} mode={mode === "speak" ? "speak" : "photo"} />;
}

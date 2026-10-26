import { BookView } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ std?: string }> }) {
  const { std } = await searchParams;
  return <BookView demo={false} std={std === "1"} />;
}

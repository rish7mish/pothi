import Link from "next/link";

export type NavKey = "pages" | "book" | "upload";

/** One menu on every screen except the review screen, which has its own focused header. */
export default function Nav({ active, demo, owner }: { active: NavKey; demo: boolean; owner: boolean }) {
  const base = demo ? "/demo" : "/p";
  const items: { key: NavKey; href: string; label: string }[] = [
    { key: "pages", href: base, label: "📄 पन्ने" },
    { key: "book", href: demo ? "/demo/book" : "/book", label: "📖 किताब" },
  ];
  if (demo) items.push({ key: "upload", href: "/demo/add", label: "＋ जोड़ें" });
  else if (owner) items.push({ key: "upload", href: "/admin", label: "＋ जोड़ें" });

  return (
    <nav className="nav no-print">
      <div className="wrap navin">
        <Link href={base} className="brand">
          पोथी
        </Link>
        {demo && <span className="chip warn">DEMO</span>}
        <div className="tabs">
          {items.map((it) => (
            <Link key={it.key} href={it.href} className={`tab ${active === it.key ? "on" : ""}`}>
              {it.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

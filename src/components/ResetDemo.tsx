"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetDemo() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn small"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/demo/reset", { method: "POST" });
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? "…" : "↺ Reset demo"}
    </button>
  );
}

import { ListView } from "@/lib/views";
import ResetDemo from "@/components/ResetDemo";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <ListView
      demo
      intro={
        <div className="banner">
          <b>Demo for judges.</b> Two real pages from my mother&apos;s notebooks (2008 and 2022), already read by OCR.
          Open a page, tap a <span className="fl" style={{ fontSize: 16 }}>yellow</span> word to confirm or correct it,
          add an explanation, then press “पूरा हुआ ✓”. “📖 किताब देखें” shows the printed book. On a phone or tablet, use
          Wispr Flow (or any voice keyboard) to speak corrections in Hindi.
          <div style={{ marginTop: 10 }}>
            <ResetDemo />
          </div>
        </div>
      }
    />
  );
}

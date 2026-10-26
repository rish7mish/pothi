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
          Press “शुरू करें →”, then “जाँचना शुरू करें” to step through each{" "}
          <span className="fl" style={{ fontSize: 16 }}>doubtful</span> word, add an explanation if you like, and press
          “पूरा हुआ ✓”. “📖 किताब” shows the printed book. On a phone or tablet, use
          Wispr Flow (or any voice keyboard) to speak corrections in Hindi.
          <div style={{ marginTop: 10 }}>
            <ResetDemo />
          </div>
        </div>
      }
    />
  );
}

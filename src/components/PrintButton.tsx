"use client";

export default function PrintButton() {
  return (
    <button className="btn small primary" onClick={() => window.print()}>
      PDF / प्रिंट
    </button>
  );
}

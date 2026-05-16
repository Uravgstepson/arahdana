"use client";

import { useState } from "react";

const DISCLAIMER_KEY = "arahdana.disclaimer.seen";

export function Disclaimer() {
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(DISCLAIMER_KEY) !== "true",
  );
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  function dismiss() {
    window.localStorage.setItem(DISCLAIMER_KEY, "true");
    setIsVisible(false);
  }

  return (
    <div className="motion-shell mb-5 rounded-[1.35rem] border border-amber-100 bg-amber-50/80 p-3 text-sm text-amber-950 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="min-h-10 flex-1 rounded-[1rem] px-2 text-left font-semibold"
          aria-expanded={isExpanded}
        >
        Beta dan risiko investasi
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-10 rounded-full bg-white/80 px-4 text-xs font-semibold text-amber-950 ring-1 ring-amber-100"
        >
          Mengerti
        </button>
      </div>
      {isExpanded ? (
        <p className="px-2 pb-2 pt-1 leading-6">
          Ini beta software. ArahDana adalah alat bantu analisis dan pencatatan
          investasi, bukan penasihat keuangan. Hasil BUY/WAIT/AVOID berbasis
          data historis, aturan risiko, dan asumsi yang bisa salah. Analisis
          mungkin keliru. Selalu verifikasi sebelum berinvestasi.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AnalyzerResult } from "@/components/AnalyzerResult";
import { FlowPanel, FocusedFlowShell } from "@/components/FocusedFlow";
import { ButtonLink } from "@/components/ui";
import {
  ANALYSIS_RESULT_STORAGE_KEY,
  type AnalysisResultPayload,
} from "@/lib/analysis/resultStorage";

export default function AnalysisResultPage() {
  const payload = useMemo(() => {
    if (typeof window === "undefined") return null;
    const id = new URLSearchParams(window.location.search).get("id");
    const raw = window.localStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY);
    if (!raw) return null;

    try {
      const items = JSON.parse(raw) as AnalysisResultPayload[];
      return items.find((item) => item.id === id) ?? items[0] ?? null;
    } catch {
      return null;
    }
  }, []);

  if (!payload) {
    return (
      <FocusedFlowShell
        eyebrow="Analysis Result"
        title="Hasil tidak ditemukan"
        description="Buat analisis baru agar ArahDana bisa menampilkan result screen yang fokus."
        backHref="/analysis/new"
      >
        <FlowPanel className="grid gap-3">
          <p className="text-sm leading-6 text-stone-600">
            Result hanya dibuat setelah setup analisis selesai. Data lama
            mungkin sudah dibersihkan dari browser.
          </p>
          <ButtonLink href="/analysis/new" variant="primary">
            Buat analisis baru
          </ButtonLink>
        </FlowPanel>
      </FocusedFlowShell>
    );
  }

  return (
    <FocusedFlowShell
      eyebrow="Analysis Result"
      title={payload.input.name}
      description="Hasil analisis ditampilkan di halaman khusus agar keputusan, risiko, dan detail teknikal lebih mudah dibaca."
      backHref="/analysis/new"
    >
      <FlowPanel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-950">
            Result tersimpan
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {payload.dataSourceLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/analysis/new" variant="secondary">
            Analisis lagi
          </ButtonLink>
          <Link
            href="/review"
            className="inline-flex min-h-11 items-center justify-center rounded-[1rem] bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-500/40 hover:bg-emerald-600"
          >
            Buka Review
          </Link>
        </div>
      </FlowPanel>

      <AnalyzerResult
        input={payload.input}
        result={payload.result}
        prices={payload.prices}
        dataSourceLabel={payload.dataSourceLabel}
        isMockData={payload.isMockData}
      />
    </FocusedFlowShell>
  );
}

import type { AnalysisResult } from "@/lib/types/investment";
import { formatPercent, formatRupiah } from "@/lib/utils/format";

export function AnalyzerResult({
  result,
  dataSourceLabel = "Data contoh",
  isMockData = true,
}: {
  result: AnalysisResult;
  dataSourceLabel?: string;
  isMockData?: boolean;
}) {
  const verdictStyle =
    result.verdict === "BUY"
      ? "bg-emerald-700 text-white"
      : result.verdict === "WAIT"
        ? "bg-amber-500 text-stone-950"
        : "bg-rose-700 text-white";
  const mainRiskWarning = result.doNotBuyWarnings[0] ?? "Tidak ada peringatan besar dari data historis.";

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">Hasil analisis</p>
            <h2 className="mt-1 text-xl font-semibold text-stone-950">Ringkasan keputusan</h2>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              isMockData
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {dataSourceLabel}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-sm font-medium text-stone-500">Keputusan</p>
            <div className={`mt-2 w-fit rounded-lg px-4 py-2 text-2xl font-bold ${verdictStyle}`}>
              {verdictLabel(result.verdict)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryItem label="Keyakinan" value={`${result.confidence}%`} />
            <SummaryItem label="Alokasi saran" value={`${result.allocationPercentage}%`} />
            <SummaryItem label="Nominal alokasi" value={formatRupiah(result.allocationAmount)} />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm leading-6 text-rose-950 ring-1 ring-rose-100">
          <p className="font-semibold">Peringatan risiko utama</p>
          <p className="mt-1">{mainRiskWarning}</p>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Analisis detail</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Tren" value={result.trend.label} helper={`Skor tren ${result.trend.score}/100`} />
          <Metric label="Volatilitas" value={`${result.volatility.toFixed(2)}%`} />
          <Metric label="Drawdown" value={`${result.maxDrawdown.toFixed(2)}%`} />
          <Metric label="Momentum" value={formatPercent(result.momentum)} />
          <Metric label="Skor peluang" value={`${result.score}/100`} />
          <Metric label="Skor risiko" value={`${result.riskScore}/100`} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Info
            title={result.entryZones.ideal.label}
            body={`${formatRupiah(result.entryZones.ideal.from)} - ${formatRupiah(result.entryZones.ideal.to)}`}
          />
          <Info
            title="Zona masuk berisiko"
            body={`Hindari pembelian agresif di atas ${formatRupiah(result.entryZones.riskyAbove)}`}
          />
          <Info
            title={result.entryZones.fair.label}
            body={`${formatRupiah(result.entryZones.fair.from)} - ${formatRupiah(result.entryZones.fair.to)}`}
          />
          <Info
            title="Metrik pasar"
            body={`Terbaru ${formatRupiah(result.trend.latestPrice)} | SMA20 ${formatRupiah(
              result.trend.sma20,
            )} | SMA50 ${formatRupiah(result.trend.sma50)} | ${result.trend.dataPoints} titik data`}
          />
        </div>

        <p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          {result.entryZones.note}
        </p>

        <div className="mt-5 rounded-lg bg-rose-50 p-4">
          <h3 className="font-semibold text-rose-950">Kondisi jangan beli</h3>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-rose-900">
            {result.doNotBuyWarnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-lg bg-stone-100 p-4">
          <h3 className="text-sm font-semibold text-stone-950">Penjelasan</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">{result.explanation}</p>
        </div>
      </div>
    </section>
  );
}

export function AnalyzerResultSkeleton() {
  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <SkeletonBlock className="h-12 w-44" />
          <SkeletonBlock className="h-7 w-32" />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
          <SkeletonBlock className="h-28" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
        </div>
        <SkeletonBlock className="mt-4 h-20" />
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <SkeletonBlock className="h-8 w-48" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24" />
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg bg-stone-100 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-stone-500">{helper}</p> : null}
    </div>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <p className="text-sm font-semibold text-stone-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200 ${className}`} />;
}

function verdictLabel(verdict: AnalysisResult["verdict"]) {
  if (verdict === "BUY") return "BELI";
  if (verdict === "WAIT") return "TUNGGU";
  return "HINDARI";
}

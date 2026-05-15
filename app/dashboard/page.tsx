"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AllocationChart } from "@/components/AllocationChart";
import { useAuth } from "@/components/AuthProvider";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { InvestmentType, PortfolioItem, RiskCategory, SavedAnalysisResult, WatchlistItem } from "@/lib/types/investment";
import { dataSourceLabel } from "@/lib/providers/marketClient";
import { formatPercent, formatRupiah, investmentTypeLabel, nonNegativeNumber } from "@/lib/utils/format";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";
import { loadCloudPortfolio, loadCloudSettings, loadCloudWatchlist } from "@/lib/supabase/sync";

type Performer = {
  item: PortfolioItem;
  profit: number;
  profitPercent: number;
};

export default function DashboardPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [analysisResults, setAnalysisResults] = useState<SavedAnalysisResult[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [aprMoneyMarketFund, setAprMoneyMarketFund] = useState(0.05);

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    window.setTimeout(() => {
      void (async () => {
        const storedPortfolio = localArahDanaStorage.readPortfolio();
        const storedWatchlist = localArahDanaStorage.readWatchlist();
        const storedSettings = localArahDanaStorage.readSettings();
        const storedAnalysisResults = localArahDanaStorage.readAnalysisResults();
        const localPortfolio = Array.isArray(storedPortfolio) ? storedPortfolio.map(normalizePortfolioItem) : [];
        const localWatchlist = Array.isArray(storedWatchlist) ? storedWatchlist : [];
        const localAnalysisResults = Array.isArray(storedAnalysisResults) ? storedAnalysisResults : [];

        if (!user) {
          if (!isMounted) return;
          setPortfolio(localPortfolio);
          setWatchlist(localWatchlist);
          setAnalysisResults(localAnalysisResults);
          if (storedSettings && typeof storedSettings.aprMoneyMarketFund === "number" && Number.isFinite(storedSettings.aprMoneyMarketFund)) {
            setAprMoneyMarketFund(nonNegativeNumber(storedSettings.aprMoneyMarketFund));
          }
          setIsHydrated(true);
          return;
        }

        try {
          const [cloudPortfolio, cloudWatchlist, cloudSettings] = await Promise.all([
            loadCloudPortfolio(user),
            loadCloudWatchlist(user),
            loadCloudSettings(user),
          ]);
          if (!isMounted) return;
          const nextPortfolio = cloudPortfolio.length > 0 ? cloudPortfolio : localPortfolio;
          const nextWatchlist = cloudWatchlist.length > 0 ? cloudWatchlist : localWatchlist;
          setPortfolio(nextPortfolio);
          setWatchlist(nextWatchlist);
          setAnalysisResults(localAnalysisResults);
          localArahDanaStorage.writePortfolio(nextPortfolio);
          localArahDanaStorage.writeWatchlist(nextWatchlist);
          if (cloudSettings) {
            localArahDanaStorage.writeSettings(cloudSettings);
            setAprMoneyMarketFund(nonNegativeNumber(cloudSettings.aprMoneyMarketFund ?? 0.05));
          } else if (storedSettings && typeof storedSettings.aprMoneyMarketFund === "number" && Number.isFinite(storedSettings.aprMoneyMarketFund)) {
            setAprMoneyMarketFund(nonNegativeNumber(storedSettings.aprMoneyMarketFund));
          }
        } catch {
          if (!isMounted) return;
          setPortfolio(localPortfolio);
          setWatchlist(localWatchlist);
          setAnalysisResults(localAnalysisResults);
          if (storedSettings && typeof storedSettings.aprMoneyMarketFund === "number" && Number.isFinite(storedSettings.aprMoneyMarketFund)) {
            setAprMoneyMarketFund(nonNegativeNumber(storedSettings.aprMoneyMarketFund));
          }
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  const metrics = useMemo(() => calculateDashboardMetrics(portfolio, aprMoneyMarketFund), [aprMoneyMarketFund, portfolio]);
  const hasPortfolio = portfolio.length > 0;
  const syncLabel = user ? "Cloud sync" : "Local";
  const latestRecommendations = analysisResults.slice(0, 3);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.8rem] bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-white/15">
            {syncLabel}
          </span>
          <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950" href="/portfolio">
            Kelola
          </Link>
        </div>
        <div className="mt-8">
          <p className="text-sm font-medium text-white/62">Total nilai</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatRupiah(metrics.current)}
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <DashboardMetric label="Hari ini" value="-" helper="Belum tersedia" />
          <DashboardMetric
            label="Total P/L"
            value={formatRupiah(metrics.profit)}
            helper={formatPercent(metrics.profitPercent)}
            tone={metrics.profit >= 0 ? "good" : "bad"}
          />
          <DashboardMetric
            label="Risiko"
            value={metrics.riskSummary.label}
            helper={metrics.riskSummary.shortDetail}
          />
        </div>
      </section>

      {!hasPortfolio && isHydrated ? (
        <section className="rounded-[1.6rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Portofolio masih kosong</h2>
          <Link className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm" href="/portfolio">
            Tambah portofolio
          </Link>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <AllocationChart
          title="Alokasi"
          compact
          data={metrics.allocation.map((item) => ({
            key: item.type,
            label: investmentTypeLabel(item.type),
            value: item.value,
            percent: item.percent,
          }))}
          emptyMessage="Belum ada alokasi. Tambahkan kepemilikan manual dulu."
        />

        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Performa</h2>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
              {portfolio.length} holding
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <PerformerCard title="Kenaikan terbaik" performer={metrics.topGainer} tone="good" />
            <PerformerCard title="Performa terlemah" performer={metrics.worstPerformer} tone="bad" />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Pantauan</h2>
            <Link className="text-sm font-semibold text-emerald-700" href="/watchlist">Kelola</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {watchlist.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-[1.2rem] bg-stone-100 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="mt-1 truncate text-sm text-stone-600">{item.targetBuyZone}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-stone-200">
                  {watchlistStatusLabel(item.status)}
                </span>
              </div>
            ))}
            {watchlist.length === 0 ? (
              <EmptyMini href="/watchlist" label="Tambah pantauan" />
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Rekomendasi</h2>
            <Link className="text-sm font-semibold text-emerald-700" href="/analyzer">Analisis</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {latestRecommendations.map((item) => (
              <div key={item.id} className="rounded-[1.2rem] bg-stone-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold">{item.name}</p>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${verdictChipClass(item.result.verdict)}`}>
                    {verdictLabel(item.result.verdict)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  Alokasi {item.result.allocationPercentage}% | Confidence {item.result.confidence}%
                </p>
              </div>
            ))}
            {latestRecommendations.length === 0 ? (
              <EmptyMini href="/analyzer" label="Buat analisis" />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-200"
      : tone === "bad"
        ? "text-rose-200"
        : "text-white";

  return (
    <div className="rounded-[1.25rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/52">
        {label}
      </p>
      <p className={`mt-2 text-lg font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-white/50">{helper}</p>
    </div>
  );
}

function EmptyMini({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-[1.2rem] border border-dashed border-stone-300 p-5 text-center">
      <Link href={href} className="text-sm font-semibold text-emerald-700">
        {label}
      </Link>
    </div>
  );
}

function PerformerCard({ title, performer, tone }: { title: string; performer: Performer | null; tone: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="rounded-[1.2rem] bg-stone-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{title}</p>
      {performer ? (
        <>
          <p className="mt-2 truncate font-semibold text-stone-950">{performer.item.name}</p>
          <p className={`mt-1 text-sm font-semibold ${toneClass}`}>
            {formatRupiah(performer.profit)} ({formatPercent(performer.profitPercent)})
          </p>
          <p className="mt-1 text-xs text-stone-500">{dataSourceLabel(performer.item.dataSource)}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Belum ada data.</p>
      )}
    </div>
  );
}

function verdictChipClass(verdict: SavedAnalysisResult["result"]["verdict"]) {
  if (verdict === "BUY") return "bg-emerald-100 text-emerald-800";
  if (verdict === "WAIT") return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-800";
}

function verdictLabel(verdict: SavedAnalysisResult["result"]["verdict"]) {
  if (verdict === "BUY") return "BUY";
  if (verdict === "WAIT") return "WAIT";
  return "AVOID";
}

function calculateDashboardMetrics(items: PortfolioItem[], aprMoneyMarketFund: number) {
  const invested = items.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const current = items.reduce((sum, item) => {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
    return sum + currentPriceUsed * item.quantity;
  }, 0);
  const profit = current - invested;
  const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;
  const allocationMap = items.reduce<Partial<Record<InvestmentType, number>>>((acc, item) => {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
    acc[item.type] = (acc[item.type] ?? 0) + currentPriceUsed * item.quantity;
    return acc;
  }, {});
  const allocation = Object.entries(allocationMap).map(([type, value]) => ({
    type: type as InvestmentType,
    value,
    percent: current > 0 ? Math.round((value / current) * 100) : 0,
  }));
  const performers = items.map((item) => {
    const itemInvested = item.buyPrice * item.quantity;
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
    const itemCurrent = currentPriceUsed * item.quantity;
    const itemProfit = itemCurrent - itemInvested;
    return {
      item,
      profit: itemProfit,
      profitPercent: itemInvested > 0 ? (itemProfit / itemInvested) * 100 : 0,
    };
  });
  const riskSummary = summarizeRisk(items, aprMoneyMarketFund);

  return {
    invested,
    current,
    profit,
    profitPercent,
    allocation,
    topGainer: performers.length ? performers.reduce((best, item) => (item.profitPercent > best.profitPercent ? item : best)) : null,
    worstPerformer: performers.length ? performers.reduce((worst, item) => (item.profitPercent < worst.profitPercent ? item : worst)) : null,
    riskSummary,
  };
}

function summarizeRisk(items: PortfolioItem[], aprMoneyMarketFund: number) {
  if (items.length === 0) {
    return {
      label: "Belum ada data",
      detail: "Tambahkan kepemilikan dulu",
      shortDetail: "Kosong",
    };
  }

  const exposure = items.reduce<Record<RiskCategory, number>>(
    (acc, item) => {
      const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
      acc[item.riskCategory] += currentPriceUsed * item.quantity;
      return acc;
    },
    { low: 0, medium: 0, high: 0 },
  );
  const total = exposure.low + exposure.medium + exposure.high;
  const dominant = Object.entries(exposure).reduce((best, current) => (current[1] > best[1] ? current : best));
  const detail =
    total > 0
      ? `${Math.round((exposure.high / total) * 100)}% tinggi, ${Math.round((exposure.medium / total) * 100)}% sedang, ${Math.round((exposure.low / total) * 100)}% rendah`
      : "Nilai kini masih 0";

  return {
    label: dominant[0] === "high" ? "Risiko tinggi" : dominant[0] === "medium" ? "Seimbang" : "Defensif",
    detail,
    shortDetail:
      dominant[0] === "high"
        ? `${Math.round((exposure.high / total) * 100)}% tinggi`
        : dominant[0] === "medium"
          ? `${Math.round((exposure.medium / total) * 100)}% sedang`
          : `${Math.round((exposure.low / total) * 100)}% rendah`,
  };
}

function watchlistStatusLabel(status: WatchlistItem["status"]) {
  if (status === "watching") return "Dipantau";
  if (status === "waiting") return "Menunggu";
  if (status === "avoid") return "Hindari";
  return "Sudah dibeli";
}

function normalizePortfolioItem(item: PortfolioItem): PortfolioItem {
  return {
    ...item,
    ticker: item.ticker ?? "",
    buyPrice: nonNegativeNumber(item.buyPrice),
    quantity: nonNegativeNumber(item.quantity),
    currentPrice: nonNegativeNumber(item.currentPrice),
    dataSource: item.dataSource ?? "manual_input",
  };
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AllocationCard } from "@/components/AllocationCard";
import { StatCard } from "@/components/StatCard";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { InvestmentType, PortfolioItem, RiskCategory, WatchlistItem } from "@/lib/types/investment";
import { dataSourceLabel } from "@/lib/providers/marketClient";
import { formatPercent, formatRupiah, investmentTypeLabel, nonNegativeNumber } from "@/lib/utils/format";
import { samplePortfolio, sampleWatchlist } from "@/lib/utils/sampleData";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";

type Performer = {
  item: PortfolioItem;
  profit: number;
  profitPercent: number;
};

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(samplePortfolio);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(sampleWatchlist);
  const [portfolioIsMock, setPortfolioIsMock] = useState(true);
  const [watchlistIsMock, setWatchlistIsMock] = useState(true);
  const [aprMoneyMarketFund, setAprMoneyMarketFund] = useState(0.05);

  useEffect(() => {
    window.setTimeout(() => {
      const storedPortfolio = localArahDanaStorage.readPortfolio();
      const storedWatchlist = localArahDanaStorage.readWatchlist();
      const storedSettings = localArahDanaStorage.readSettings();

      setPortfolio(Array.isArray(storedPortfolio) ? storedPortfolio.map(normalizePortfolioItem) : samplePortfolio);
      setWatchlist(Array.isArray(storedWatchlist) ? storedWatchlist : sampleWatchlist);
      setPortfolioIsMock(!storedPortfolio);
      setWatchlistIsMock(!storedWatchlist);
      if (storedSettings && typeof storedSettings.aprMoneyMarketFund === "number" && Number.isFinite(storedSettings.aprMoneyMarketFund)) {
        setAprMoneyMarketFund(nonNegativeNumber(storedSettings.aprMoneyMarketFund));
      }
    }, 0);
  }, []);

  const metrics = useMemo(() => calculateDashboardMetrics(portfolio, aprMoneyMarketFund), [aprMoneyMarketFund, portfolio]);
  const dataSource = portfolioIsMock
    ? "Data contoh"
    : portfolio.some((item) => item.dataSource === "live_public_market_data")
      ? "Data pasar publik langsung + portofolio lokal"
      : portfolio.some((item) => item.dataSource === "bibit_import" || item.dataSource === "savings_import" || item.dataSource === "semi_auto_import")
        ? "Impor semi-otomatis + portofolio lokal"
      : "Input manual dari localStorage";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Dasbor portofolio</h2>
          <p className="mt-1 text-sm text-stone-600">
            Sumber data: <span className="font-semibold">{dataSource}</span>
          </p>
        </div>
        <Link className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm" href="/portfolio">
          Kelola portofolio
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total modal" value={formatRupiah(metrics.invested)} helper={portfolioIsMock ? "Data portofolio contoh" : "Portofolio lokal tersimpan"} />
        <StatCard label="Nilai kini" value={formatRupiah(metrics.current)} helper={dataSource} />
        <StatCard label="Total untung/rugi" value={formatRupiah(metrics.profit)} helper={formatPercent(metrics.profitPercent)} tone={metrics.profit >= 0 ? "good" : "bad"} />
        <StatCard label="Eksposur risiko" value={metrics.riskSummary.label} helper={metrics.riskSummary.detail} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Alokasi berdasarkan jenis instrumen</h2>
            <Link className="text-sm font-semibold text-emerald-700" href="/portfolio">Perbarui harga</Link>
          </div>
          <p className="mt-2 text-sm text-stone-500">
            Alokasi dihitung dari harga terbaru/kini yang tersimpan di localStorage.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {metrics.allocation.length > 0 ? metrics.allocation.map((item) => (
              <AllocationCard
                key={item.type}
                label={investmentTypeLabel(item.type)}
                value={`${item.percent}%`}
                detail={formatRupiah(item.value)}
              />
            )) : (
              <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
                Belum ada alokasi. Tambahkan kepemilikan manual dulu.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Ringkasan performa</h2>
          <div className="mt-4 grid gap-3">
            <PerformerCard title="Kenaikan terbaik" performer={metrics.topGainer} tone="good" />
            <PerformerCard title="Performa terlemah" performer={metrics.worstPerformer} tone="bad" />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Pratinjau pantauan</h2>
            <p className="mt-1 text-sm text-stone-500">
              {watchlistIsMock ? "Data contoh" : "Input manual dari localStorage"}
            </p>
          </div>
          <Link className="text-sm font-semibold text-emerald-700" href="/watchlist">Kelola pantauan</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {watchlist.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-lg bg-stone-100 p-4">
              <p className="font-semibold">{item.name}</p>
              <p className="mt-1 text-sm text-stone-600">{item.targetBuyZone}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">{watchlistStatusLabel(item.status)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PerformerCard({ title, performer, tone }: { title: string; performer: Performer | null; tone: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="rounded-lg bg-stone-100 p-4">
      <p className="text-sm font-semibold text-stone-500">{title}</p>
      {performer ? (
        <>
          <p className="mt-2 font-semibold text-stone-950">{performer.item.name}</p>
          <p className={`mt-1 text-sm font-semibold ${toneClass}`}>
            {formatRupiah(performer.profit)} ({formatPercent(performer.profitPercent)})
          </p>
          <p className="mt-1 text-xs text-stone-500">{dataSourceLabel(performer.item.dataSource)}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Belum ada data kepemilikan.</p>
      )}
    </div>
  );
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
  if (items.length === 0) return { label: "Belum ada data", detail: "Tambahkan kepemilikan dulu" };

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

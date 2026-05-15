"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AllocationChart } from "@/components/AllocationChart";
import { PortfolioPerformanceChart } from "@/components/PortfolioPerformanceChart";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/components/AuthProvider";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { InvestmentType, PortfolioItem, RiskCategory, WatchlistItem } from "@/lib/types/investment";
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
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistIsCloud, setWatchlistIsCloud] = useState(false);
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
        const localPortfolio = Array.isArray(storedPortfolio) ? storedPortfolio.map(normalizePortfolioItem) : [];
        const localWatchlist = Array.isArray(storedWatchlist) ? storedWatchlist : [];

        if (!user) {
          if (!isMounted) return;
          setPortfolio(localPortfolio);
          setWatchlist(localWatchlist);
          setWatchlistIsCloud(false);
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
          setWatchlistIsCloud(cloudWatchlist.length > 0);
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
          setWatchlistIsCloud(false);
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
  const dataSource = !isHydrated
    ? "Memuat portofolio lokal"
      : !hasPortfolio
      ? user ? "Belum ada portofolio cloud/lokal" : "Belum ada portofolio lokal"
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
        <StatCard label="Total modal" value={formatRupiah(metrics.invested)} helper={hasPortfolio ? "Portofolio lokal tersimpan" : "Belum ada kepemilikan"} />
        <StatCard label="Nilai kini" value={formatRupiah(metrics.current)} helper={dataSource} />
        <StatCard label="Total untung/rugi" value={formatRupiah(metrics.profit)} helper={formatPercent(metrics.profitPercent)} tone={metrics.profit >= 0 ? "good" : "bad"} />
        <StatCard label="Eksposur risiko" value={metrics.riskSummary.label} helper={metrics.riskSummary.detail} />
      </div>

      {!hasPortfolio && isHydrated ? (
        <section className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Portofolio masih kosong</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Tambahkan kepemilikan manual atau impor dari file agar dasbor menampilkan alokasi, nilai kini, P/L, dan risiko dari data lokal Anda sendiri.
          </p>
          <Link className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm" href="/portfolio">
            Tambah portofolio
          </Link>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <AllocationChart
          title="Alokasi berdasarkan jenis instrumen"
          description="Dihitung dari harga terbaru/kini yang tersimpan di localStorage."
          data={metrics.allocation.map((item) => ({
            key: item.type,
            label: investmentTypeLabel(item.type),
            value: item.value,
            percent: item.percent,
          }))}
          emptyMessage="Belum ada alokasi. Tambahkan kepemilikan manual dulu."
        />

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Ringkasan performa</h2>
          <div className="mt-4 grid gap-3">
            <PerformerCard title="Kenaikan terbaik" performer={metrics.topGainer} tone="good" />
            <PerformerCard title="Performa terlemah" performer={metrics.worstPerformer} tone="bad" />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioPerformanceChart items={portfolio} aprMoneyMarketFund={aprMoneyMarketFund} />
        <AllocationChart
          title="Eksposur risiko"
          description="Komposisi risiko berdasarkan nilai kini portofolio lokal."
          data={metrics.riskExposure.map((item) => ({
            key: item.risk,
            label: riskLabel(item.risk),
            value: item.value,
            percent: item.percent,
          }))}
          emptyMessage="Belum ada data risiko untuk dihitung."
        />
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Pratinjau pantauan</h2>
            <p className="mt-1 text-sm text-stone-500">
              {user && watchlistIsCloud ? "Cloud sync enabled" : isConfigured ? "Local mode" : "Local mode"}
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
          {watchlist.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 md:col-span-3">
              Belum ada pantauan. Tambahkan ticker atau zona target di halaman Pantauan.
            </div>
          ) : null}
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
  const riskExposureMap = items.reduce<Record<RiskCategory, number>>(
    (acc, item) => {
      const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
      acc[item.riskCategory] += currentPriceUsed * item.quantity;
      return acc;
    },
    { low: 0, medium: 0, high: 0 },
  );
  const riskExposure = Object.entries(riskExposureMap).map(([risk, value]) => ({
    risk: risk as RiskCategory,
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
    riskExposure,
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

function riskLabel(risk: RiskCategory) {
  if (risk === "high") return "Risiko tinggi";
  if (risk === "medium") return "Risiko sedang";
  return "Risiko rendah";
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

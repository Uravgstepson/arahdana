"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { LoadingState } from "@/components/AppState";
import { useAuth } from "@/components/AuthProvider";
import { PortfolioHealthCard } from "@/components/PortfolioHealthCard";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type {
  AppNotification,
  InvestmentType,
  PortfolioItem,
  RiskCategory,
  SavedAnalysisResult,
  FinancialGoal,
  GoalContribution,
  WatchlistItem,
} from "@/lib/types/investment";
import { dataSourceLabel } from "@/lib/providers/marketClient";
import {
  formatPercent,
  formatRupiah,
  investmentTypeLabel,
  nonNegativeNumber,
} from "@/lib/utils/format";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";
import {
  loadCloudPortfolio,
  loadCloudSettings,
  loadCloudWatchlist,
} from "@/lib/supabase/sync";
import { usePerformanceMode } from "@/lib/utils/performanceMode";

const AllocationChart = dynamic(
  () =>
    import("@/components/AllocationChart").then(
      (module) => module.AllocationChart,
    ),
  {
    loading: () => (
      <div className="h-80 rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="h-6 w-32 rounded-full bg-stone-200 motion-safe:animate-pulse" />
        <div className="mt-5 h-56 rounded-[1.2rem] bg-stone-100 motion-safe:animate-pulse" />
      </div>
    ),
  },
);

type Performer = {
  item: PortfolioItem;
  profit: number;
  profitPercent: number;
};

type HomeInsight = {
  id: string;
  eyebrow: string;
  title: string;
  message: string;
  href?: string;
};

export default function DashboardPage() {
  const { isLoading: isAuthLoading, profile, user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [analysisResults, setAnalysisResults] = useState<SavedAnalysisResult[]>(
    [],
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [aprMoneyMarketFund, setAprMoneyMarketFund] = useState(0.05);
  const [riskTolerance, setRiskTolerance] = useState(15);
  const [greetingTemplate, setGreetingTemplate] = useState("Halo, {name}");

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    window.setTimeout(() => {
      void (async () => {
        const storedPortfolio = localArahDanaStorage.readPortfolio();
        const storedWatchlist = localArahDanaStorage.readWatchlist();
        const storedSettings = localArahDanaStorage.readSettings();
        const storedAnalysisResults =
          localArahDanaStorage.readAnalysisResults();
        const storedNotifications = localArahDanaStorage.readNotifications();
        const storedGoals = localArahDanaStorage.readGoals();
        const storedGoalContributions =
          localArahDanaStorage.readGoalContributions();
        const localPortfolio = Array.isArray(storedPortfolio)
          ? storedPortfolio.map(normalizePortfolioItem)
          : [];
        const localWatchlist = Array.isArray(storedWatchlist)
          ? storedWatchlist
          : [];
        const localAnalysisResults = Array.isArray(storedAnalysisResults)
          ? storedAnalysisResults
          : [];
        const localNotifications = Array.isArray(storedNotifications)
          ? storedNotifications
          : [];
        const localGoals = Array.isArray(storedGoals) ? storedGoals : [];
        const localGoalContributions = Array.isArray(storedGoalContributions)
          ? storedGoalContributions
          : [];

        if (!user) {
          if (!isMounted) return;
          setPortfolio(localPortfolio);
          setWatchlist(localWatchlist);
          setAnalysisResults(localAnalysisResults);
          setNotifications(localNotifications);
          setGoals(localGoals);
          setGoalContributions(localGoalContributions);
          if (
            storedSettings &&
            typeof storedSettings.aprMoneyMarketFund === "number" &&
            Number.isFinite(storedSettings.aprMoneyMarketFund)
          ) {
            setAprMoneyMarketFund(
              nonNegativeNumber(storedSettings.aprMoneyMarketFund),
            );
          }
          if (
            storedSettings &&
            typeof storedSettings.riskTolerance === "number" &&
            Number.isFinite(storedSettings.riskTolerance)
          ) {
            setRiskTolerance(nonNegativeNumber(storedSettings.riskTolerance));
          }
          setIsHydrated(true);
          return;
        }

        try {
          const [cloudPortfolio, cloudWatchlist, cloudSettings] =
            await Promise.all([
              loadCloudPortfolio(user),
              loadCloudWatchlist(user),
              loadCloudSettings(user),
            ]);
          if (!isMounted) return;
          const nextPortfolio =
            cloudPortfolio.length > 0 ? cloudPortfolio : localPortfolio;
          const nextWatchlist =
            cloudWatchlist.length > 0 ? cloudWatchlist : localWatchlist;
          setPortfolio(nextPortfolio);
          setWatchlist(nextWatchlist);
          setAnalysisResults(localAnalysisResults);
          setNotifications(localNotifications);
          setGoals(localGoals);
          setGoalContributions(localGoalContributions);
          localArahDanaStorage.writePortfolio(nextPortfolio);
          localArahDanaStorage.writeWatchlist(nextWatchlist);
          if (cloudSettings) {
            localArahDanaStorage.writeSettings(cloudSettings);
            setAprMoneyMarketFund(
              nonNegativeNumber(cloudSettings.aprMoneyMarketFund ?? 0.05),
            );
            setRiskTolerance(
              nonNegativeNumber(cloudSettings.riskTolerance ?? 15),
            );
          } else if (
            storedSettings &&
            typeof storedSettings.aprMoneyMarketFund === "number" &&
            Number.isFinite(storedSettings.aprMoneyMarketFund)
          ) {
            setAprMoneyMarketFund(
              nonNegativeNumber(storedSettings.aprMoneyMarketFund),
            );
            if (
              storedSettings &&
              typeof storedSettings.riskTolerance === "number" &&
              Number.isFinite(storedSettings.riskTolerance)
            ) {
              setRiskTolerance(nonNegativeNumber(storedSettings.riskTolerance));
            }
          }
        } catch {
          if (!isMounted) return;
          setPortfolio(localPortfolio);
          setWatchlist(localWatchlist);
          setAnalysisResults(localAnalysisResults);
          setNotifications(localNotifications);
          setGoals(localGoals);
          setGoalContributions(localGoalContributions);
          if (
            storedSettings &&
            typeof storedSettings.aprMoneyMarketFund === "number" &&
            Number.isFinite(storedSettings.aprMoneyMarketFund)
          ) {
            setAprMoneyMarketFund(
              nonNegativeNumber(storedSettings.aprMoneyMarketFund),
            );
          }
          if (
            storedSettings &&
            typeof storedSettings.riskTolerance === "number" &&
            Number.isFinite(storedSettings.riskTolerance)
          ) {
            setRiskTolerance(nonNegativeNumber(storedSettings.riskTolerance));
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

  useEffect(() => {
    setGreetingTemplate(readSessionGreetingTemplate());
  }, []);

  const metrics = useMemo(
    () => calculateDashboardMetrics(portfolio, aprMoneyMarketFund),
    [aprMoneyMarketFund, portfolio],
  );
  const hasPortfolio = portfolio.length > 0;
  const syncLabel = user ? "Cloud sync" : "Local";
  const displayName = getDisplayName(profile?.display_name, user?.email);
  const greeting = formatGreeting(greetingTemplate, displayName);
  const latestRecommendations = analysisResults.slice(0, 3);
  const latestAlert =
    notifications.find((item) => !item.readAt) ?? notifications[0] ?? null;
  const insights = useMemo(
    () =>
      buildHomeInsights({
        goals,
        goalContributions,
        latestAlert,
        metrics,
        portfolio,
        watchlist,
      }),
    [goals, goalContributions, latestAlert, metrics, portfolio, watchlist],
  );

  if (!isHydrated) {
    return (
      <LoadingState
        title="Memuat Home"
        message="Mengambil data lokal dan cloud bila akun tersedia."
      />
    );
  }

  return (
    <div className="space-y-5">
      <HomeGreetingInsightCard greeting={greeting} insights={insights} />

      <section className="overflow-hidden rounded-[1.8rem] bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-white/15">
            {syncLabel}
          </span>
          <Link
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950"
            href="/portfolio"
          >
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
          <DashboardMetric
            label="Health score"
            value={`${metrics.healthScore}/100`}
            helper={metrics.healthLabel}
          />
          <DashboardMetric
            label="Total P/L"
            value={formatRupiah(metrics.profit)}
            helper={formatPercent(metrics.profitPercent)}
            tone={metrics.profit >= 0 ? "good" : "bad"}
          />
          <DashboardMetric
            label="Alert"
            value={latestAlert ? latestAlert.title : "Tenang"}
            helper={
              latestAlert ? latestAlert.message : "Belum ada alert penting"
            }
          />
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-stone-950">
            Alokasi ringkas
          </h2>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            {portfolio.length} holding
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {metrics.allocation.length === 0 ? (
            <Link
              className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              href="/portfolio"
            >
              Tambah portofolio
            </Link>
          ) : null}
          {metrics.allocation.map((item) => (
            <div
              key={item.type}
              className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200"
            >
              {investmentTypeLabel(item.type)}{" "}
              <span className="text-stone-500">{item.percent}%</span>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-stone-950">
          Detail portofolio
        </summary>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.95fr]">
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

          <section className="rounded-[1.4rem] bg-stone-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Performa</h2>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                {metrics.riskSummary.label}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <PerformerCard
                title="Kenaikan terbaik"
                performer={metrics.topGainer}
                tone="good"
              />
              <PerformerCard
                title="Performa terlemah"
                performer={metrics.worstPerformer}
                tone="bad"
              />
            </div>
          </section>
        </div>
      </details>

      <details className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-stone-950">
          Pantauan dan rekomendasi
        </summary>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="rounded-[1.4rem] bg-stone-100 p-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Pantauan</h2>
              <Link
                className="text-sm font-semibold text-emerald-700"
                href="/watchlist"
              >
                Kelola
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {watchlist.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[1.2rem] bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="mt-1 truncate text-sm text-stone-600">
                      {item.targetBuyZone}
                    </p>
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

          <section className="rounded-[1.4rem] bg-stone-100 p-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Rekomendasi</h2>
              <Link
                className="text-sm font-semibold text-emerald-700"
                href="/analyzer"
              >
                Analisis
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {latestRecommendations.map((item) => (
                <div key={item.id} className="rounded-[1.2rem] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-semibold">
                      {item.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${verdictChipClass(item.result.verdict)}`}
                    >
                      {verdictLabel(item.result.verdict)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Alokasi {item.result.allocationPercentage}% | Confidence{" "}
                    {item.result.confidence}%
                  </p>
                </div>
              ))}
              {latestRecommendations.length === 0 ? (
                <EmptyMini href="/analyzer" label="Buat analisis" />
              ) : null}
            </div>
          </section>
        </div>
      </details>

      {hasPortfolio ? (
        <div>
          <PortfolioHealthCard
            portfolio={portfolio}
            riskTolerance={riskTolerance}
            aprMoneyMarketFund={aprMoneyMarketFund}
          />
        </div>
      ) : null}

      {!hasPortfolio && isHydrated ? (
        <section className="rounded-[1.6rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            Portofolio masih kosong
          </h2>
          <Link
            className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            href="/portfolio"
          >
            Tambah portofolio
          </Link>
        </section>
      ) : null}
    </div>
  );
}

const HomeGreetingInsightCard = memo(function HomeGreetingInsightCard({
  greeting,
  insights,
}: {
  greeting: string;
  insights: HomeInsight[];
}) {
  const performanceProfile = usePerformanceMode();
  const [activeIndex, setActiveIndex] = useState(0);
  const [interactionKey, setInteractionKey] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activeInsight = insights[activeIndex] ?? insights[0];

  useEffect(() => {
    if (
      insights.length <= 1 ||
      performanceProfile.reduceMotion ||
      performanceProfile.mode === "low"
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % insights.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [
    insights.length,
    interactionKey,
    performanceProfile.mode,
    performanceProfile.reduceMotion,
  ]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, insights.length - 1)));
  }, [insights.length]);

  function goTo(index: number) {
    setInteractionKey((current) => current + 1);
    setActiveIndex(index);
  }

  function move(direction: 1 | -1) {
    setInteractionKey((current) => current + 1);
    setActiveIndex((current) =>
      (current + direction + insights.length) % insights.length,
    );
  }

  if (!activeInsight) return null;

  return (
    <section
      className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
      aria-label="Insight Home"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        const endX = event.changedTouches[0]?.clientX;
        if (startX === null || endX === undefined || insights.length <= 1) return;
        const delta = endX - startX;
        if (Math.abs(delta) > 42) move(delta < 0 ? 1 : -1);
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
          ArahDana
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
          {greeting}
        </h2>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3 border-t border-stone-200 pt-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            {activeInsight.eyebrow}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-tight text-stone-950">
            {activeInsight.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {activeInsight.message}
          </p>
        </div>
        {activeInsight.href ? (
          <Link
            href={activeInsight.href}
            className="shrink-0 rounded-full bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
          >
            Buka
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label="Pilih insight">
          {insights.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === activeIndex ? "w-6 bg-emerald-700" : "w-2 bg-stone-300"
              }`}
              aria-label={`Insight ${index + 1}`}
              aria-current={index === activeIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

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

function PerformerCard({
  title,
  performer,
  tone,
}: {
  title: string;
  performer: Performer | null;
  tone: "good" | "bad";
}) {
  const toneClass = tone === "good" ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="rounded-[1.2rem] bg-stone-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        {title}
      </p>
      {performer ? (
        <>
          <p className="mt-2 truncate font-semibold text-stone-950">
            {performer.item.name}
          </p>
          <p className={`mt-1 text-sm font-semibold ${toneClass}`}>
            {formatRupiah(performer.profit)} (
            {formatPercent(performer.profitPercent)})
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {dataSourceLabel(performer.item.dataSource)}
          </p>
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

function calculateDashboardMetrics(
  items: PortfolioItem[],
  aprMoneyMarketFund: number,
) {
  const invested = items.reduce(
    (sum, item) => sum + item.buyPrice * item.quantity,
    0,
  );
  const current = items.reduce((sum, item) => {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, {
      aprMoneyMarketFund,
    });
    return sum + currentPriceUsed * item.quantity;
  }, 0);
  const profit = current - invested;
  const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;
  const allocationMap = items.reduce<Partial<Record<InvestmentType, number>>>(
    (acc, item) => {
      const { currentPriceUsed } = computePortfolioCurrentPrice(item, {
        aprMoneyMarketFund,
      });
      acc[item.type] = (acc[item.type] ?? 0) + currentPriceUsed * item.quantity;
      return acc;
    },
    {},
  );
  const allocation = Object.entries(allocationMap).map(([type, value]) => ({
    type: type as InvestmentType,
    value,
    percent: current > 0 ? Math.round((value / current) * 100) : 0,
  }));
  const performers = items.map((item) => {
    const itemInvested = item.buyPrice * item.quantity;
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, {
      aprMoneyMarketFund,
    });
    const itemCurrent = currentPriceUsed * item.quantity;
    const itemProfit = itemCurrent - itemInvested;
    return {
      item,
      profit: itemProfit,
      profitPercent: itemInvested > 0 ? (itemProfit / itemInvested) * 100 : 0,
    };
  });
  const riskSummary = summarizeRisk(items, aprMoneyMarketFund);
  const healthScore = calculateHealthScore({
    hasPortfolio: items.length > 0,
    profitPercent,
    highRiskShare: riskSummary.highRiskShare,
    allocationCount: allocation.length,
  });

  return {
    invested,
    current,
    profit,
    profitPercent,
    allocation,
    topGainer: performers.length
      ? performers.reduce((best, item) =>
          item.profitPercent > best.profitPercent ? item : best,
        )
      : null,
    worstPerformer: performers.length
      ? performers.reduce((worst, item) =>
          item.profitPercent < worst.profitPercent ? item : worst,
        )
      : null,
    riskSummary,
    healthScore,
    healthLabel:
      healthScore >= 80 ? "Sehat" : healthScore >= 60 ? "Cukup" : "Perlu dicek",
  };
}

function summarizeRisk(items: PortfolioItem[], aprMoneyMarketFund: number) {
  if (items.length === 0) {
    return {
      label: "Belum ada data",
      detail: "Tambahkan kepemilikan dulu",
      shortDetail: "Kosong",
      highRiskShare: 0,
    };
  }

  const exposure = items.reduce<Record<RiskCategory, number>>(
    (acc, item) => {
      const { currentPriceUsed } = computePortfolioCurrentPrice(item, {
        aprMoneyMarketFund,
      });
      acc[item.riskCategory] += currentPriceUsed * item.quantity;
      return acc;
    },
    { low: 0, medium: 0, high: 0 },
  );
  const total = exposure.low + exposure.medium + exposure.high;
  const dominant = Object.entries(exposure).reduce((best, current) =>
    current[1] > best[1] ? current : best,
  );
  const detail =
    total > 0
      ? `${Math.round((exposure.high / total) * 100)}% tinggi, ${Math.round((exposure.medium / total) * 100)}% sedang, ${Math.round((exposure.low / total) * 100)}% rendah`
      : "Nilai kini masih 0";

  return {
    label:
      dominant[0] === "high"
        ? "Risiko tinggi"
        : dominant[0] === "medium"
          ? "Seimbang"
          : "Defensif",
    detail,
    highRiskShare: total > 0 ? exposure.high / total : 0,
    shortDetail:
      dominant[0] === "high"
        ? `${Math.round((exposure.high / total) * 100)}% tinggi`
        : dominant[0] === "medium"
          ? `${Math.round((exposure.medium / total) * 100)}% sedang`
          : `${Math.round((exposure.low / total) * 100)}% rendah`,
  };
}

function calculateHealthScore({
  hasPortfolio,
  profitPercent,
  highRiskShare,
  allocationCount,
}: {
  hasPortfolio: boolean;
  profitPercent: number;
  highRiskShare: number;
  allocationCount: number;
}) {
  if (!hasPortfolio) return 0;
  const diversification = Math.min(20, allocationCount * 5);
  const riskPenalty = highRiskShare > 0.65 ? 18 : highRiskShare > 0.45 ? 10 : 0;
  const performance = profitPercent >= 0 ? 20 : Math.max(0, 20 + profitPercent);
  return Math.round(
    Math.max(
      0,
      Math.min(100, 55 + diversification + performance - riskPenalty),
    ),
  );
}

function watchlistStatusLabel(status: WatchlistItem["status"]) {
  if (status === "watching") return "Dipantau";
  if (status === "waiting") return "Menunggu";
  if (status === "avoid") return "Hindari";
  return "Sudah dibeli";
}

function buildHomeInsights({
  goals,
  goalContributions,
  latestAlert,
  metrics,
  portfolio,
  watchlist,
}: {
  goals: FinancialGoal[];
  goalContributions: GoalContribution[];
  latestAlert: AppNotification | null;
  metrics: ReturnType<typeof calculateDashboardMetrics>;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
}): HomeInsight[] {
  const insights: HomeInsight[] = [];

  if (latestAlert) {
    insights.push({
      id: `notification:${latestAlert.id}`,
      eyebrow: "Notifikasi penting",
      title: latestAlert.title,
      message: latestAlert.message,
      href: "/notifications",
    });
  }

  if (portfolio.length > 0) {
    insights.push({
      id: "health",
      eyebrow: "Portfolio Health",
      title:
        metrics.healthScore >= 80
          ? "Portofolio terlihat cukup sehat."
          : metrics.healthScore >= 60
            ? "Portofolio masih perlu dipantau."
            : "Health Score perlu dicek.",
      message: `Skor saat ini ${metrics.healthScore}/100. ${metrics.riskSummary.detail}.`,
      href: "/portfolio#health-score",
    });
  }

  const dominantAllocation = metrics.allocation
    .slice()
    .sort((a, b) => b.percent - a.percent)[0];
  if (dominantAllocation && dominantAllocation.percent >= 55) {
    insights.push({
      id: "allocation",
      eyebrow: "Alokasi",
      title: `Portofolio dominan di ${investmentTypeLabel(dominantAllocation.type)}.`,
      message: `${dominantAllocation.percent}% nilai portofolio ada di kategori ini. Cek apakah masih sesuai profil risiko.`,
      href: "/portfolio",
    });
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const hasGoalThisMonth = goalContributions.some(
    (item) => item.contributionMonth === currentMonth,
  );
  if (goals.length > 0 && !hasGoalThisMonth) {
    insights.push({
      id: "goal-dca",
      eyebrow: "DCA / Goals",
      title: "DCA bulan ini belum dicatat.",
      message: "Catat kontribusi saat sudah dilakukan supaya progress tujuan tetap rapi.",
      href: "/goals",
    });
  }

  const waitingWatchlist = watchlist.filter((item) => item.status === "waiting");
  if (waitingWatchlist.length > 0) {
    insights.push({
      id: "watchlist",
      eyebrow: "Pantauan",
      title: `${waitingWatchlist.length} item sedang menunggu zona beli.`,
      message: "Review pantauan tanpa perlu mengambil keputusan terburu-buru.",
      href: "/watchlist",
    });
  }

  insights.push({
    id: "market-note",
    eyebrow: "Catatan Pasar",
    title: "Gunakan mode defensif saat data belum lengkap.",
    message: "ArahDana memakai data tersimpan dan sinyal internal, bukan berita live.",
    href: "/market-insight",
  });

  insights.push({
    id: "calm-tip",
    eyebrow: "Tip tenang",
    title: "Keputusan baik biasanya punya alasan tertulis.",
    message: "Catat alasan beli, tunggu, atau hindari agar review berikutnya lebih objektif.",
    href: "/journal",
  });

  return insights.slice(0, 6);
}

function readSessionGreetingTemplate() {
  if (typeof window === "undefined") return "Halo, {name}";
  const key = "arahdana.sessionGreeting";
  const existing = window.sessionStorage.getItem(key);
  if (existing && greetingTemplates.includes(existing)) return existing;
  const next =
    greetingTemplates[Math.floor(Math.random() * greetingTemplates.length)] ??
    "Halo, {name}";
  window.sessionStorage.setItem(key, next);
  return next;
}

const greetingTemplates = [
  "Halo, {name}",
  "Selamat datang, {name}",
  "Siap cek portofolio, {name}?",
  "Hai, {name}",
  "Lihat kondisi dana kamu hari ini",
];

function formatGreeting(template: string, name: string) {
  return template.replace("{name}", name || "Investor");
}

function getDisplayName(displayName?: string | null, email?: string | null) {
  const profileName = displayName?.trim();
  if (profileName) return profileName;

  const emailName = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (emailName) return titleCase(emailName);

  return "Investor";
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

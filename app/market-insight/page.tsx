"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/AppState";
import { useAuth } from "@/components/AuthProvider";
import {
  buildMarketInsight,
  MARKET_INSIGHT_SECTORS,
  type MarketInsight,
  type MarketInsightSector,
  type MarketInsightSectorInput,
} from "@/lib/market/marketInsight";
import { calculatePortfolioHealthScore } from "@/lib/portfolio/healthScore";
import { fetchPublicMarketData } from "@/lib/providers/marketClient";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  loadCloudPortfolio,
  loadCloudSettings,
} from "@/lib/supabase/sync";
import type {
  PricePoint,
  UserSettings,
} from "@/lib/types/investment";
import { cn, formatPercent, nonNegativeNumber } from "@/lib/utils/format";

type TickerFetchResult = {
  ticker: string;
  prices: PricePoint[];
  source: string;
};

type PageState = {
  insight: MarketInsight | null;
  fetchedAt: string | null;
  unavailableTickers: string[];
  sources: string[];
  portfolioHealthScore: number;
};

export default function MarketInsightPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [state, setState] = useState<PageState>({
    insight: null,
    fetchedAt: null,
    unavailableTickers: [],
    sources: [],
    portfolioHealthScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInsight = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const { portfolio, settings } = await loadUserContext(user);
      const portfolioHealth = calculatePortfolioHealthScore(portfolio, {
        aprMoneyMarketFund: settings.aprMoneyMarketFund,
        riskTolerance: settings.riskTolerance,
      });
      const { ihsg, sectors, unavailableTickers, sources } =
        await loadMarketData();
      const insight = buildMarketInsight({
        ihsgPrices: ihsg.prices,
        sectors,
        riskTolerance: settings.riskTolerance,
        portfolioHealthScore: portfolioHealth.totalScore,
      });

      setState({
        insight,
        fetchedAt: new Date().toISOString(),
        unavailableTickers,
        sources,
        portfolioHealthScore: portfolioHealth.totalScore,
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Market insight belum bisa dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthLoading) return;

    const timeoutId = window.setTimeout(() => {
      void loadInsight();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthLoading, loadInsight]);

  const statusText = useMemo(() => {
    if (!state.fetchedAt) return "Belum diperbarui";
    return `Diperbarui ${formatDateTime(state.fetchedAt)}`;
  }, [state.fetchedAt]);

  if (isLoading) {
    return (
      <LoadingState
        title="Memuat market insight"
        message="Mengambil data IHSG, sektor, dan profil risiko pengguna."
      />
    );
  }

  if (error || !state.insight) {
    return (
      <ErrorState
        title="Market insight belum tersedia"
        message={`${error || "Data pasar publik sedang tidak tersedia."} ArahDana tidak menampilkan prediksi palsu ketika data utama gagal dimuat.`}
        action={
          <button
            type="button"
            onClick={() => void loadInsight()}
            className="rounded-lg bg-rose-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Coba lagi
          </button>
        }
      />
    );
  }

  const { insight } = state;

  return (
    <div className="space-y-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.8rem] p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
              Smart Market Insight
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Kondisi pasar Indonesia hari ini
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              Ringkasan berbasis data historis dan aturan risiko ArahDana. Ini
              bukan prediksi harga, dan bukan rekomendasi personal final.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadInsight()}
            className="w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950"
          >
            Perbarui
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <OverviewMetric
            label="IHSG trend"
            value={insight.overview.ihsgTrend}
            helper={`${formatPercent(insight.overview.momentum)} momentum`}
          />
          <OverviewMetric
            label="Sentimen"
            value={insight.overview.marketSentiment}
            helper="Dari tren, volatilitas, dan breadth"
          />
          <OverviewMetric
            label="Volatilitas"
            value={insight.overview.volatilityCondition}
            helper={`${insight.overview.dataPoints} titik data IHSG`}
          />
          <OverviewMetric
            label="Market state"
            value={insight.overview.marketState}
            helper="Mode alokasi saat ini"
          />
          <div className="rounded-[1.25rem] bg-white/8 p-4 ring-1 ring-white/10 sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/52">
              Health score
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-4xl font-semibold tracking-tight">
                {insight.overview.marketHealthScore}
              </p>
              <span className="pb-1 text-sm font-semibold text-white/50">
                /100
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full",
                  scoreBarClass(insight.overview.marketHealthScore),
                )}
                style={{ width: `${insight.overview.marketHealthScore}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.78fr]">
        <div className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-950">
                Overview sektor
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Dibaca dari saham representatif yang tersedia di data pasar
                publik.
              </p>
            </div>
            <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
              {statusText}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {insight.sectors.map((sector) => (
              <SectorCard key={sector.key} sector={sector} />
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <SummaryCard title="Ringkasan kondisi" items={insight.summaries} />
          <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Profil dan portofolio
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniScore
                label="Risk profile"
                value={insight.riskProfileLabel}
                helper="Dari toleransi risiko"
              />
              <MiniScore
                label="Portfolio health"
                value={
                  state.portfolioHealthScore > 0
                    ? `${state.portfolioHealthScore}/100`
                    : "Belum ada"
                }
                helper="Dari portofolio tersimpan"
              />
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SummaryCard
          title="Opportunity"
          items={insight.opportunities}
          tone="good"
        />
        <SummaryCard title="Caution" items={insight.risks} tone="warn" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1fr]">
        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            Sektor untuk dipantau
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <WatchPill
              label="Watch"
              items={insight.sectorsToWatch}
              empty="Belum ada sektor tengah yang menonjol."
            />
            <WatchPill
              label="Mulai berisiko"
              items={insight.sectorsBecomingRisky}
              empty="Tidak ada sektor berisiko tinggi dari data yang tersedia."
              tone="risk"
            />
          </div>
        </section>

        <SummaryCard
          title="Smart recommendation"
          items={insight.recommendations}
          tone="strong"
        />
      </section>

      {state.unavailableTickers.length > 0 ? (
        <section className="rounded-[1.4rem] border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-sm">
          Sebagian data belum tersedia: {state.unavailableTickers.join(", ")}.
          Ringkasan tetap memakai ticker lain yang berhasil dimuat.
        </section>
      ) : null}

      <p className="px-1 text-xs leading-5 text-stone-500">
        Sumber: {state.sources.join(", ") || "Data pasar publik"}. ArahDana
        hanya merangkum kondisi saat ini dari data historis yang berhasil
        dimuat.
      </p>
    </div>
  );
}

function OverviewMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.25rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/52">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold leading-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium leading-5 text-white/50">
        {helper}
      </p>
    </div>
  );
}

function SectorCard({ sector }: { sector: MarketInsightSector }) {
  return (
    <article className="rounded-[1.25rem] bg-stone-100 p-4 ring-1 ring-stone-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-stone-950">
            {sector.label}
          </h3>
          <p className="mt-1 text-sm font-medium text-stone-600">
            {sector.trendDirection}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold",
            riskPillClass(sector.riskLevel),
          )}
        >
          {sector.riskLevel}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
          <span>Strength</span>
          <span>{sector.strengthScore}/100</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/75">
          <div
            className={cn("h-full rounded-full", scoreBarClass(sector.strengthScore))}
            style={{ width: `${sector.strengthScore}%` }}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-stone-600">{sector.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] font-semibold text-stone-500">
        <span className="rounded-full bg-white/70 px-2.5 py-1">
          Vol {sector.volatility.toFixed(1)}%
        </span>
        <span className="rounded-full bg-white/70 px-2.5 py-1">
          Mom {formatPercent(sector.momentum)}
        </span>
      </div>
    </article>
  );
}

function SummaryCard({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "good" | "warn" | "strong";
}) {
  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "rounded-[1.1rem] p-4 text-sm font-medium leading-6 ring-1",
              toneCardClass(tone),
            )}
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniScore({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.1rem] bg-stone-100 p-4 ring-1 ring-stone-200">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-stone-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{helper}</p>
    </div>
  );
}

function WatchPill({
  label,
  items,
  empty,
  tone = "watch",
}: {
  label: string;
  items: string[];
  empty: string;
  tone?: "watch" | "risk";
}) {
  return (
    <div className="rounded-[1.15rem] bg-stone-100 p-4 ring-1 ring-stone-200">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                tone === "risk"
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                  : "bg-white text-stone-700 ring-1 ring-stone-200",
              )}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm leading-6 text-stone-600">{empty}</span>
        )}
      </div>
    </div>
  );
}

async function loadUserContext(user: ReturnType<typeof useAuth>["user"]) {
  const localSettings = normalizeSettings(localArahDanaStorage.readSettings());

  if (!user) {
    return { portfolio: [], settings: localSettings };
  }

  try {
    const [cloudPortfolio, cloudSettings] = await Promise.all([
      loadCloudPortfolio(user),
      loadCloudSettings(user),
    ]);

    return {
      portfolio: cloudPortfolio,
      settings: normalizeSettings(cloudSettings ?? localSettings),
    };
  } catch {
    return { portfolio: [], settings: localSettings };
  }
}

async function loadMarketData() {
  const unavailableTickers: string[] = [];
  const sources = new Set<string>();
  const ihsg = await fetchTicker("IHSG", "^JKSE");
  sources.add(ihsg.source);

  const sectors = await Promise.all(
    MARKET_INSIGHT_SECTORS.map(async (sector) => {
      const results = await Promise.allSettled(
        sector.tickers.map((ticker) => fetchTicker(ticker, ticker)),
      );
      const instruments: MarketInsightSectorInput["instruments"] = [];

      results.forEach((result, index) => {
        const ticker = sector.tickers[index];
        if (result.status === "fulfilled") {
          instruments.push({
            ticker,
            prices: result.value.prices,
          });
          sources.add(result.value.source);
        } else {
          unavailableTickers.push(ticker);
        }
      });

      return {
        ...sector,
        instruments,
      };
    }),
  );

  return {
    ihsg,
    sectors,
    unavailableTickers,
    sources: Array.from(sources),
  };
}

async function fetchTicker(name: string, ticker: string): Promise<TickerFetchResult> {
  const data = await fetchPublicMarketData({
    ticker,
    range: "6mo",
    interval: "1d",
  });

  return {
    ticker: data.ticker || name,
    prices: data.prices,
    source: data.source,
  };
}

function normalizeSettings(settings: Partial<UserSettings> | null): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    capital: nonNegativeNumber(settings?.capital ?? DEFAULT_USER_SETTINGS.capital),
    riskTolerance: clampRiskTolerance(
      settings?.riskTolerance ?? DEFAULT_USER_SETTINGS.riskTolerance,
    ),
    aprMoneyMarketFund: nonNegativeNumber(
      settings?.aprMoneyMarketFund ??
        DEFAULT_USER_SETTINGS.aprMoneyMarketFund ??
        0.05,
    ),
    preferredInstruments:
      settings?.preferredInstruments ??
      DEFAULT_USER_SETTINGS.preferredInstruments,
    timeHorizon: settings?.timeHorizon ?? DEFAULT_USER_SETTINGS.timeHorizon,
    language: settings?.language ?? DEFAULT_USER_SETTINGS.language,
  };
}

function clampRiskTolerance(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_USER_SETTINGS.riskTolerance;
  return Math.max(5, Math.min(30, value));
}

function scoreBarClass(score: number) {
  if (score >= 70) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-300";
  return "bg-rose-400";
}

function riskPillClass(risk: MarketInsightSector["riskLevel"]) {
  if (risk === "Rendah") return "bg-emerald-50 text-emerald-700";
  if (risk === "Sedang") return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-700";
}

function toneCardClass(tone: "neutral" | "good" | "warn" | "strong") {
  if (tone === "good") {
    return "bg-emerald-50 text-emerald-900 ring-emerald-100";
  }
  if (tone === "warn") {
    return "bg-amber-50 text-amber-950 ring-amber-100";
  }
  if (tone === "strong") {
    return "bg-stone-950 text-white ring-stone-900";
  }
  return "bg-stone-100 text-stone-700 ring-stone-200";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "baru saja";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

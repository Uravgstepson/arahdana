"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AnalysisResult,
  InvestmentType,
  PricePoint,
} from "@/lib/types/investment";
import { fetchPublicMarketData } from "@/lib/providers/marketClient";
import { formatPercent } from "@/lib/utils/format";
import { InvestmentLogo } from "@/components/InvestmentLogo";
import { PrivateValue } from "@/components/PrivateValue";
import { analyzeInvestment } from "@/lib/analysis/analyzeInvestment";
import {
  createSyntheticPrices,
  marketCategories,
  marketUniverse,
  type MarketCategory,
  type MarketInstrument,
} from "@/lib/market/tickerUniverse";

type MarketPrice = {
  ticker: string;
  name: string;
  type: InvestmentType;
  category: MarketCategory;
  live: boolean;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  prices: PricePoint[];
  analysis?: AnalysisResult;
  isLoading: boolean;
  error?: string;
};

export function MarketPricesList({
  initialCategory = "idx_stock",
}: {
  initialCategory?: MarketCategory;
}) {
  const [activeCategory, setActiveCategory] =
    useState<MarketCategory>(initialCategory);
  const [range, setRange] = useState<"1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max">("1y");
  const [markets, setMarkets] = useState<Record<MarketCategory, MarketPrice[]>>(
    () => buildInitialMarkets(),
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

  const activeInstruments = useMemo(
    () => marketUniverse.filter((item) => item.category === activeCategory),
    [activeCategory],
  );
  const activeMarkets = markets[activeCategory] ?? [];
  const activeCategoryMeta = marketCategories.find(
    (category) => category.key === activeCategory,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCategory() {
      const results = await Promise.all(
        activeInstruments.map((instrument) => loadInstrument(instrument, range)),
      );

      if (!isMounted) return;
      setMarkets((current) => ({ ...current, [activeCategory]: results }));
      setLastUpdatedAt(new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }));
    }

    loadCategory();

    const intervalId =
      range === "1d" || range === "5d"
        ? window.setInterval(loadCategory, 60_000)
        : null;

    return () => {
      isMounted = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [activeCategory, activeInstruments, range]);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Pasar</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Ringkasan harga untuk bahan review, bukan ajakan trading cepat.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
              Rentang
              <select
                className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700"
                value={range}
                onChange={(e) => setRange(e.target.value as typeof range)}
              >
                <option value="1d">1 hari</option>
                <option value="5d">5 hari</option>
                <option value="1mo">1bln</option>
                <option value="3mo">3bln</option>
                <option value="6mo">6bln</option>
                <option value="1y">1th</option>
                <option value="5y">5th</option>
                <option value="max">All time</option>
              </select>
            </label>
            <p className="text-xs font-semibold text-stone-500">
              {lastUpdatedAt ? `Update terakhir ${lastUpdatedAt}` : "Memuat data"}
            </p>
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {marketCategories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={`inline-flex h-11 min-w-[4.35rem] shrink-0 items-center justify-center rounded-full px-3 text-center text-[0.72rem] font-semibold leading-none ring-1 sm:min-w-fit sm:px-4 sm:text-xs ${
                activeCategory === category.key
                  ? "bg-stone-950 text-white ring-stone-950"
                  : "bg-white/60 text-stone-600 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              <span className="sm:hidden">
                {shortMarketCategoryLabel(category.key)}
              </span>
              <span className="hidden sm:inline">{category.label}</span>
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-stone-500">
          {activeCategoryMeta?.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeMarkets.map((market) => (
          <MarketCard key={market.ticker} market={market} />
        ))}
      </div>
    </div>
  );
}

function shortMarketCategoryLabel(category: MarketCategory) {
  if (category === "idx_stock") return "IDX";
  if (category === "global_stock") return "Global";
  if (category === "index_etf") return "Indeks";
  if (category === "equity_fund") return "RD Saham";
  if (category === "money_market_fund") return "RDPU";
  if (category === "mixed_fund") return "Campur";
  if (category === "bond_fund") return "RDPT";
  if (category === "sbn_retail") return "SBN";
  return "FR";
}

function MarketCard({ market }: { market: MarketPrice }) {
  const verdictClass = verdictColor(market.analysis?.verdict);

  return (
    <article className="rounded-[1.35rem] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <InvestmentLogo
            name={market.name}
            ticker={market.ticker}
            className="h-11 w-11"
            fallbackInitials={initials(market.name)}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-stone-950">{market.name}</h3>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                {market.ticker}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-stone-500">
              {market.live ? "Data pasar publik" : "Model NAV internal"}
            </p>
          </div>
        </div>

        {market.analysis ? (
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${verdictClass}`}>
            {market.analysis.verdict}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        {market.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-stone-100" />
        ) : market.error ? (
          <div className="rounded-lg bg-rose-50 p-4 text-sm leading-6 text-rose-800">
            {market.error}
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-stone-950">
                  <PrivateValue>
                    {market.currentPrice.toLocaleString("id-ID", {
                      minimumFractionDigits: market.currentPrice < 100 ? 2 : 0,
                      maximumFractionDigits: market.currentPrice < 100 ? 2 : 0,
                    })}
                  </PrivateValue>
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    market.priceChange >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {market.priceChange >= 0 ? "+" : ""}
                  <PrivateValue>
                    {market.priceChange.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}
                  </PrivateValue>{" "}
                  ({formatPercent(market.priceChangePercent)})
                </p>
              </div>
              <div className="text-right text-xs font-semibold text-stone-500">
                {market.prices.length} titik
              </div>
            </div>

            <Sparkline prices={market.prices} tone={market.priceChange >= 0 ? "good" : "bad"} />

            {market.analysis ? (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-200 pt-4 text-xs">
                <Metric label="Tren" value={market.analysis.trend.label} />
                <Metric label="Risiko" value={`${market.analysis.riskScore}/100`} />
                <Metric label="Volatilitas" value={formatPercent(market.analysis.volatility)} />
                <Metric label="Momentum" value={formatPercent(market.analysis.momentum)} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

async function loadInstrument(
  instrument: MarketInstrument,
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max",
): Promise<MarketPrice> {
  try {
    const interval =
      range === "1d" || range === "5d"
        ? "15m"
        : range === "5y" || range === "max"
          ? "1wk"
          : "1d";
    const prices = instrument.live
      ? (
          await fetchPublicMarketData({
            ticker: instrument.ticker,
            range,
            interval,
            live: interval.endsWith("m"),
            source: "auto",
          })
        ).prices
      : createSyntheticPrices(instrument);
    const sortedPrices = [...prices].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const latestPrice = sortedPrices.at(-1)?.close ?? 0;
    const previousPrice = sortedPrices.at(-2)?.close ?? latestPrice;
    const priceChange = latestPrice - previousPrice;
    const priceChangePercent =
      previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;
    const analysis = analyzeInvestment({
      name: instrument.name,
      type: instrument.type,
      ticker: instrument.ticker,
      capital: 10_000_000,
      riskTolerance: 15,
      timeHorizon: "medium",
      prices: sortedPrices,
    });

    return {
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
      category: instrument.category,
      live: instrument.live,
      currentPrice: latestPrice,
      priceChange,
      priceChangePercent,
      prices: sortedPrices,
      analysis,
      isLoading: false,
    };
  } catch (error) {
    return {
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
      category: instrument.category,
      live: instrument.live,
      currentPrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
      prices: [],
      isLoading: false,
      error: error instanceof Error ? error.message : "Gagal memuat data",
    };
  }
}

function buildInitialMarkets() {
  return marketCategories.reduce(
    (acc, category) => {
      acc[category.key] = marketUniverse
        .filter((item) => item.category === category.key)
        .map((item) => ({
          ticker: item.ticker,
          name: item.name,
          type: item.type,
          category: item.category,
          live: item.live,
          currentPrice: 0,
          priceChange: 0,
          priceChangePercent: 0,
          prices: [],
          isLoading: true,
        }));
      return acc;
    },
    {} as Record<MarketCategory, MarketPrice[]>,
  );
}

function Sparkline({ prices, tone }: { prices: PricePoint[]; tone: "good" | "bad" }) {
  const points = buildSparklinePoints(prices);
  const stroke = tone === "good" ? "#047857" : "#be123c";

  return (
    <svg className="pointer-events-none mt-4 h-20 w-full overflow-visible" viewBox="0 0 240 80" role="img" aria-label="Grafik harga">
      <path d="M0 72 C60 68 120 74 240 68" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function buildSparklinePoints(prices: PricePoint[]) {
  const closes = prices.map((price) => price.close).filter((price) => price > 0);
  if (closes.length === 0) return "";

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const step = closes.length > 1 ? 240 / (closes.length - 1) : 0;

  return closes
    .map((close, index) => {
      const x = index * step;
      const y = 72 - ((close - min) / range) * 60;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-100 p-3">
      <p className="font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function verdictColor(verdict?: string) {
  if (verdict === "BUY") return "text-emerald-700 bg-emerald-50";
  if (verdict === "WAIT") return "text-amber-700 bg-amber-50";
  if (verdict === "AVOID") return "text-rose-700 bg-rose-50";
  return "text-stone-600 bg-stone-50";
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function initials(value: string) {
  const words = value
    .replace(/\.JK$/iu, "")
    .split(/\s+/u)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

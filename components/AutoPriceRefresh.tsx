"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { PortfolioItem } from "@/lib/types/investment";
import {
  fetchPublicMarketData,
  getLatestClose,
} from "@/lib/providers/marketClient";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { saveCloudPortfolio } from "@/lib/supabase/sync";
import { normalizeSafeTicker, validateTicker } from "@/lib/validation";

const autoRefreshIntervalMs = 15 * 60 * 1000;
const stalePriceMs = 20 * 60 * 1000;
const maxTickersPerPass = 12;
const lastRunKey = "arahdana.marketPrices.lastAutoRefreshAt";

export function AutoPriceRefresh() {
  const { user } = useAuth();
  const isRunningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshIfNeeded(force = false) {
      if (cancelled || isRunningRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      const now = Date.now();
      const lastRun = Number(window.localStorage.getItem(lastRunKey) ?? 0);
      if (!force && Number.isFinite(lastRun) && now - lastRun < autoRefreshIntervalMs) {
        return;
      }

      const portfolio = localArahDanaStorage.readPortfolio() ?? [];
      const candidates = portfolio
        .filter((item) => item.ticker?.trim())
        .filter((item) => priceLooksStale(item, now))
        .slice(0, maxTickersPerPass);

      if (candidates.length === 0) return;

      isRunningRef.current = true;
      window.dispatchEvent(
        new CustomEvent("arahdana:portfolio-prices-refreshing", {
          detail: { startedAt: new Date().toISOString(), count: candidates.length },
        }),
      );

      try {
        const tickerUpdates = new Map<string, { price: number; updatedAt: string }>();
        const uniqueTickers = Array.from(
          new Set(
            candidates
              .map((item) => normalizeTicker(item.ticker ?? ""))
              .filter(Boolean),
          ),
        );

        const results = await Promise.allSettled(
          uniqueTickers.map(async (ticker) => {
            const marketData = await fetchPublicMarketData({
              ticker,
              range: "1mo",
              interval: "1d",
              source: "auto",
            });
            const latestClose = getLatestClose(marketData.prices);
            if (!latestClose) throw new Error("Harga penutupan terbaru tidak tersedia.");
            return {
              ticker,
              price: latestClose,
              updatedAt: new Date().toISOString(),
            };
          }),
        );

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            tickerUpdates.set(result.value.ticker, {
              price: result.value.price,
              updatedAt: result.value.updatedAt,
            });
          }
        });

        if (tickerUpdates.size === 0) {
          window.localStorage.setItem(lastRunKey, String(now));
          window.dispatchEvent(
            new CustomEvent("arahdana:portfolio-prices-updated", {
              detail: {
                updatedAt: new Date().toISOString(),
                updatedCount: 0,
                failedCount: uniqueTickers.length,
              },
            }),
          );
          return;
        }

        const latestPortfolio = localArahDanaStorage.readPortfolio() ?? portfolio;
        const nextPortfolio = latestPortfolio.map((item) => {
          const update = tickerUpdates.get(normalizeTicker(item.ticker ?? ""));
          if (!update) return item;
          return {
            ...item,
            currentPrice: update.price,
            dataSource: "live_public_market_data" as const,
            lastPriceUpdatedAt: update.updatedAt,
          };
        });

        localArahDanaStorage.writePortfolio(nextPortfolio);
        window.localStorage.setItem(lastRunKey, String(now));

        if (user) {
          void saveCloudPortfolio(user, nextPortfolio).catch((error) => {
            console.error("Auto price refresh cloud sync failed:", error);
          });
        }

        window.dispatchEvent(
          new CustomEvent("arahdana:portfolio-prices-updated", {
            detail: {
              updatedAt: new Date().toISOString(),
              updatedCount: tickerUpdates.size,
              failedCount: uniqueTickers.length - tickerUpdates.size,
            },
          }),
        );
      } finally {
        isRunningRef.current = false;
      }
    }

    const startId = window.setTimeout(() => void refreshIfNeeded(true), 1600);
    const intervalId = window.setInterval(() => void refreshIfNeeded(), autoRefreshIntervalMs);

    function handleVisibility() {
      if (document.visibilityState === "visible") void refreshIfNeeded();
    }

    window.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.clearTimeout(startId);
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  return null;
}

function normalizeTicker(value: string) {
  const validation = validateTicker(value, { optional: true });
  if (validation) return "";
  return normalizeMarketTicker(normalizeSafeTicker(value));
}

function priceLooksStale(item: PortfolioItem, now: number) {
  if (!item.lastPriceUpdatedAt) return true;
  const updatedAt = new Date(item.lastPriceUpdatedAt).getTime();
  return Number.isNaN(updatedAt) || now - updatedAt > stalePriceMs;
}

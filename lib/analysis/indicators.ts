import type { PricePoint } from "@/lib/types/investment";
import {
  calculateMomentum,
  calculateReturns,
  calculateSMA,
  classifyTrend,
} from "@/lib/analysis/analyzeInvestment";

export function simpleMovingAverage(prices: PricePoint[], period: number) {
  return calculateSMA(prices, period);
}

export function priceReturns(prices: PricePoint[]) {
  return calculateReturns(prices);
}

export function trendDirection(prices: PricePoint[]) {
  const trend = classifyTrend(prices).direction;
  if (trend === "strong_uptrend" || trend === "uptrend") return "bullish" as const;
  if (trend === "strong_downtrend" || trend === "downtrend") return "bearish" as const;
  return "neutral" as const;
}

export function momentumPercent(prices: PricePoint[]) {
  return calculateMomentum(prices);
}

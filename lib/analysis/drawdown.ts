import type { PricePoint } from "@/lib/types/investment";
import { calculateMaxDrawdown } from "@/lib/analysis/analyzeInvestment";

export function maxDrawdownPercent(prices: PricePoint[]) {
  return calculateMaxDrawdown(prices);
}

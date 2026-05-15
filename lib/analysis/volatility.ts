import type { PricePoint } from "@/lib/types/investment";
import { calculateVolatility } from "@/lib/analysis/analyzeInvestment";

export function annualizedVolatilityPercent(prices: PricePoint[]) {
  return calculateVolatility(prices);
}

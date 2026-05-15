import type { InvestmentType, Verdict } from "@/lib/types/investment";

const baseByType: Record<InvestmentType, number> = {
  cash_savings: 50,
  money_market_fund: 45,
  bond: 30,
  bond_fund: 30,
  mixed_fund: 22,
  equity_fund: 16,
  stock: 14,
};

export function riskMode(riskTolerance: number) {
  const tolerance = Math.min(30, Math.max(5, riskTolerance));
  if (tolerance <= 10) return "defensive";
  if (tolerance <= 20) return "balanced";
  return "aggressive";
}

export function suggestedAllocation(params: {
  capital: number;
  type: InvestmentType;
  riskTolerance: number;
  confidence: number;
  finalRiskScore: number;
  verdict: Verdict;
}) {
  const capital = Math.max(0, params.capital);
  const mode = riskMode(params.riskTolerance);
  const modeMultiplier = mode === "defensive" ? 0.65 : mode === "balanced" ? 1 : 1.25;
  const confidenceMultiplier = Math.max(0.35, params.confidence / 100);
  const verdictMultiplier =
    params.verdict === "BUY" ? 1 : params.verdict === "WAIT" ? 0.45 : 0.15;
  const riskPenalty = Math.max(0.25, 1 - params.finalRiskScore / 140);

  const percentage = Math.min(
    60,
    Math.max(
      2,
      baseByType[params.type] * modeMultiplier * confidenceMultiplier * verdictMultiplier * riskPenalty,
    ),
  );

  return {
    percentage: Math.round(percentage),
    amount: Math.round((capital * percentage) / 100),
  };
}

import type { PortfolioItem, TimeHorizon } from "@/lib/types/investment";
import {
  computePortfolioCurrentPrice,
  computePortfolioMetrics,
} from "./valuation";

export type HealthScoreResult = {
  totalScore: number;
  grade: "Excellent" | "Healthy" | "Needs Attention" | "Risky" | "Critical";
  diversificationScore: number;
  allocationScore: number;
  riskScore: number;
  performanceScore: number;
  concentrationScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
  warnings: string[];
};

type PortfolioValuationSettings = {
  aprMoneyMarketFund?: number;
  now?: Date;
  riskTolerance?: number;
  timeHorizon?: TimeHorizon;
};

type InstrumentData = {
  item: PortfolioItem;
  allocation: number;
  currentValue: number;
};

function calculateDiversificationScore(portfolio: InstrumentData[]) {
  if (portfolio.length === 0) return 0;

  const instrumentCount = Math.min(portfolio.length, 10);
  const instrumentPoints = (instrumentCount / 10) * 40;
  const hhi = portfolio.reduce((sum, item) => sum + item.allocation ** 2, 0);
  const concentrationPenalty = Math.min(25, hhi * 100);
  const typeSet = new Set(portfolio.map((item) => item.item.type));
  const typePoints = Math.min(20, typeSet.size * 3);

  return clampScore(instrumentPoints + typePoints - concentrationPenalty);
}

function calculateAllocationScore(
  portfolio: InstrumentData[],
  riskTolerance = 15,
) {
  if (portfolio.length === 0) return 0;

  const stableTypes = new Set(["cash_savings", "money_market_fund"]);
  const bondTypes = new Set(["bond", "bond_fund"]);
  const equityTypes = new Set(["equity_fund", "stock", "mixed_fund"]);

  let stableAllocation = 0;
  let bondAllocation = 0;
  let equityAllocation = 0;

  portfolio.forEach((item) => {
    const allocation = item.allocation * 100;
    if (stableTypes.has(item.item.type)) stableAllocation += allocation;
    if (bondTypes.has(item.item.type)) bondAllocation += allocation;
    if (equityTypes.has(item.item.type)) equityAllocation += allocation;
  });

  let stableTarget = 35;
  let bondTarget = 30;
  let equityTarget = 35;

  if (riskTolerance <= 10) {
    stableTarget = 50;
    bondTarget = 35;
    equityTarget = 15;
  } else if (riskTolerance > 20) {
    stableTarget = 20;
    bondTarget = 20;
    equityTarget = 60;
  }

  const averageDeviation =
    (Math.abs(stableAllocation - stableTarget) +
      Math.abs(bondAllocation - bondTarget) +
      Math.abs(equityAllocation - equityTarget)) /
    3;

  return clampScore(100 - averageDeviation * 2);
}

function calculateRiskScore(portfolio: InstrumentData[], riskTolerance = 15) {
  if (portfolio.length === 0) return 50;

  const counts = portfolio.reduce(
    (acc, item) => {
      acc[item.item.riskCategory] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 },
  );

  let score = 70;
  if (riskTolerance <= 10) {
    const lowRiskPercent = (counts.low / portfolio.length) * 100;
    const highRiskPercent = (counts.high / portfolio.length) * 100;
    score = 55 + lowRiskPercent * 0.35 - highRiskPercent * 0.55;
  } else if (riskTolerance <= 20) {
    score = 82 - Math.abs(counts.low - counts.medium) * 5 - counts.high * 4;
  } else {
    const highRiskPercent = (counts.high / portfolio.length) * 100;
    score = 60 + highRiskPercent * 0.25;
  }

  return clampScore(score);
}

function calculatePerformanceScore(
  portfolio: PortfolioItem[],
  settings: PortfolioValuationSettings,
) {
  if (portfolio.length === 0) return 50;
  const profitPercent = computePortfolioMetrics(portfolio, settings).profitPercent;

  if (profitPercent > 20) return 85;
  if (profitPercent > 10) return 75;
  if (profitPercent > 0) return 65;
  if (profitPercent > -10) return 50;
  if (profitPercent > -25) return 35;
  return 20;
}

function calculateConcentrationScore(portfolio: InstrumentData[]) {
  if (portfolio.length === 0) return 50;

  const sorted = [...portfolio].sort((a, b) => b.allocation - a.allocation);
  const largestPosition = sorted[0]?.allocation ?? 0;
  const top3Total = sorted
    .slice(0, 3)
    .reduce((sum, item) => sum + item.allocation, 0);

  let score = 86;
  if (largestPosition > 0.5) score -= 45;
  else if (largestPosition > 0.35) score -= 28;
  else if (largestPosition > 0.25) score -= 16;
  else if (largestPosition > 0.15) score -= 6;

  if (top3Total > 0.8) score -= 12;
  else if (top3Total > 0.65) score -= 6;

  return clampScore(score);
}

function generateWarnings(
  portfolio: InstrumentData[],
  metrics: ReturnType<typeof computePortfolioMetrics>,
  settings: PortfolioValuationSettings,
) {
  const warnings: string[] = [];
  if (portfolio.length === 0) {
    warnings.push("Portfolio is empty. Start adding investments.");
    return warnings;
  }

  const largestPosition = Math.max(...portfolio.map((item) => item.allocation));
  if (largestPosition > 0.5) {
    warnings.push(
      `One asset represents ${Math.round(largestPosition * 100)}% of the portfolio.`,
    );
  }

  if (portfolio.length < 3) {
    warnings.push("Portfolio has limited diversification with fewer than 3 instruments.");
  }

  const equityTypes = new Set(["equity_fund", "stock", "mixed_fund"]);
  const stableTypes = new Set(["cash_savings", "money_market_fund"]);
  const equityAllocation = portfolio
    .filter((item) => equityTypes.has(item.item.type))
    .reduce((sum, item) => sum + item.allocation, 0);
  const stableAllocation = portfolio
    .filter((item) => stableTypes.has(item.item.type))
    .reduce((sum, item) => sum + item.allocation, 0);

  if ((settings.riskTolerance ?? 15) <= 10 && equityAllocation > 0.4) {
    warnings.push("Equity exposure is high for a conservative risk profile.");
  }
  if (metrics.profitPercent < -25) {
    warnings.push("Portfolio has declined more than 25%. Review thesis and risk exposure calmly.");
  } else if (metrics.profitPercent < -10) {
    warnings.push("Portfolio is in a 10-25% drawdown. Review position sizing and assumptions.");
  }
  if (stableAllocation === 0) {
    warnings.push("No stable asset allocation is recorded for cash or money market funds.");
  }

  return warnings;
}

function generateStrengths(
  diversificationScore: number,
  allocationScore: number,
  riskScore: number,
  performanceScore: number,
  concentrationScore: number,
  portfolio: InstrumentData[],
) {
  const strengths: string[] = [];
  if (diversificationScore >= 70) strengths.push("Good diversification across instruments.");
  if (allocationScore >= 70) strengths.push("Allocation is aligned with your risk profile.");
  if (riskScore >= 70) strengths.push("Risk exposure is within a reasonable range.");
  if (performanceScore >= 75) strengths.push("Performance is currently constructive.");
  else if (performanceScore >= 65) strengths.push("Portfolio return is currently positive.");
  if (concentrationScore >= 75) strengths.push("No excessive single-position concentration.");
  if (portfolio.length >= 5) strengths.push("Holding count supports regular diversification review.");

  return strengths.length > 0 ? strengths : ["Portfolio is established and ready to review."];
}

function generateRecommendedActions(
  diversificationScore: number,
  allocationScore: number,
  riskScore: number,
  concentrationScore: number,
  portfolio: InstrumentData[],
) {
  const actions: string[] = [];

  if (diversificationScore < 50) {
    actions.push("Add more instruments before increasing position sizes.");
  } else if (diversificationScore < 70) {
    actions.push("Consider expanding toward 5-7 holdings over time.");
  }

  if (allocationScore < 50) {
    actions.push("Rebalance allocation toward your risk tolerance.");
  } else if (allocationScore < 70) {
    actions.push("Fine-tune stable, bond, and equity exposure.");
  }

  if (riskScore < 50) {
    actions.push("Review risk exposure before adding new high-risk assets.");
  }
  if (concentrationScore < 60) {
    actions.push("Reduce reliance on the largest position gradually.");
  }

  const stableTypes = new Set(["cash_savings", "money_market_fund"]);
  const stableAllocation = portfolio
    .filter((item) => stableTypes.has(item.item.type))
    .reduce((sum, item) => sum + item.allocation, 0);

  if (stableAllocation < 0.1) {
    actions.push("Keep a small stable allocation for liquidity and flexibility.");
  }

  return actions.slice(0, 2);
}

export function calculatePortfolioHealthScore(
  portfolio: PortfolioItem[],
  settings: PortfolioValuationSettings = {},
): HealthScoreResult {
  if (portfolio.length === 0) {
    return {
      totalScore: 0,
      grade: "Critical",
      diversificationScore: 0,
      allocationScore: 0,
      riskScore: 50,
      performanceScore: 0,
      concentrationScore: 50,
      summary: "Your portfolio is empty. Add a first holding to start the review.",
      strengths: [],
      weaknesses: ["Portfolio has no holdings."],
      recommendedActions: ["Add your first investment to get started."],
      warnings: ["Portfolio is empty."],
    };
  }

  const instrumentData: InstrumentData[] = [];
  let totalValue = 0;

  portfolio.forEach((item) => {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, settings);
    const currentValue = currentPriceUsed * item.quantity;
    totalValue += currentValue;
    instrumentData.push({ item, allocation: 0, currentValue });
  });

  instrumentData.forEach((item) => {
    item.allocation = totalValue > 0 ? item.currentValue / totalValue : 0;
  });

  const diversificationScore = calculateDiversificationScore(instrumentData);
  const allocationScore = calculateAllocationScore(instrumentData, settings.riskTolerance ?? 15);
  const riskScore = calculateRiskScore(instrumentData, settings.riskTolerance ?? 15);
  const performanceScore = calculatePerformanceScore(portfolio, settings);
  const concentrationScore = calculateConcentrationScore(instrumentData);

  const totalScore = Math.round(
    diversificationScore * 0.2 +
      allocationScore * 0.25 +
      riskScore * 0.2 +
      performanceScore * 0.15 +
      concentrationScore * 0.2,
  );
  const grade = gradeFromScore(totalScore);
  const metrics = computePortfolioMetrics(portfolio, settings);
  const warnings = generateWarnings(instrumentData, metrics, settings);
  const strengths = generateStrengths(
    diversificationScore,
    allocationScore,
    riskScore,
    performanceScore,
    concentrationScore,
    instrumentData,
  );
  const recommendedActions = generateRecommendedActions(
    diversificationScore,
    allocationScore,
    riskScore,
    concentrationScore,
    instrumentData,
  );

  return {
    totalScore,
    grade,
    diversificationScore,
    allocationScore,
    riskScore,
    performanceScore,
    concentrationScore,
    summary: buildSummary(grade, metrics.profitPercent),
    strengths,
    weaknesses: warnings
      .filter((warning) => !warning.startsWith("No stable asset allocation"))
      .slice(0, 4),
    recommendedActions,
    warnings,
  };
}

function gradeFromScore(score: number): HealthScoreResult["grade"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 55) return "Needs Attention";
  if (score >= 40) return "Risky";
  return "Critical";
}

function buildSummary(grade: HealthScoreResult["grade"], profitPercent: number) {
  const opening: Record<HealthScoreResult["grade"], string> = {
    Excellent: "Portfolio structure looks strong and balanced.",
    Healthy: "Portfolio is healthy with a few areas to keep monitoring.",
    "Needs Attention": "Portfolio is usable, but a few risks deserve review.",
    Risky: "Portfolio risk is elevated and should be reviewed calmly.",
    Critical: "Portfolio needs a focused review before adding more risk.",
  };
  const returnText =
    profitPercent > 0
      ? `Current return is ${formatPercent(profitPercent)}.`
      : profitPercent < 0
        ? `Current drawdown is ${formatPercent(Math.abs(profitPercent))}.`
        : "Current return is flat.";

  return `${opening[grade]} ${returnText}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

import type {
  PortfolioItem,
  RiskCategory,
  TimeHorizon,
} from "@/lib/types/investment";
import {
  computePortfolioCurrentPrice,
  computePortfolioMetrics,
} from "./valuation";
import {
  calculateVolatility,
  calculateMaxDrawdown,
} from "@/lib/analysis/analyzeInvestment";

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

interface InstrumentData {
  item: PortfolioItem;
  allocation: number;
  currentValue: number;
}

/**
 * Calculate diversification score based on:
 * - Number of instruments (max points at 10+)
 * - Herfindahl index (concentration measure)
 * - Asset type diversity
 */
function calculateDiversificationScore(portfolio: InstrumentData[]): number {
  if (portfolio.length === 0) return 0;

  // Number of instruments: max 40 points at 10+ instruments
  const instrumentCount = Math.min(portfolio.length, 10);
  const instrumentPoints = (instrumentCount / 10) * 40;

  // Herfindahl-Hirschman Index (HHI) for concentration
  // Perfect diversity = 0 points deducted, concentration = points deducted
  let hhi = 0;
  for (const item of portfolio) {
    hhi += Math.pow(item.allocation, 2);
  }
  const concentrationPenalty = Math.min(25, hhi * 100);

  // Asset type diversity: check how many types are represented
  const typeSet = new Set(portfolio.map((item) => item.item.type));
  const typePoints = Math.min(20, typeSet.size * 3);

  const score = instrumentPoints + typePoints - concentrationPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate allocation balance score based on:
 * - Cash/stable allocation (15%)
 * - Bond allocation (20%)
 * - Equity allocation (30%)
 * - Overall balance (35%)
 */
function calculateAllocationScore(
  portfolio: InstrumentData[],
  riskTolerance: number = 5,
): number {
  if (portfolio.length === 0) return 0;

  // Define asset categories
  const stableTypes = ["cash_savings", "money_market_fund"];
  const bondTypes = ["bond", "bond_fund"];
  const equityTypes = ["equity_fund", "stock", "mixed_fund"];

  let stableAllocation = 0;
  let bondAllocation = 0;
  let equityAllocation = 0;

  for (const item of portfolio) {
    if (stableTypes.includes(item.item.type)) {
      stableAllocation += item.allocation;
    } else if (bondTypes.includes(item.item.type)) {
      bondAllocation += item.allocation;
    } else if (equityTypes.includes(item.item.type)) {
      equityAllocation += item.allocation;
    }
  }

  // Risk tolerance-based targets
  let stableTarget = 40; // Default target
  let bondTarget = 30;
  let equityTarget = 30;

  if (riskTolerance <= 10) {
    // Defensive: more stable
    stableTarget = 50;
    bondTarget = 35;
    equityTarget = 15;
  } else if (riskTolerance <= 20) {
    // Balanced
    stableTarget = 35;
    bondTarget = 30;
    equityTarget = 35;
  } else {
    // Aggressive
    stableTarget = 20;
    bondTarget = 20;
    equityTarget = 60;
  }

  // Calculate deviation from targets
  const stableDeviation = Math.abs(stableAllocation - stableTarget);
  const bondDeviation = Math.abs(bondAllocation - bondTarget);
  const equityDeviation = Math.abs(equityAllocation - equityTarget);

  const avgDeviation = (stableDeviation + bondDeviation + equityDeviation) / 3;
  const deviationScore = Math.max(0, 100 - avgDeviation * 2);

  return Math.round(deviationScore);
}

/**
 * Calculate risk exposure score based on:
 * - Overall portfolio volatility
 * - Maximum drawdown
 * - Risk category distribution
 */
function calculateRiskScore(
  portfolio: InstrumentData[],
  riskTolerance: number = 5,
): number {
  if (portfolio.length === 0) return 50;

  // Count risk categories
  let lowRiskCount = 0;
  let mediumRiskCount = 0;
  let highRiskCount = 0;

  for (const item of portfolio) {
    if (item.item.riskCategory === "low") lowRiskCount++;
    else if (item.item.riskCategory === "medium") mediumRiskCount++;
    else if (item.item.riskCategory === "high") highRiskCount++;
  }

  // Calculate risk distribution score
  let riskScore = 50;

  if (riskTolerance <= 10) {
    // Defensive: should have mostly low risk
    const lowRiskPct = (lowRiskCount / portfolio.length) * 100;
    const highRiskPct = (highRiskCount / portfolio.length) * 100;
    riskScore = 50 + (lowRiskPct * 0.3 - highRiskPct * 0.5);
  } else if (riskTolerance <= 20) {
    // Balanced: balanced distribution
    const balanceScore = 100 - Math.abs(lowRiskCount - mediumRiskCount) * 5;
    riskScore = Math.max(30, balanceScore);
  } else {
    // Aggressive: can tolerate high risk
    const highRiskPct = (highRiskCount / portfolio.length) * 100;
    riskScore = 50 + highRiskPct * 0.3;
  }

  return Math.round(Math.max(0, Math.min(100, riskScore)));
}

/**
 * Calculate performance score based on:
 * - Current profit/loss vs invested
 * - Consistency (if multiple items exist)
 * - Maximum drawdown experience
 */
function calculatePerformanceScore(
  portfolio: PortfolioItem[],
  settings: PortfolioValuationSettings = {},
): number {
  if (portfolio.length === 0) return 50;

  const metrics = computePortfolioMetrics(portfolio, settings);
  const profitPercent = metrics.profitPercent;

  // Base score on performance
  let performanceScore = 50;

  if (profitPercent > 20) {
    performanceScore = 85;
  } else if (profitPercent > 10) {
    performanceScore = 75;
  } else if (profitPercent > 0) {
    performanceScore = 65;
  } else if (profitPercent > -10) {
    performanceScore = 50;
  } else if (profitPercent > -25) {
    performanceScore = 35;
  } else {
    performanceScore = 20;
  }

  return Math.round(performanceScore);
}

/**
 * Calculate concentration risk score based on:
 * - Largest single position
 * - Top 3 positions
 * - Overall distribution
 */
function calculateConcentrationScore(portfolio: InstrumentData[]): number {
  if (portfolio.length === 0) return 50;

  const sortedByAllocation = [...portfolio].sort(
    (a, b) => b.allocation - a.allocation,
  );

  const largestPosition = sortedByAllocation[0]?.allocation ?? 0;
  const top3Total = sortedByAllocation
    .slice(0, 3)
    .reduce((sum, item) => sum + item.allocation, 0);

  let concentrationScore = 80;

  // Penalize large single positions
  if (largestPosition > 0.5) {
    concentrationScore -= 40; // Critical
  } else if (largestPosition > 0.35) {
    concentrationScore -= 25;
  } else if (largestPosition > 0.25) {
    concentrationScore -= 15;
  } else if (largestPosition > 0.15) {
    concentrationScore -= 5;
  }

  // Penalize high top-3 concentration
  if (top3Total > 0.8) {
    concentrationScore -= 10;
  } else if (top3Total > 0.65) {
    concentrationScore -= 5;
  }

  return Math.round(Math.max(0, Math.min(100, concentrationScore)));
}

/**
 * Generate warnings based on portfolio health
 */
function generateWarnings(
  portfolio: InstrumentData[],
  portfolioItems: PortfolioItem[],
  metrics: ReturnType<typeof computePortfolioMetrics>,
  settings: PortfolioValuationSettings,
): string[] {
  const warnings: string[] = [];

  if (portfolio.length === 0) {
    warnings.push("Portfolio is empty. Start adding investments.");
    return warnings;
  }

  // Check for single position > 50%
  const largestPos = Math.max(...portfolio.map((item) => item.allocation));
  if (largestPos > 0.5) {
    warnings.push(
      `⚠️ One asset represents ${Math.round(largestPos * 100)}% of portfolio (concentration risk)`,
    );
  }

  // Check for too few instruments
  if (portfolio.length < 3) {
    warnings.push("⚠️ Portfolio lacks diversification (<3 instruments)");
  }

  // Check equity exposure vs risk tolerance
  const equityTypes = ["equity_fund", "stock", "mixed_fund"];
  const equityAllocation = portfolio
    .filter((item) => equityTypes.includes(item.item.type))
    .reduce((sum, item) => sum + item.allocation, 0);

  if ((settings.riskTolerance ?? 15) <= 10 && equityAllocation > 0.4) {
    warnings.push(
      "⚠️ Equity exposure too high for your conservative risk tolerance",
    );
  }

  // Check for significant losses
  if (metrics.profitPercent < -25) {
    warnings.push("⚠️ Portfolio has declined significantly (>-25%)");
  } else if (metrics.profitPercent < -10) {
    warnings.push("⚠️ Portfolio in drawdown (10-25%)");
  }

  // Check stable asset allocation
  const stableTypes = ["cash_savings", "money_market_fund"];
  const stableAllocation = portfolio
    .filter((item) => stableTypes.includes(item.item.type))
    .reduce((sum, item) => sum + item.allocation, 0);

  if (stableAllocation === 0) {
    warnings.push("ℹ️ No stable asset allocation (cash/money market)");
  }

  return warnings;
}

/**
 * Generate strengths based on portfolio health
 */
function generateStrengths(
  diversificationScore: number,
  allocationScore: number,
  riskScore: number,
  performanceScore: number,
  concentrationScore: number,
  portfolio: InstrumentData[],
): string[] {
  const strengths: string[] = [];

  if (diversificationScore >= 70) {
    strengths.push("Good diversification across instruments");
  }

  if (allocationScore >= 70) {
    strengths.push("Well-balanced asset allocation");
  }

  if (riskScore >= 70) {
    strengths.push("Risk exposure aligned with tolerance");
  }

  if (performanceScore >= 75) {
    strengths.push("Strong performance");
  } else if (performanceScore >= 65) {
    strengths.push("Positive returns on investment");
  }

  if (concentrationScore >= 75) {
    strengths.push("No excessive concentration in single assets");
  }

  if (portfolio.length >= 5) {
    strengths.push("Sufficient number of holdings");
  }

  return strengths.length > 0 ? strengths : ["Portfolio is established"];
}

/**
 * Generate recommended actions based on portfolio health
 */
function generateRecommendedActions(
  diversificationScore: number,
  allocationScore: number,
  riskScore: number,
  concentrationScore: number,
  portfolio: InstrumentData[],
  warnings: string[],
): string[] {
  const actions: string[] = [];

  // Diversification recommendations
  if (diversificationScore < 50) {
    actions.push("Add more investment instruments to improve diversification");
  } else if (diversificationScore < 70) {
    actions.push("Consider expanding to at least 5-7 different holdings");
  }

  // Allocation recommendations
  if (allocationScore < 50) {
    actions.push(
      "Rebalance your portfolio to better match your risk tolerance",
    );
  } else if (allocationScore < 70) {
    actions.push("Fine-tune allocation across asset categories");
  }

  // Risk recommendations
  if (riskScore < 50) {
    actions.push("Review risk exposure against your risk tolerance profile");
  }

  // Concentration recommendations
  if (concentrationScore < 60) {
    actions.push("Reduce concentration by distributing capital more evenly");
  }

  // Cash position
  const stableTypes = ["cash_savings", "money_market_fund"];
  const stableAllocation = portfolio
    .filter((item) => stableTypes.includes(item.item.type))
    .reduce((sum, item) => sum + item.allocation, 0);

  if (stableAllocation < 0.1) {
    actions.push("Maintain 10-20% in stable/cash allocation for liquidity");
  }

  // Return top 2 recommendations
  return actions.slice(0, 2);
}

/**
 * Calculate overall portfolio health score
 */
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
      summary:
        "Your portfolio is empty. Start by adding your first investment.",
      strengths: [],
      weaknesses: ["Portfolio has no holdings"],
      recommendedActions: ["Add your first investment to get started"],
      warnings: ["Portfolio is empty"],
    };
  }

  // Prepare instrument data with allocations and current values
  const instrumentData: InstrumentData[] = [];
  let totalValue = 0;

  for (const item of portfolio) {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, settings);
    const currentValue = currentPriceUsed * item.quantity;
    totalValue += currentValue;
    instrumentData.push({
      item,
      allocation: 0, // Will be calculated after we know total value
      currentValue,
    });
  }

  // Calculate allocations
  for (const data of instrumentData) {
    data.allocation = totalValue > 0 ? data.currentValue / totalValue : 0;
  }

  // Calculate individual scores
  const diversificationScore = calculateDiversificationScore(instrumentData);
  const allocationScore = calculateAllocationScore(
    instrumentData,
    settings.riskTolerance ?? 15,
  );
  const riskScore = calculateRiskScore(
    instrumentData,
    settings.riskTolerance ?? 15,
  );
  const performanceScore = calculatePerformanceScore(portfolio, settings);
  const concentrationScore = calculateConcentrationScore(instrumentData);

  // Calculate weighted total score
  const totalScore = Math.round(
    diversificationScore * 0.2 +
      allocationScore * 0.25 +
      riskScore * 0.2 +
      performanceScore * 0.15 +
      concentrationScore * 0.2,
  );

  // Determine grade
  let grade: HealthScoreResult["grade"];
  if (totalScore >= 85) {
    grade = "Excellent";
  } else if (totalScore >= 70) {
    grade = "Healthy";
  } else if (totalScore >= 55) {
    grade = "Needs Attention";
  } else if (totalScore >= 40) {
    grade = "Risky";
  } else {
    grade = "Critical";
  }

  // Compute portfolio metrics
  const metrics = computePortfolioMetrics(portfolio, settings);

  // Generate insights
  const warnings = generateWarnings(
    instrumentData,
    portfolio,
    metrics,
    settings,
  );
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
    warnings,
  );

  // Generate summary
  const summaryParts: string[] = [];
  if (grade === "Excellent") {
    summaryParts.push(
      "Your portfolio is in excellent health with strong diversification and balanced allocation.",
    );
  } else if (grade === "Healthy") {
    summaryParts.push("Your portfolio is healthy and well-structured.");
  } else if (grade === "Needs Attention") {
    summaryParts.push("Your portfolio needs attention in some areas.");
  } else if (grade === "Risky") {
    summaryParts.push("Your portfolio carries elevated risk levels.");
  } else {
    summaryParts.push(
      "Your portfolio requires immediate attention and rebalancing.",
    );
  }

  if (metrics.profitPercent > 0) {
    summaryParts.push(
      `Currently showing ${formatPercent(metrics.profitPercent)} returns.`,
    );
  } else if (metrics.profitPercent < 0) {
    summaryParts.push(
      `Currently in drawdown of ${formatPercent(Math.abs(metrics.profitPercent))}.`,
    );
  }

  const summary = summaryParts.join(" ");

  return {
    totalScore,
    grade,
    diversificationScore,
    allocationScore,
    riskScore,
    performanceScore,
    concentrationScore,
    summary,
    strengths,
    weaknesses: warnings
      .filter((w) => w.startsWith("⚠️"))
      .map((w) => w.replace("⚠️ ", "")),
    recommendedActions,
    warnings,
  };
}

/**
 * Helper function to format percent for summary
 */
function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

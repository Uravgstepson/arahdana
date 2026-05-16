import type {
  FinancialGoal,
  GoalContribution,
  InvestmentType,
  PortfolioItem,
} from "@/lib/types/investment";
import { riskMode } from "@/lib/analysis/allocation";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";

export type GoalAllocation = {
  type: InvestmentType;
  label: string;
  percent: number;
};

export type GoalProjectionPoint = {
  month: string;
  low: number;
  base: number;
  high: number;
};

export type GoalPlan = {
  monthsRemaining: number;
  currentProgress: number;
  progressPercent: number;
  requiredMonthlyInvestment: number;
  lowFutureValue: number;
  baseFutureValue: number;
  highFutureValue: number;
  projectedShortfall: number;
  estimatedCompletion: string;
  contributionStreak: number;
  saferAllocation: GoalAllocation[];
  recommendedAllocation: GoalAllocation[];
  aggressiveAllocation: GoalAllocation[];
  projection: GoalProjectionPoint[];
  warnings: string[];
  explanation: string;
};

const annualReturnRanges: Record<InvestmentType, { low: number; base: number; high: number }> = {
  cash_savings: { low: 0, base: 0.01, high: 0.02 },
  money_market_fund: { low: 0.03, base: 0.04, high: 0.05 },
  bond: { low: 0.04, base: 0.055, high: 0.07 },
  bond_fund: { low: 0.04, base: 0.055, high: 0.07 },
  mixed_fund: { low: 0.05, base: 0.07, high: 0.09 },
  equity_fund: { low: 0.07, base: 0.095, high: 0.12 },
  stock: { low: 0.06, base: 0.1, high: 0.14 },
};

const typeLabels: Record<InvestmentType, string> = {
  cash_savings: "Kas / tabungan",
  money_market_fund: "Reksadana pasar uang",
  bond: "Obligasi",
  bond_fund: "Reksadana pendapatan tetap",
  mixed_fund: "Reksadana campuran",
  equity_fund: "Reksadana saham",
  stock: "Saham",
};

export function planFinancialGoal(params: {
  goal: FinancialGoal;
  portfolio: PortfolioItem[];
  contributions: GoalContribution[];
  aprMoneyMarketFund?: number;
  today?: Date;
}): GoalPlan {
  const today = params.today ?? new Date();
  const monthsRemaining = monthsUntil(params.goal.targetDate, today);
  const currentProgress = getLinkedPortfolioValue(
    params.goal,
    params.portfolio,
    params.aprMoneyMarketFund,
  );
  const progressPercent =
    params.goal.targetAmount > 0
      ? Math.min(100, Math.round((currentProgress / params.goal.targetAmount) * 100))
      : 0;
  const recommendedAllocation = recommendAllocation(params.goal, monthsRemaining, "base");
  const saferAllocation = recommendAllocation(params.goal, monthsRemaining, "safer");
  const aggressiveAllocation = recommendAllocation(params.goal, monthsRemaining, "aggressive");
  const rates = blendedRates(recommendedAllocation);
  const projection = buildProjection({
    startAmount: currentProgress,
    monthlyContribution: params.goal.monthlyContribution,
    months: monthsRemaining,
    rates,
    today,
  });
  const finalPoint = projection.at(-1) ?? {
    month: formatMonth(today),
    low: currentProgress,
    base: currentProgress,
    high: currentProgress,
  };
  const requiredMonthlyInvestment = requiredMonthly({
    targetAmount: params.goal.targetAmount,
    currentProgress,
    months: monthsRemaining,
    annualRate: rates.base,
  });
  const estimatedCompletion = estimateCompletionMonth({
    targetAmount: params.goal.targetAmount,
    startAmount: currentProgress,
    monthlyContribution: params.goal.monthlyContribution,
    annualRate: rates.base,
    today,
    maxMonths: Math.max(monthsRemaining, 1),
  });
  const contributionStreak = calculateContributionStreak(
    params.goal.id,
    params.contributions,
    today,
  );
  const projectedShortfall = Math.max(0, params.goal.targetAmount - finalPoint.base);
  const warnings = buildWarnings({
    goal: params.goal,
    monthsRemaining,
    requiredMonthlyInvestment,
    baseFutureValue: finalPoint.base,
    allocation: recommendedAllocation,
  });

  return {
    monthsRemaining,
    currentProgress,
    progressPercent,
    requiredMonthlyInvestment,
    lowFutureValue: finalPoint.low,
    baseFutureValue: finalPoint.base,
    highFutureValue: finalPoint.high,
    projectedShortfall,
    estimatedCompletion,
    contributionStreak,
    saferAllocation,
    recommendedAllocation,
    aggressiveAllocation,
    projection,
    warnings,
    explanation: explainPlan({
      goal: params.goal,
      monthsRemaining,
      allocation: recommendedAllocation,
      warnings,
      requiredMonthlyInvestment,
    }),
  };
}

export function goalRiskProfile(riskTolerance: number): FinancialGoal["riskProfile"] {
  return riskMode(riskTolerance);
}

export function goalCategoryLabel(category: FinancialGoal["category"]) {
  const labels: Record<FinancialGoal["category"], string> = {
    emergency_fund: "Dana darurat",
    education: "Pendidikan",
    motorcycle: "Motor",
    car: "Mobil",
    house: "Rumah",
    retirement: "Pensiun",
    custom: "Tujuan custom",
  };
  return labels[category];
}

export function investmentLabel(type: InvestmentType) {
  return typeLabels[type];
}

function monthsUntil(targetDate: string, today: Date) {
  const target = new Date(`${targetDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 1;
  const years = target.getFullYear() - today.getFullYear();
  const months = target.getMonth() - today.getMonth();
  const dayAdjustment = target.getDate() >= today.getDate() ? 0 : -1;
  return Math.max(1, years * 12 + months + dayAdjustment);
}

function getLinkedPortfolioValue(
  goal: FinancialGoal,
  portfolio: PortfolioItem[],
  aprMoneyMarketFund = 0.05,
) {
  const linkedIds = new Set(goal.linkedHoldingIds);
  return portfolio
    .filter((item) => linkedIds.has(item.id))
    .reduce((sum, item) => {
      const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
      return sum + currentPriceUsed * item.quantity;
    }, 0);
}

function recommendAllocation(
  goal: FinancialGoal,
  monthsRemaining: number,
  mode: "safer" | "base" | "aggressive",
): GoalAllocation[] {
  const preferred = new Set(goal.preferredInstruments);
  const risk = goalRiskProfile(goal.riskTolerance);
  const years = monthsRemaining / 12;

  let allocation: GoalAllocation[];
  if (years < 1.5 || risk === "defensive") {
    allocation = [
      { type: "money_market_fund", label: typeLabels.money_market_fund, percent: 70 },
      { type: "cash_savings", label: typeLabels.cash_savings, percent: 30 },
    ];
  } else if (years < 5 || risk === "balanced") {
    allocation = [
      { type: "money_market_fund", label: typeLabels.money_market_fund, percent: 35 },
      { type: "bond_fund", label: typeLabels.bond_fund, percent: 40 },
      { type: "mixed_fund", label: typeLabels.mixed_fund, percent: 25 },
    ];
  } else {
    allocation = [
      { type: "bond_fund", label: typeLabels.bond_fund, percent: 25 },
      { type: "mixed_fund", label: typeLabels.mixed_fund, percent: 30 },
      { type: "equity_fund", label: typeLabels.equity_fund, percent: 30 },
      { type: "stock", label: typeLabels.stock, percent: 15 },
    ];
  }

  if (mode === "safer") allocation = shiftToSafer(allocation);
  if (mode === "aggressive" && years >= 3 && risk !== "defensive") {
    allocation = shiftToAggressive(allocation);
  }

  if (preferred.size > 0) {
    allocation = allocation.map((item) => ({
      ...item,
      percent: preferred.has(item.type) ? item.percent + 6 : Math.max(0, item.percent - 3),
    }));
  }

  return normalizeAllocation(allocation);
}

function shiftToSafer(allocation: GoalAllocation[]) {
  const next = allocation.map((item) => ({ ...item }));
  const riskyTypes = new Set<InvestmentType>(["stock", "equity_fund", "mixed_fund"]);
  let shifted = 0;
  next.forEach((item) => {
    if (!riskyTypes.has(item.type)) return;
    const cut = Math.min(10, item.percent);
    item.percent -= cut;
    shifted += cut;
  });
  next.push({ type: "money_market_fund", label: typeLabels.money_market_fund, percent: shifted });
  return next;
}

function shiftToAggressive(allocation: GoalAllocation[]) {
  const next = allocation.map((item) => ({ ...item }));
  let shifted = 0;
  next.forEach((item) => {
    if (item.type !== "cash_savings" && item.type !== "money_market_fund") return;
    const cut = Math.min(12, item.percent);
    item.percent -= cut;
    shifted += cut;
  });
  next.push({ type: "equity_fund", label: typeLabels.equity_fund, percent: Math.round(shifted * 0.7) });
  next.push({ type: "stock", label: typeLabels.stock, percent: Math.round(shifted * 0.3) });
  return next;
}

function normalizeAllocation(allocation: GoalAllocation[]) {
  const merged = new Map<InvestmentType, GoalAllocation>();
  allocation.forEach((item) => {
    if (item.percent <= 0) return;
    const existing = merged.get(item.type);
    merged.set(item.type, {
      type: item.type,
      label: item.label,
      percent: (existing?.percent ?? 0) + item.percent,
    });
  });
  const items = Array.from(merged.values());
  const total = items.reduce((sum, item) => sum + item.percent, 0) || 1;
  const normalized = items.map((item) => ({
    ...item,
    percent: Math.round((item.percent / total) * 100),
  }));
  const drift = 100 - normalized.reduce((sum, item) => sum + item.percent, 0);
  if (normalized[0]) normalized[0].percent += drift;
  return normalized;
}

function blendedRates(allocation: GoalAllocation[]) {
  return allocation.reduce(
    (acc, item) => {
      const weight = item.percent / 100;
      const rates = annualReturnRanges[item.type];
      return {
        low: acc.low + rates.low * weight,
        base: acc.base + rates.base * weight,
        high: acc.high + rates.high * weight,
      };
    },
    { low: 0, base: 0, high: 0 },
  );
}

function buildProjection({
  startAmount,
  monthlyContribution,
  months,
  rates,
  today,
}: {
  startAmount: number;
  monthlyContribution: number;
  months: number;
  rates: { low: number; base: number; high: number };
  today: Date;
}) {
  const points: GoalProjectionPoint[] = [];
  const values = { low: startAmount, base: startAmount, high: startAmount };
  const step = Math.max(1, Math.ceil(months / 12));

  for (let month = 1; month <= months; month += 1) {
    values.low = values.low * (1 + rates.low / 12) + monthlyContribution;
    values.base = values.base * (1 + rates.base / 12) + monthlyContribution;
    values.high = values.high * (1 + rates.high / 12) + monthlyContribution;
    if (month === 1 || month === months || month % step === 0) {
      const date = new Date(today);
      date.setMonth(today.getMonth() + month);
      points.push({
        month: formatMonth(date),
        low: Math.round(values.low),
        base: Math.round(values.base),
        high: Math.round(values.high),
      });
    }
  }
  return points;
}

function requiredMonthly({
  targetAmount,
  currentProgress,
  months,
  annualRate,
}: {
  targetAmount: number;
  currentProgress: number;
  months: number;
  annualRate: number;
}) {
  const monthlyRate = annualRate / 12;
  const futureCurrent = currentProgress * (1 + monthlyRate) ** months;
  const gap = Math.max(0, targetAmount - futureCurrent);
  if (gap === 0) return 0;
  if (monthlyRate === 0) return Math.ceil(gap / months);
  const annuityFactor = (((1 + monthlyRate) ** months - 1) / monthlyRate);
  return Math.ceil(gap / annuityFactor);
}

function estimateCompletionMonth({
  targetAmount,
  startAmount,
  monthlyContribution,
  annualRate,
  today,
  maxMonths,
}: {
  targetAmount: number;
  startAmount: number;
  monthlyContribution: number;
  annualRate: number;
  today: Date;
  maxMonths: number;
}) {
  if (startAmount >= targetAmount) return "Target sudah tercapai";
  if (monthlyContribution <= 0) return "Belum tercapai";

  let value = startAmount;
  for (let month = 1; month <= maxMonths; month += 1) {
    value = value * (1 + annualRate / 12) + monthlyContribution;
    if (value >= targetAmount) {
      const date = new Date(today);
      date.setMonth(today.getMonth() + month);
      return formatMonth(date);
    }
  }
  return "Belum tercapai";
}

function calculateContributionStreak(
  goalId: string,
  contributions: GoalContribution[],
  today: Date,
) {
  const months = new Set(
    contributions
      .filter((item) => item.goalId === goalId && item.amount > 0)
      .map((item) => item.contributionMonth),
  );
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1);

  while (months.has(formatMonthKey(cursor))) {
    streak += 1;
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return streak;
}

function buildWarnings({
  goal,
  monthsRemaining,
  requiredMonthlyInvestment,
  baseFutureValue,
  allocation,
}: {
  goal: FinancialGoal;
  monthsRemaining: number;
  requiredMonthlyInvestment: number;
  baseFutureValue: number;
  allocation: GoalAllocation[];
}) {
  const warnings: string[] = [];
  const target = new Date(`${goal.targetDate}T00:00:00`);
  const hasRiskyAllocation = allocation.some(
    (item) => (item.type === "stock" || item.type === "equity_fund") && item.percent >= 20,
  );

  if (Number.isNaN(target.getTime()) || target.getTime() < Date.now()) {
    warnings.push("Target date sudah lewat atau tidak valid.");
  }
  if (monthsRemaining <= 6) {
    warnings.push("Timeline sangat pendek. Prioritaskan instrumen rendah risiko dan likuid.");
  }
  if (goal.monthlyContribution < requiredMonthlyInvestment) {
    warnings.push("Kontribusi bulanan lebih kecil dari estimasi kebutuhan DCA.");
  }
  if (monthsRemaining < 24 && hasRiskyAllocation) {
    warnings.push("Risiko terlalu agresif untuk timeline pendek.");
  }
  if (goal.targetAmount > 0 && baseFutureValue < goal.targetAmount * 0.8) {
    warnings.push("Target tampak belum realistis dengan kontribusi saat ini.");
  }
  if (
    monthsRemaining < 24 &&
    goal.preferredInstruments.some((type) => type === "stock" || type === "equity_fund")
  ) {
    warnings.push("Instrumen pilihan berisiko tinggi kurang cocok untuk target dekat.");
  }
  return warnings;
}

function explainPlan({
  goal,
  monthsRemaining,
  allocation,
  warnings,
  requiredMonthlyInvestment,
}: {
  goal: FinancialGoal;
  monthsRemaining: number;
  allocation: GoalAllocation[];
  warnings: string[];
  requiredMonthlyInvestment: number;
}) {
  const dominant = allocation[0]?.label ?? "instrumen rendah risiko";
  const years = Math.round((monthsRemaining / 12) * 10) / 10;
  const risk = goalRiskProfile(goal.riskTolerance);
  const riskLabel =
    risk === "defensive" ? "defensif" : risk === "balanced" ? "seimbang" : "agresif";
  const warningText =
    warnings.length > 0
      ? `Catatan utama: ${warnings[0].toLowerCase()}`
      : "Belum ada peringatan besar, tetapi rencana tetap perlu ditinjau berkala.";

  return `Rencana ini condong ke ${dominant} karena horizon sekitar ${years} tahun dan profil risiko ${riskLabel}. Estimasi DCA bulanan yang lebih aman sekitar ${formatPlainNumber(requiredMonthlyInvestment)} rupiah. ${warningText} Proyeksi ini bukan janji return.`;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" }).format(date);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatPlainNumber(value: number) {
  return Math.round(value).toLocaleString("id-ID");
}

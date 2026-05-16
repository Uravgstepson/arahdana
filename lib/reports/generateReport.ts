import type {
  AlertRule,
  AppNotification,
  FinancialGoal,
  GoalContribution,
  InvestmentType,
  PortfolioItem,
  PortfolioReviewReport,
  ReportType,
  SavedAnalysisResult,
  UserSettings,
} from "@/lib/types/investment";
import { calculatePortfolioHealthScore } from "@/lib/portfolio/healthScore";
import { computePortfolioCurrentPrice, computePortfolioMetrics } from "@/lib/portfolio/valuation";
import { planFinancialGoal } from "@/lib/goals/goalPlanner";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import { investmentTypeLabel, nonNegativeNumber } from "@/lib/utils/format";

type GenerateReportParams = {
  type: ReportType;
  portfolio: PortfolioItem[];
  analysisResults: SavedAnalysisResult[];
  goals: FinancialGoal[];
  goalContributions: GoalContribution[];
  alertRules: AlertRule[];
  notifications: AppNotification[];
  previousReports: PortfolioReviewReport[];
  settings?: Partial<UserSettings> | null;
  today?: Date;
};

type HoldingPerformance = {
  item: PortfolioItem;
  currentValue: number;
  investedValue: number;
  gainLoss: number;
  gainLossPercent: number;
};

export const reportTypeLabels: Record<ReportType, string> = {
  weekly: "Weekly review",
  monthly: "Monthly review",
  quarterly: "Quarterly review",
};

export function generatePortfolioReviewReport(params: GenerateReportParams): PortfolioReviewReport {
  const today = params.today ?? new Date();
  const settings = normalizeSettings(params.settings);
  const period = reportPeriod(params.type, today);
  const previous = findPreviousReport(params.previousReports, params.type);
  const metrics = computePortfolioMetrics(params.portfolio, settings);
  const health = calculatePortfolioHealthScore(params.portfolio, {
    aprMoneyMarketFund: settings.aprMoneyMarketFund,
    riskTolerance: settings.riskTolerance,
    timeHorizon: settings.timeHorizon,
    now: today,
  });
  const holdings = buildHoldingPerformance(params.portfolio, settings);
  const allocation = buildAllocation(holdings, previous);
  const riskExposure = buildRiskExposure(holdings);
  const dcaSummary = buildDcaSummary(params.goalContributions, period.start, period.end);
  const goalSummary = buildGoalSummary(params.goals, params.goalContributions, params.portfolio, settings, today);
  const majorAlerts = buildMajorAlerts(params.alertRules, params.notifications, period.start, period.end);
  const scores = buildScores({
    portfolio: params.portfolio,
    healthScore: health.totalScore,
    health,
    dcaSummary,
    goalSummary,
    majorAlertCount: majorAlerts.length,
    allocation,
    riskExposure,
  });
  const analysis = buildRuleBasedExplanation({
    reportType: params.type,
    metrics,
    health,
    previous,
    allocation,
    riskExposure,
    dcaSummary,
    goalSummary,
    majorAlerts,
    analysisResults: params.analysisResults,
    scores,
  });

  return {
    id: crypto.randomUUID(),
    type: params.type,
    title: `${reportTypeLabels[params.type]} - ${formatShortDate(period.end)}`,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    generatedAt: today.toISOString(),
    summary: buildSummary(metrics, health.totalScore, previous, majorAlerts.length),
    portfolioValue: round(metrics.current),
    investedValue: round(metrics.invested),
    gainLoss: round(metrics.profit),
    gainLossPercent: round(metrics.profitPercent, 2),
    previousPortfolioValue: previous?.portfolioValue,
    previousGainLossPercent: previous?.gainLossPercent,
    healthScore: health.totalScore,
    previousHealthScore: previous?.healthScore,
    bestPerformer: formatPerformer(holdings, "best"),
    worstPerformer: formatPerformer(holdings, "worst"),
    allocation,
    riskExposure,
    previousRiskExposure: previous?.riskExposure,
    dcaSummary,
    goalSummary,
    journalInsights: [
      "Belum ada jurnal investasi tersimpan. Saat modul jurnal aktif, bagian ini akan merangkum pola keputusan dan catatan evaluasi.",
    ],
    majorAlerts,
    analysis,
    scores,
    sourceCounts: {
      holdings: params.portfolio.length,
      analyzerResults: params.analysisResults.length,
      goals: params.goals.length,
      alerts: params.alertRules.length,
    },
  };
}

export function shouldCreateReportReminder(params: {
  reportType: ReportType;
  existingNotifications: AppNotification[];
  today?: Date;
}) {
  const today = params.today ?? new Date();
  const key = `report-ready:${params.reportType}:${today.toISOString().slice(0, 10)}`;
  const exists = params.existingNotifications.some((item) => item.id === key);
  if (exists) return null;

  if (params.reportType === "weekly" && today.getDay() !== 1) return null;
  if (params.reportType === "monthly" && today.getDate() !== 1) return null;
  if (params.reportType === "quarterly" && !(today.getDate() === 1 && [0, 3, 6, 9].includes(today.getMonth()))) {
    return null;
  }

  return {
    id: key,
    type: "portfolio" as const,
    title: `${reportTypeLabels[params.reportType]} siap ditinjau`,
    message: "Luangkan waktu sebentar untuk membaca laporan sebagai bahan evaluasi, bukan dorongan transaksi cepat.",
    createdAt: today.toISOString(),
  };
}

function normalizeSettings(settings?: Partial<UserSettings> | null): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    capital: nonNegativeNumber(settings?.capital ?? DEFAULT_USER_SETTINGS.capital),
    riskTolerance: nonNegativeNumber(settings?.riskTolerance ?? DEFAULT_USER_SETTINGS.riskTolerance),
    timeHorizon: settings?.timeHorizon ?? DEFAULT_USER_SETTINGS.timeHorizon,
    preferredInstruments: settings?.preferredInstruments ?? DEFAULT_USER_SETTINGS.preferredInstruments,
    language: settings?.language ?? DEFAULT_USER_SETTINGS.language,
    aprMoneyMarketFund: settings?.aprMoneyMarketFund ?? DEFAULT_USER_SETTINGS.aprMoneyMarketFund,
  };
}

function reportPeriod(type: ReportType, today: Date) {
  const end = new Date(today);
  const start = new Date(today);
  if (type === "weekly") start.setDate(start.getDate() - 7);
  if (type === "monthly") start.setMonth(start.getMonth() - 1);
  if (type === "quarterly") start.setMonth(start.getMonth() - 3);
  return { start, end };
}

function findPreviousReport(reports: PortfolioReviewReport[], type: ReportType) {
  return reports
    .filter((report) => report.type === type)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
}

function buildHoldingPerformance(portfolio: PortfolioItem[], settings: UserSettings): HoldingPerformance[] {
  return portfolio.map((item) => {
    const investedValue = item.buyPrice * item.quantity;
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, settings);
    const currentValue = currentPriceUsed * item.quantity;
    const gainLoss = currentValue - investedValue;
    return {
      item,
      currentValue,
      investedValue,
      gainLoss,
      gainLossPercent: investedValue > 0 ? (gainLoss / investedValue) * 100 : 0,
    };
  });
}

function buildAllocation(holdings: HoldingPerformance[], previous?: PortfolioReviewReport) {
  const total = holdings.reduce((sum, item) => sum + item.currentValue, 0);
  const byType = new Map<InvestmentType, number>();
  holdings.forEach((holding) => {
    byType.set(holding.item.type, (byType.get(holding.item.type) ?? 0) + holding.currentValue);
  });
  return Array.from(byType.entries())
    .map(([type, value]) => {
      const previousSlice = previous?.allocation.find((item) => item.type === type);
      return {
        type,
        label: investmentTypeLabel(type),
        value: round(value),
        percent: total > 0 ? round((value / total) * 100, 2) : 0,
        previousPercent: previousSlice?.percent,
      };
    })
    .sort((a, b) => b.value - a.value);
}

function buildRiskExposure(holdings: HoldingPerformance[]) {
  const total = holdings.reduce((sum, item) => sum + item.currentValue, 0);
  const percentFor = (predicate: (type: InvestmentType) => boolean) => {
    const value = holdings
      .filter((holding) => predicate(holding.item.type))
      .reduce((sum, holding) => sum + holding.currentValue, 0);
    return total > 0 ? round((value / total) * 100, 2) : 0;
  };
  const highRiskValue = holdings
    .filter((holding) => holding.item.riskCategory === "high")
    .reduce((sum, holding) => sum + holding.currentValue, 0);
  const largest = holdings.reduce((max, holding) => Math.max(max, holding.currentValue), 0);

  return {
    stablePercent: percentFor((type) => type === "cash_savings" || type === "money_market_fund"),
    bondPercent: percentFor((type) => type === "bond" || type === "bond_fund"),
    equityPercent: percentFor((type) => type === "stock" || type === "equity_fund" || type === "mixed_fund"),
    highRiskPercent: total > 0 ? round((highRiskValue / total) * 100, 2) : 0,
    concentrationPercent: total > 0 ? round((largest / total) * 100, 2) : 0,
  };
}

function buildDcaSummary(contributions: GoalContribution[], start: Date, end: Date) {
  const periodContributions = contributions.filter((item) => {
    const created = new Date(item.createdAt);
    const monthDate = new Date(`${item.contributionMonth}-01T00:00:00`);
    const date = Number.isNaN(created.getTime()) ? monthDate : created;
    return date >= start && date <= end;
  });
  const totalContribution = periodContributions.reduce((sum, item) => sum + item.amount, 0);
  return {
    contributionCount: periodContributions.length,
    totalContribution: round(totalContribution),
    averageContribution: periodContributions.length > 0 ? round(totalContribution / periodContributions.length) : 0,
  };
}

function buildGoalSummary(
  goals: FinancialGoal[],
  contributions: GoalContribution[],
  portfolio: PortfolioItem[],
  settings: UserSettings,
  today: Date,
) {
  const plans = goals.map((goal) => ({
    goal,
    plan: planFinancialGoal({
      goal,
      contributions,
      portfolio,
      aprMoneyMarketFund: settings.aprMoneyMarketFund,
      today,
    }),
  }));
  const averageProgressPercent = plans.length
    ? plans.reduce((sum, item) => sum + item.plan.progressPercent, 0) / plans.length
    : 0;
  return {
    activeGoals: goals.length,
    averageProgressPercent: round(averageProgressPercent, 2),
    goalsOnTrack: plans.filter((item) => item.plan.projectedShortfall <= item.goal.targetAmount * 0.1).length,
  };
}

function buildMajorAlerts(
  alertRules: AlertRule[],
  notifications: AppNotification[],
  start: Date,
  end: Date,
) {
  const triggeredRules = alertRules.filter((rule) => {
    if (rule.lastCheckStatus !== "triggered" || !rule.lastTriggeredAt) return false;
    const date = new Date(rule.lastTriggeredAt);
    return date >= start && date <= end;
  });
  const alertNotifications = notifications.filter((item) => {
    const date = new Date(item.createdAt);
    return date >= start && date <= end && (item.type === "market" || item.type === "portfolio");
  });
  const messages = [
    ...triggeredRules.map((rule) => rule.lastCheckMessage || `${rule.name} terpicu.`),
    ...alertNotifications.map((item) => `${item.title}: ${item.message}`),
  ];
  return Array.from(new Set(messages)).slice(0, 5);
}

function buildScores(params: {
  portfolio: PortfolioItem[];
  healthScore: number;
  health: ReturnType<typeof calculatePortfolioHealthScore>;
  dcaSummary: PortfolioReviewReport["dcaSummary"];
  goalSummary: PortfolioReviewReport["goalSummary"];
  majorAlertCount: number;
  allocation: PortfolioReviewReport["allocation"];
  riskExposure: PortfolioReviewReport["riskExposure"];
}) {
  const stableContribution = params.dcaSummary.contributionCount > 0 ? 18 : 0;
  const goalContribution = params.goalSummary.activeGoals > 0 ? 12 : 0;
  const alertPenalty = Math.min(18, params.majorAlertCount * 5);
  const discipline = clamp(55 + stableContribution + goalContribution - alertPenalty);
  const diversification = clamp(
    Math.round(params.health.diversificationScore * 0.55 + params.health.concentrationScore * 0.45),
  );
  const riskManagement = clamp(
    Math.round(params.health.riskScore * 0.55 + (100 - params.riskExposure.highRiskPercent) * 0.25 + params.health.allocationScore * 0.2),
  );
  const consistency = clamp(
    Math.round(45 + params.dcaSummary.contributionCount * 10 + Math.min(25, params.goalSummary.averageProgressPercent / 4)),
  );
  return {
    discipline,
    diversification,
    riskManagement,
    consistency,
  };
}

function buildRuleBasedExplanation(params: {
  reportType: ReportType;
  metrics: ReturnType<typeof computePortfolioMetrics>;
  health: ReturnType<typeof calculatePortfolioHealthScore>;
  previous?: PortfolioReviewReport;
  allocation: PortfolioReviewReport["allocation"];
  riskExposure: PortfolioReviewReport["riskExposure"];
  dcaSummary: PortfolioReviewReport["dcaSummary"];
  goalSummary: PortfolioReviewReport["goalSummary"];
  majorAlerts: string[];
  analysisResults: SavedAnalysisResult[];
  scores: PortfolioReviewReport["scores"];
}): PortfolioReviewReport["analysis"] {
  const improved: string[] = [];
  const worsened: string[] = [];
  const watch: string[] = [];
  const consistent: string[] = [];
  const tooRisky: string[] = [];

  if (params.previous) {
    const valueDelta = params.metrics.current - params.previous.portfolioValue;
    const healthDelta = params.health.totalScore - params.previous.healthScore;
    if (valueDelta > 0) improved.push(`Portfolio value rose by ${formatCompact(valueDelta)} since the previous ${params.reportType} snapshot.`);
    if (valueDelta < 0) worsened.push(`Portfolio value fell by ${formatCompact(Math.abs(valueDelta))} since the previous snapshot.`);
    if (healthDelta > 0) improved.push(`Portfolio health improved by ${healthDelta} points.`);
    if (healthDelta < 0) worsened.push(`Portfolio health declined by ${Math.abs(healthDelta)} points.`);
  } else {
    improved.push("This is the first saved snapshot for this report type, so future reports can show clearer trend changes.");
  }

  if (params.metrics.profitPercent >= 0) improved.push("Overall gain/loss remains positive on current saved prices.");
  if (params.metrics.profitPercent < 0) worsened.push("Overall portfolio is in drawdown on current saved prices.");
  if (params.dcaSummary.contributionCount > 0) consistent.push(`Recorded ${params.dcaSummary.contributionCount} contribution(s) this period.`);
  if (params.dcaSummary.contributionCount === 0) watch.push("No DCA contribution was recorded in this report window.");
  if (params.goalSummary.activeGoals > 0) consistent.push(`${params.goalSummary.goalsOnTrack}/${params.goalSummary.activeGoals} goal(s) look broadly on track.`);
  if (params.majorAlerts.length > 0) watch.push(`${params.majorAlerts.length} major alert signal(s) appeared this period.`);
  if (params.riskExposure.concentrationPercent > 35) tooRisky.push(`Largest position is ${params.riskExposure.concentrationPercent.toFixed(1)}% of portfolio.`);
  if (params.riskExposure.highRiskPercent > 50) tooRisky.push(`High-risk holdings represent ${params.riskExposure.highRiskPercent.toFixed(1)}% of portfolio.`);
  if (params.health.recommendedActions.length > 0) watch.push(...params.health.recommendedActions);

  const avoidCount = params.analysisResults.filter((item) => item.result.verdict === "AVOID").length;
  if (avoidCount > 0) watch.push(`${avoidCount} saved analyzer result(s) currently carry AVOID verdicts.`);

  return {
    improved: uniqueOrFallback(improved, "No clear improvement signal yet. Keep building comparison history."),
    worsened: uniqueOrFallback(worsened, "No major deterioration signal detected from saved data."),
    watch: uniqueOrFallback(watch, "Keep reviewing allocation, risk, and goals at a calm cadence."),
    consistent: uniqueOrFallback(consistent, "Portfolio data is being tracked, which supports better review habits."),
    tooRisky: uniqueOrFallback(tooRisky, "No excessive risk concentration detected from current saved data."),
  };
}

function buildSummary(
  metrics: ReturnType<typeof computePortfolioMetrics>,
  healthScore: number,
  previous: PortfolioReviewReport | undefined,
  majorAlertCount: number,
) {
  const valuePhrase = previous
    ? `Current value is ${formatCompact(metrics.current)}, compared with ${formatCompact(previous.portfolioValue)} in the previous snapshot.`
    : `Current saved portfolio value is ${formatCompact(metrics.current)}.`;
  const alertPhrase = majorAlertCount > 0
    ? `${majorAlertCount} alert signal(s) deserve review.`
    : "No major alert signal was captured in this period.";
  return `${valuePhrase} Gain/loss is ${metrics.profitPercent.toFixed(2)}% and health score is ${healthScore}/100. ${alertPhrase} This report is decision-support only and does not promise future returns.`;
}

function formatPerformer(holdings: HoldingPerformance[], mode: "best" | "worst") {
  if (holdings.length === 0) return undefined;
  const selected = holdings.reduce((picked, item) => {
    if (mode === "best") return item.gainLossPercent > picked.gainLossPercent ? item : picked;
    return item.gainLossPercent < picked.gainLossPercent ? item : picked;
  });
  return {
    name: selected.item.name,
    gainLossPercent: round(selected.gainLossPercent, 2),
    gainLoss: round(selected.gainLoss),
  };
}

function uniqueOrFallback(items: string[], fallback: string) {
  const unique = Array.from(new Set(items.filter(Boolean))).slice(0, 4);
  return unique.length > 0 ? unique : [fallback];
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
}

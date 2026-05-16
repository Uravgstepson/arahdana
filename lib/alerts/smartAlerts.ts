import type {
  FinancialGoal,
  GoalContribution,
  PortfolioItem,
  SavedAnalysisResult,
  SmartAlert,
  SmartAlertUrgency,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";
import { analyzeInvestment } from "@/lib/analysis/analyzeInvestment";
import { planFinancialGoal } from "@/lib/goals/goalPlanner";
import { calculatePortfolioHealthScore } from "@/lib/portfolio/healthScore";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";
import { fetchPublicMarketData } from "@/lib/providers/marketClient";

type SmartAlertInput = {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  analysisResults: SavedAnalysisResult[];
  goals: FinancialGoal[];
  goalContributions: GoalContribution[];
  settings: UserSettings;
  today?: Date;
};

export function generateSmartAlerts(params: SmartAlertInput): SmartAlert[] {
  const today = params.today ?? new Date();
  const alerts: SmartAlert[] = [];

  alerts.push(...portfolioAlerts(params, today));
  alerts.push(...watchlistAlerts(params, today));
  alerts.push(...goalAlerts(params, today));

  return dedupeAlerts(alerts)
    .sort((a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency))
    .slice(0, 12);
}

export async function generateSmartAlertsWithMarketData(params: SmartAlertInput) {
  const liveResults: SavedAnalysisResult[] = [];
  let failedMarketChecks = 0;
  const instruments = uniqueInstruments(params).slice(0, 8);

  const settled = await Promise.allSettled(
    instruments.map(async (instrument) => {
      const marketData = await fetchPublicMarketData({
        ticker: instrument.ticker,
        range: "1y",
        interval: "1d",
      });

      return {
        id: `smart-live-${instrument.ticker}`,
        name: instrument.name,
        ticker: instrument.ticker,
        type: instrument.type,
        result: analyzeInvestment({
          name: instrument.name,
          type: instrument.type,
          ticker: instrument.ticker,
          capital: params.settings.capital,
          riskTolerance: params.settings.riskTolerance,
          timeHorizon: params.settings.timeHorizon,
          prices: marketData.prices,
        }),
        priceSourceLabel: marketData.source,
        isMockData: marketData.source.toLowerCase().includes("mock"),
        createdAt: (params.today ?? new Date()).toISOString(),
      } satisfies SavedAnalysisResult;
    }),
  );

  settled.forEach((item) => {
    if (item.status === "fulfilled") {
      liveResults.push(item.value);
      return;
    }
    failedMarketChecks += 1;
  });

  return {
    alerts: generateSmartAlerts({
      ...params,
      analysisResults: [...liveResults, ...params.analysisResults],
    }),
    failedMarketChecks,
  };
}

export function smartAlertToNotification(alert: SmartAlert) {
  return {
    id: `smart-alert:${alert.id}:${alert.createdAt.slice(0, 10)}`,
    type: alert.notificationType,
    title: alert.title,
    message: `${alert.whatHappened} ${alert.suggestedAction}`,
    sourceId: alert.sourceId,
    createdAt: alert.createdAt,
  };
}

function portfolioAlerts(params: SmartAlertInput, today: Date) {
  const alerts: SmartAlert[] = [];
  const { portfolio, settings } = params;
  if (portfolio.length === 0) return alerts;

  const holdings = portfolio.map((item) => {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, {
      aprMoneyMarketFund: settings.aprMoneyMarketFund,
      now: today,
    });
    const invested = item.buyPrice * item.quantity;
    const current = currentPriceUsed * item.quantity;
    return {
      item,
      invested,
      current,
      gainLossPercent: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    };
  });
  const total = holdings.reduce((sum, item) => sum + item.current, 0);
  const largest = holdings
    .map((item) => ({ ...item, allocation: total > 0 ? (item.current / total) * 100 : 0 }))
    .sort((a, b) => b.allocation - a.allocation)[0];

  if (largest && largest.allocation >= 25) {
    const urgency = largest.allocation >= 40 ? "high" : "medium";
    alerts.push(
      makeAlert({
        id: `concentration-${largest.item.id}`,
        type: "allocation_concentration",
        title: `${largest.item.name} allocation is concentrated`,
        whatHappened: `${largest.item.name} is about ${Math.round(largest.allocation)}% of the portfolio.`,
        whyItMatters: "Large single positions can make portfolio results depend too much on one instrument.",
        suggestedAction: "Review whether this allocation still fits your plan before adding more exposure.",
        urgency,
        sourceId: largest.item.id,
        sourceLabel: largest.item.name,
        notificationType: "risk",
        today,
      }),
    );
  }

  const lossLimit = Math.max(6, Math.min(25, settings.riskTolerance || 15));
  holdings
    .filter((holding) => holding.gainLossPercent <= -lossLimit)
    .slice(0, 3)
    .forEach((holding) => {
      alerts.push(
        makeAlert({
          id: `loss-${holding.item.id}`,
          type: "holding_loss",
          title: `${holding.item.name} is below your risk band`,
          whatHappened: `${holding.item.name} is down about ${Math.round(Math.abs(holding.gainLossPercent))}%.`,
          whyItMatters: "The move is beyond the risk tolerance used by your ArahDana profile.",
          suggestedAction: "Recheck the investment thesis, position size, and whether the holding still matches your horizon.",
          urgency: Math.abs(holding.gainLossPercent) >= lossLimit * 1.5 ? "high" : "medium",
          sourceId: holding.item.id,
          sourceLabel: holding.item.name,
          notificationType: "portfolio",
          today,
        }),
      );
    });

  const healthScore = calculatePortfolioHealthScore(portfolio, {
    aprMoneyMarketFund: settings.aprMoneyMarketFund,
    riskTolerance: settings.riskTolerance,
    now: today,
  });
  if (healthScore.totalScore < 55) {
    alerts.push(
      makeAlert({
        id: "health-score-review",
        type: "health_score",
        title: `Portfolio health is ${healthScore.grade.toLowerCase()}`,
        whatHappened: `Health score is ${healthScore.totalScore}/100.`,
        whyItMatters: "The score combines diversification, allocation, risk exposure, performance, and concentration.",
        suggestedAction: healthScore.recommendedActions[0] ?? "Open portfolio health details and review the main weak point.",
        urgency: healthScore.totalScore < 40 ? "high" : "medium",
        notificationType: "risk",
        today,
      }),
    );
  }

  if ((settings.riskTolerance ?? 15) <= 10 && total > 0) {
    const stableTypes = new Set(["cash_savings", "money_market_fund"]);
    const stablePercent =
      holdings
        .filter((holding) => stableTypes.has(holding.item.type))
        .reduce((sum, holding) => sum + holding.current, 0) / total * 100;

    if (stablePercent < 20) {
      alerts.push(
        makeAlert({
          id: "defensive-cash-low",
          type: "defensive_cash",
          title: "Stable allocation is low for a defensive profile",
          whatHappened: `Cash or money market allocation is about ${Math.round(stablePercent)}%.`,
          whyItMatters: "Defensive investors usually need more liquid, lower-risk allocation to avoid forced decisions.",
          suggestedAction: "Consider adding stable allocation gradually if it fits your broader plan.",
          urgency: stablePercent < 10 ? "medium" : "low",
          notificationType: "risk",
          today,
        }),
      );
    }
  }

  params.analysisResults.slice(0, 20).forEach((analysis) => {
    if (analysis.result.volatility <= params.settings.riskTolerance * 2.4) return;
    alerts.push(
      makeAlert({
        id: `volatility-${analysis.id}`,
        type: "high_volatility",
        title: `${analysis.name} volatility is elevated`,
        whatHappened: `Latest saved analysis shows volatility around ${analysis.result.volatility.toFixed(1)}%.`,
        whyItMatters: "High volatility can widen drawdowns, especially for short horizons or larger positions.",
        suggestedAction: "Review position size and avoid making the alert a reason to rush.",
        urgency: analysis.result.volatility > params.settings.riskTolerance * 3.2 ? "high" : "medium",
        sourceId: analysis.id,
        sourceLabel: analysis.name,
        notificationType: "risk",
        today,
      }),
    );
  });

  return alerts;
}

function watchlistAlerts(params: SmartAlertInput, today: Date) {
  const alerts: SmartAlert[] = [];

  params.watchlist.forEach((item) => {
    const analysis = latestAnalysisFor(item, params.analysisResults);
    if (!analysis) return;

    if (analysis.result.verdict === "BUY") {
      alerts.push(
        makeAlert({
          id: `watchlist-buy-${item.id}`,
          type: "watchlist_buy",
          title: `${item.name} changed to BUY in saved analysis`,
          whatHappened: `The latest analyzer verdict for ${item.name} is BUY.`,
          whyItMatters: "A BUY verdict is a planning signal, not an instruction to buy immediately.",
          suggestedAction: "Review the entry zone, risk score, and your allocation limit before acting.",
          urgency: "medium",
          sourceId: item.id,
          sourceLabel: item.name,
          notificationType: "watchlist",
          today,
        }),
      );
    }

    if (analysis.result.verdict === "AVOID") {
      alerts.push(
        makeAlert({
          id: `watchlist-avoid-${item.id}`,
          type: "avoid_signal",
          title: `${item.name} is marked AVOID`,
          whatHappened: `The latest analyzer verdict for ${item.name} is AVOID.`,
          whyItMatters: "Avoid signals usually mean risk, trend, or drawdown conditions need more caution.",
          suggestedAction: "Keep it on watch or remove it from near-term buying plans until conditions improve.",
          urgency: "high",
          sourceId: item.id,
          sourceLabel: item.name,
          notificationType: "watchlist",
          today,
        }),
      );
    }

    const latestPrice = analysis.result.trend.latestPrice;
    const ideal = analysis.result.entryZones.ideal;
    if (latestPrice >= ideal.from && latestPrice <= ideal.to) {
      alerts.push(
        makeAlert({
          id: `buy-zone-${item.id}`,
          type: "buy_zone",
          title: `${item.name} is in the suggested buy zone`,
          whatHappened: `Latest saved price is within ${formatNumber(ideal.from)}-${formatNumber(ideal.to)}.`,
          whyItMatters: "The zone can help you prepare a measured decision instead of chasing price movement.",
          suggestedAction: "Check your cash plan, risk score, and DCA schedule before placing any order.",
          urgency: "medium",
          sourceId: item.id,
          sourceLabel: item.name,
          notificationType: "market",
          today,
        }),
      );
    }
  });

  return alerts;
}

function goalAlerts(params: SmartAlertInput, today: Date) {
  const alerts: SmartAlert[] = [];
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  params.goals.forEach((goal) => {
    const plan = planFinancialGoal({
      goal,
      portfolio: params.portfolio,
      contributions: params.goalContributions,
      aprMoneyMarketFund: params.settings.aprMoneyMarketFund,
      today,
    });
    const hasContributionThisMonth = params.goalContributions.some(
      (item) => item.goalId === goal.id && item.contributionMonth === currentMonth,
    );

    if (!hasContributionThisMonth && goal.monthlyContribution > 0) {
      alerts.push(
        makeAlert({
          id: `dca-due-${goal.id}`,
          type: "dca_due",
          title: `${goal.name} DCA contribution is due`,
          whatHappened: `No contribution has been recorded for ${currentMonth}.`,
          whyItMatters: "Regular contributions help keep the goal plan consistent without relying on timing the market.",
          suggestedAction: "Record the contribution when it is done, or adjust the monthly amount if your cash flow changed.",
          urgency: "low",
          sourceId: goal.id,
          sourceLabel: goal.name,
          notificationType: "reminder",
          today,
        }),
      );
    }

    if (plan.projectedShortfall > 0 && goal.monthlyContribution < plan.requiredMonthlyInvestment) {
      alerts.push(
        makeAlert({
          id: `goal-behind-${goal.id}`,
          type: "goal_behind",
          title: `${goal.name} may fall behind target`,
          whatHappened: `Planned DCA is below the estimated need by about ${formatNumber(plan.requiredMonthlyInvestment - goal.monthlyContribution)} per month.`,
          whyItMatters: "The plan may need more time, a smaller target, or a higher contribution to stay realistic.",
          suggestedAction: "Review the target date and monthly contribution before increasing investment risk.",
          urgency: plan.monthsRemaining <= 12 ? "high" : "medium",
          sourceId: goal.id,
          sourceLabel: goal.name,
          notificationType: "goal",
          today,
        }),
      );
    }
  });

  return alerts;
}

function latestAnalysisFor(item: WatchlistItem, results: SavedAnalysisResult[]) {
  const key = normalizeKey(item.name);
  return results
    .filter((result) => {
      const ticker = normalizeKey(result.ticker ?? "");
      return normalizeKey(result.name) === key || ticker === key;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function uniqueInstruments(params: SmartAlertInput) {
  const seen = new Set<string>();
  const instruments: Array<{
    name: string;
    ticker: string;
    type: SavedAnalysisResult["type"];
  }> = [];

  function push(item: { name: string; ticker?: string; type: SavedAnalysisResult["type"] }) {
    const ticker = (item.ticker?.trim() || item.name.trim()).toUpperCase();
    if (!ticker || seen.has(ticker)) return;
    seen.add(ticker);
    instruments.push({ name: item.name, ticker, type: item.type });
  }

  params.watchlist.forEach((item) => push(item));
  params.portfolio.forEach((item) => push(item));
  return instruments;
}

function makeAlert(
  item: Omit<SmartAlert, "createdAt"> & { today: Date },
): SmartAlert {
  const { today, ...alert } = item;
  return { ...alert, createdAt: today.toISOString() };
}

function dedupeAlerts(alerts: SmartAlert[]) {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    if (seen.has(alert.id)) return false;
    seen.add(alert.id);
    return true;
  });
}

function urgencyWeight(urgency: SmartAlertUrgency) {
  if (urgency === "high") return 3;
  if (urgency === "medium") return 2;
  return 1;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("id-ID");
}

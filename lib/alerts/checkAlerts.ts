import type {
  AlertCheckResult,
  AlertRule,
  AppNotification,
  InvestmentType,
  PortfolioItem,
  UserSettings,
  Verdict,
  WatchlistItem,
} from "@/lib/types/investment";
import { analyzeInvestment, calculateVolatility } from "@/lib/analysis/analyzeInvestment";
import { computePortfolioCurrentPrice, computePortfolioMetrics } from "@/lib/portfolio/valuation";
import { fetchPublicMarketData, getLatestClose } from "@/lib/providers/marketClient";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";

type CheckAlertsOptions = {
  settings?: Partial<UserSettings> | null;
};

type RuleInstrument = {
  name: string;
  ticker: string;
  type: InvestmentType;
};

export async function checkAlertRule(
  rule: AlertRule,
  portfolio: PortfolioItem[],
  watchlist: WatchlistItem[],
  options: CheckAlertsOptions = {},
): Promise<AlertCheckResult> {
  const checkedAt = new Date().toISOString();

  try {
    if (rule.alertType === "price_below" || rule.alertType === "price_above") {
      const instrument = resolveRuleInstrument(rule, portfolio, watchlist);
      if (!instrument.ticker) return skipped(rule, checkedAt, "Ticker belum diisi.");
      if (!isFinitePositive(rule.targetPrice)) return skipped(rule, checkedAt, "Target price belum diisi.");

      const price = await fetchLatestPrice(instrument.ticker);
      if (!isFinitePositive(price)) return skipped(rule, checkedAt, "Harga terbaru belum tersedia dari API pasar.");

      const isBelow = rule.alertType === "price_below";
      const triggered = isBelow ? price < rule.targetPrice : price > rule.targetPrice;
      const relation = isBelow ? "di bawah" : "di atas";

      return result({
        rule,
        checkedAt,
        triggered,
        title: triggered ? `${instrument.name} melewati batas harga` : `${instrument.name} belum melewati batas harga`,
        currentValue: price,
        threshold: rule.targetPrice,
        message: triggered
          ? `${instrument.name} sekarang ${formatNumber(price)}, ${relation} target ${formatNumber(rule.targetPrice)}. Gunakan sebagai sinyal review, bukan instruksi transaksi.`
          : `${instrument.name} sekarang ${formatNumber(price)} dan belum ${relation} target ${formatNumber(rule.targetPrice)}.`,
      });
    }

    if (rule.alertType === "near_buy_zone") {
      const instrument = resolveRuleInstrument(rule, portfolio, watchlist);
      if (!instrument.ticker) return skipped(rule, checkedAt, "Ticker belum diisi.");
      if (!isFinitePositive(rule.buyZoneFrom) || !isFinitePositive(rule.buyZoneTo)) {
        return skipped(rule, checkedAt, "Buy zone belum lengkap.");
      }

      const lower = Math.min(rule.buyZoneFrom, rule.buyZoneTo);
      const upper = Math.max(rule.buyZoneFrom, rule.buyZoneTo);
      const price = await fetchLatestPrice(instrument.ticker);
      if (!isFinitePositive(price)) return skipped(rule, checkedAt, "Harga terbaru belum tersedia dari API pasar.");

      const triggered = price >= lower && price <= upper;
      return result({
        rule,
        checkedAt,
        triggered,
        title: triggered ? `${instrument.name} masuk area pantau` : `${instrument.name} di luar area pantau`,
        currentValue: price,
        threshold: lower,
        message: triggered
          ? `${instrument.name} berada di area ${formatNumber(lower)}-${formatNumber(upper)}. Validasi ulang tesis dan risiko sebelum mengambil keputusan.`
          : `${instrument.name} berada di ${formatNumber(price)}, di luar area ${formatNumber(lower)}-${formatNumber(upper)}.`,
      });
    }

    if (rule.alertType === "high_volatility") {
      const instrument = resolveRuleInstrument(rule, portfolio, watchlist);
      if (!instrument.ticker) return skipped(rule, checkedAt, "Ticker belum diisi.");
      if (!isFinitePositive(rule.volatilityThreshold)) {
        return skipped(rule, checkedAt, "Volatility threshold belum diisi.");
      }

      const marketData = await fetchPublicMarketData({
        ticker: instrument.ticker,
        range: "3mo",
        interval: "1d",
      });
      const volatility = calculateVolatility(marketData.prices);
      const triggered = volatility > rule.volatilityThreshold;

      return result({
        rule,
        checkedAt,
        triggered,
        title: triggered ? `${instrument.name} volatilitas tinggi` : `${instrument.name} volatilitas terpantau`,
        currentValue: volatility,
        threshold: rule.volatilityThreshold,
        message: triggered
          ? `Volatilitas ${instrument.name} ${volatility.toFixed(2)}%, melewati batas ${rule.volatilityThreshold.toFixed(2)}%. Evaluasi ukuran posisi dan horizon dengan tenang.`
          : `Volatilitas ${instrument.name} ${volatility.toFixed(2)}%, masih di bawah batas ${rule.volatilityThreshold.toFixed(2)}%.`,
      });
    }

    if (rule.alertType === "verdict_buy" || rule.alertType === "verdict_avoid" || rule.alertType === "risk_score_worsens") {
      const analysis = await analyzeRuleInstrument(rule, portfolio, watchlist, options);

      if (rule.alertType === "risk_score_worsens") {
        if (!isFinitePositive(rule.riskThreshold)) return skipped(rule, checkedAt, "Risk threshold belum diisi.");
        const triggered = analysis.result.riskScore >= rule.riskThreshold;
        return result({
          rule,
          checkedAt,
          triggered,
          title: triggered ? `${analysis.instrument.name} risk score memburuk` : `${analysis.instrument.name} risk score terpantau`,
          currentValue: analysis.result.riskScore,
          threshold: rule.riskThreshold,
          observedVerdict: analysis.result.verdict,
          message: triggered
            ? `Risk score ${analysis.instrument.name} naik ke ${analysis.result.riskScore}/100, melewati batas ${rule.riskThreshold}/100. Ini sinyal untuk review ulang, bukan dorongan aksi cepat.`
            : `Risk score ${analysis.instrument.name} ${analysis.result.riskScore}/100, masih di bawah batas ${rule.riskThreshold}/100.`,
        });
      }

      const desired: Verdict = rule.alertType === "verdict_buy" ? "BUY" : "AVOID";
      const triggered = analysis.result.verdict === desired && rule.lastObservedVerdict !== desired;
      return result({
        rule,
        checkedAt,
        triggered,
        title: triggered ? `${analysis.instrument.name} verdict berubah` : `${analysis.instrument.name} verdict belum berubah`,
        currentValue: analysis.result.score,
        threshold: undefined,
        observedVerdict: analysis.result.verdict,
        message: triggered
          ? `Analyzer membaca ${analysis.instrument.name} sebagai ${desired}. Cek alasan, zona masuk, dan risiko sebelum mengambil keputusan.`
          : `Analyzer saat ini membaca ${analysis.instrument.name} sebagai ${analysis.result.verdict}.`,
      });
    }

    if (rule.alertType === "portfolio_loss") {
      if (!isFinitePositive(rule.lossThreshold)) return skipped(rule, checkedAt, "Loss threshold belum diisi.");
      const targetHolding = rule.sourceType === "portfolio" && rule.sourceId
        ? portfolio.find((item) => item.id === rule.sourceId)
        : null;

      if (targetHolding) {
        const holdingLoss = calculateHoldingProfitPercent(targetHolding);
        const triggered = holdingLoss <= -rule.lossThreshold;
        return result({
          rule,
          checkedAt,
          triggered,
          title: triggered ? `${targetHolding.name} melewati batas loss` : `${targetHolding.name} loss terpantau`,
          currentValue: Math.abs(Math.min(holdingLoss, 0)),
          threshold: rule.lossThreshold,
          message: triggered
            ? `${targetHolding.name} turun sekitar ${Math.abs(holdingLoss).toFixed(2)}%, melewati batas ${rule.lossThreshold.toFixed(2)}%. Review tesis dan batas risiko.`
            : `${targetHolding.name} saat ini ${holdingLoss.toFixed(2)}%, belum melewati batas loss ${rule.lossThreshold.toFixed(2)}%.`,
        });
      }

      const metrics = computePortfolioMetrics(portfolio);
      const triggered = metrics.profitPercent <= -rule.lossThreshold;
      return result({
        rule,
        checkedAt,
        triggered,
        title: triggered ? "Portofolio melewati batas loss" : "Loss portofolio terpantau",
        currentValue: Math.abs(Math.min(metrics.profitPercent, 0)),
        threshold: rule.lossThreshold,
        message: triggered
          ? `Loss portofolio sekitar ${Math.abs(metrics.profitPercent).toFixed(2)}%, melewati batas ${rule.lossThreshold.toFixed(2)}%. Gunakan sebagai pengingat evaluasi.`
          : `Loss portofolio sekitar ${Math.abs(Math.min(metrics.profitPercent, 0)).toFixed(2)}%, belum melewati batas ${rule.lossThreshold.toFixed(2)}%.`,
      });
    }

    if (rule.alertType === "concentration_risk") {
      if (!isFinitePositive(rule.allocationThreshold)) {
        return skipped(rule, checkedAt, "Allocation threshold belum diisi.");
      }

      const threshold = normalizePercentThreshold(rule.allocationThreshold);
      const allocations = calculateHoldingAllocations(portfolio);
      const targetAllocation = rule.sourceType === "portfolio" && rule.sourceId
        ? allocations.find((item) => item.id === rule.sourceId)
        : allocations.reduce((largest, item) => (item.percent > largest.percent ? item : largest), {
            id: "",
            name: "Portofolio",
            percent: 0,
          });
      const allocation = targetAllocation ?? {
        id: "",
        name: rule.instrumentName?.trim() || "Portofolio",
        percent: 0,
      };

      const triggered = allocation.percent > threshold;
      return result({
        rule,
        checkedAt,
        triggered,
        title: triggered ? "Alokasi terlalu terkonsentrasi" : "Konsentrasi alokasi terpantau",
        currentValue: allocation.percent,
        threshold,
        message: triggered
          ? `${allocation.name} mengambil ${allocation.percent.toFixed(2)}% portofolio, melewati batas ${threshold.toFixed(2)}%. Pertimbangkan evaluasi diversifikasi.`
          : `${allocation.name} mengambil ${allocation.percent.toFixed(2)}% portofolio, masih di bawah batas ${threshold.toFixed(2)}%.`,
      });
    }

    return skipped(rule, checkedAt, "Jenis alert belum dikenali.");
  } catch (error) {
    return {
      ruleId: rule.id,
      triggered: false,
      status: "error",
      title: "Alert belum bisa dicek",
      message:
        error instanceof Error
          ? `Alert belum bisa dicek: ${error.message}`
          : "Alert belum bisa dicek karena kesalahan tidak diketahui.",
      checkedAt,
    };
  }
}

export async function checkAllAlerts(
  rules: AlertRule[],
  portfolio: PortfolioItem[],
  watchlist: WatchlistItem[],
  options: CheckAlertsOptions = {},
): Promise<AlertCheckResult[]> {
  const enabledRules = rules.filter((rule) => rule.enabled);
  const results: AlertCheckResult[] = [];
  const batchSize = 3;

  for (let index = 0; index < enabledRules.length; index += batchSize) {
    const batch = enabledRules.slice(index, index + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((rule) => checkAlertRule(rule, portfolio, watchlist, options)),
    );

    batchResults.forEach((item, resultIndex) => {
      if (item.status === "fulfilled") {
        results.push(item.value);
        return;
      }

      const rule = batch[resultIndex];
      results.push({
        ruleId: rule.id,
        triggered: false,
        status: "error",
        title: "Alert belum bisa dicek",
        message: "Alert belum bisa dicek. Data sebelumnya tetap aman.",
        checkedAt: new Date().toISOString(),
      });
    });

    if (index + batchSize < enabledRules.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

export function createNotificationsFromAlerts(results: AlertCheckResult[]): AppNotification[] {
  return results
    .filter((item) => item.triggered)
    .map((item) => ({
      id: crypto.randomUUID(),
      type: item.title?.toLowerCase().includes("portofolio") ? "portfolio" : "market",
      title: item.title ?? "Alert terpicu",
      message: item.message,
      createdAt: item.checkedAt,
      sourceId: item.ruleId,
    }));
}

async function fetchLatestPrice(ticker: string): Promise<number | null> {
  const marketData = await fetchPublicMarketData({
    ticker,
    range: "1mo",
    interval: "1d",
  });
  return getLatestClose(marketData.prices);
}

async function analyzeRuleInstrument(
  rule: AlertRule,
  portfolio: PortfolioItem[],
  watchlist: WatchlistItem[],
  options: CheckAlertsOptions,
) {
  const instrument = resolveRuleInstrument(rule, portfolio, watchlist);
  if (!instrument.ticker) {
    throw new Error("Ticker belum diisi.");
  }

  const settings = {
    ...DEFAULT_USER_SETTINGS,
    ...(options.settings ?? {}),
  };
  const marketData = await fetchPublicMarketData({
    ticker: instrument.ticker,
    range: "1y",
    interval: "1d",
  });

  return {
    instrument,
    result: analyzeInvestment({
      name: instrument.name,
      type: instrument.type,
      ticker: instrument.ticker,
      capital: settings.capital,
      riskTolerance: settings.riskTolerance,
      timeHorizon: settings.timeHorizon,
      prices: marketData.prices,
    }),
  };
}

function resolveRuleInstrument(
  rule: AlertRule,
  portfolio: PortfolioItem[],
  watchlist: WatchlistItem[],
): RuleInstrument {
  if (rule.sourceType === "portfolio" && rule.sourceId) {
    const item = portfolio.find((holding) => holding.id === rule.sourceId);
    if (item) {
      return {
        name: rule.instrumentName?.trim() || item.name,
        ticker: (rule.ticker?.trim() || item.ticker?.trim() || item.name).toUpperCase(),
        type: item.type,
      };
    }
  }

  if (rule.sourceType === "watchlist" && rule.sourceId) {
    const item = watchlist.find((watch) => watch.id === rule.sourceId);
    if (item) {
      return {
        name: rule.instrumentName?.trim() || item.name,
        ticker: (rule.ticker?.trim() || item.name).toUpperCase(),
        type: item.type,
      };
    }
  }

  return {
    name: rule.instrumentName?.trim() || rule.ticker?.trim() || rule.name,
    ticker: (rule.ticker?.trim() || rule.instrumentName?.trim() || "").toUpperCase(),
    type: "stock",
  };
}

function result(params: {
  rule: AlertRule;
  checkedAt: string;
  triggered: boolean;
  title: string;
  message: string;
  currentValue?: number;
  threshold?: number;
  observedVerdict?: Verdict;
}): AlertCheckResult {
  return {
    ruleId: params.rule.id,
    triggered: params.triggered,
    status: params.triggered ? "triggered" : "ok",
    title: params.title,
    currentValue: params.currentValue,
    threshold: params.threshold,
    observedVerdict: params.observedVerdict,
    message: params.message,
    checkedAt: params.checkedAt,
  };
}

function skipped(rule: AlertRule, checkedAt: string, message: string): AlertCheckResult {
  return {
    ruleId: rule.id,
    triggered: false,
    status: "error",
    title: "Alert belum lengkap",
    message,
    checkedAt,
  };
}

function calculateHoldingProfitPercent(item: PortfolioItem) {
  const invested = item.buyPrice * item.quantity;
  const { currentPriceUsed } = computePortfolioCurrentPrice(item);
  const current = currentPriceUsed * item.quantity;
  return invested > 0 ? ((current - invested) / invested) * 100 : 0;
}

function calculateHoldingAllocations(portfolio: PortfolioItem[]) {
  const values = portfolio.map((item) => {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item);
    return {
      id: item.id,
      name: item.name,
      value: currentPriceUsed * item.quantity,
    };
  });
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return values.map((item) => ({
    id: item.id,
    name: item.name,
    percent: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

function normalizePercentThreshold(value: number) {
  return value <= 1 ? value * 100 : value;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

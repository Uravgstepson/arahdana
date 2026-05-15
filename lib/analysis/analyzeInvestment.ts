import type {
  AnalysisInput,
  AnalysisResult,
  InvestmentType,
  PricePoint,
  TimeHorizon,
  Verdict,
} from "@/lib/types/investment";

type TrendDirection = AnalysisResult["trend"]["direction"];

export type InvestmentAnalysisMetrics = {
  dataPoints: number;
  latestPrice: number;
  returns: number[];
  sma20: number;
  sma50: number;
  sma200: number;
  priceVsSma20Percent: number;
  trend: AnalysisResult["trend"];
  volatility: number;
  maxDrawdown: number;
  momentum: number;
  riskScore: number;
  score: number;
};

const baselineRiskByType: Record<InvestmentType, number> = {
  cash_savings: 6,
  money_market_fund: 10,
  bond: 26,
  bond_fund: 30,
  mixed_fund: 46,
  equity_fund: 68,
  stock: 72,
};

const baseAllocationByType: Record<InvestmentType, number> = {
  cash_savings: 45,
  money_market_fund: 42,
  bond: 26,
  bond_fund: 28,
  mixed_fund: 18,
  equity_fund: 12,
  stock: 12,
};

const trendLabels: Record<TrendDirection, string> = {
  strong_uptrend: "Tren naik kuat",
  uptrend: "Tren naik",
  sideways: "Sideways",
  downtrend: "Tren turun",
  strong_downtrend: "Tren turun kuat",
  limited_data: "Data terbatas",
};

export function calculateReturns(prices: PricePoint[]) {
  const cleanPrices = sanitizePrices(prices);
  const returns: number[] = [];

  for (let index = 1; index < cleanPrices.length; index += 1) {
    const previous = cleanPrices[index - 1].close;
    const current = cleanPrices[index].close;
    if (previous > 0) {
      returns.push(((current - previous) / previous) * 100);
    }
  }

  return returns;
}

export function calculateSMA(prices: PricePoint[], period: number) {
  const cleanPrices = sanitizePrices(prices);
  if (period <= 0 || cleanPrices.length === 0) return 0;

  const window = cleanPrices.slice(-Math.min(period, cleanPrices.length));
  return window.reduce((sum, price) => sum + price.close, 0) / window.length;
}

export function calculateVolatility(prices: PricePoint[]) {
  const returns = calculateReturns(prices);
  if (returns.length < 2) return 0;

  const averageReturn = average(returns);
  const variance =
    returns.reduce((sum, value) => sum + Math.pow(value - averageReturn, 2), 0) /
    (returns.length - 1);

  return round(Math.sqrt(variance) * Math.sqrt(252), 2);
}

export function calculateMaxDrawdown(prices: PricePoint[]) {
  const cleanPrices = sanitizePrices(prices);
  if (cleanPrices.length === 0) return 0;

  let peak = cleanPrices[0].close;
  let worstDrawdown = 0;

  for (const price of cleanPrices) {
    peak = Math.max(peak, price.close);
    const drawdown = peak > 0 ? ((price.close - peak) / peak) * 100 : 0;
    worstDrawdown = Math.min(worstDrawdown, drawdown);
  }

  return round(Math.abs(worstDrawdown), 2);
}

export function calculateMomentum(prices: PricePoint[]) {
  const cleanPrices = sanitizePrices(prices);
  if (cleanPrices.length < 2) return 0;

  const lookback = Math.min(20, cleanPrices.length - 1);
  const current = cleanPrices.at(-1)?.close ?? 0;
  const anchor = cleanPrices[cleanPrices.length - 1 - lookback].close;

  return anchor > 0 ? round(((current - anchor) / anchor) * 100, 2) : 0;
}

export function classifyTrend(prices: PricePoint[]): AnalysisResult["trend"] {
  const cleanPrices = sanitizePrices(prices);
  const dataPoints = cleanPrices.length;
  const latestPrice = cleanPrices.at(-1)?.close ?? 0;
  const sma20 = calculateSMA(cleanPrices, 20);
  const sma50 = calculateSMA(cleanPrices, 50);
  const sma200 = calculateSMA(cleanPrices, 200);
  const priceVsSma20Percent = sma20 > 0 ? ((latestPrice - sma20) / sma20) * 100 : 0;
  const previousSma20 = dataPoints > 25 ? calculateSMA(cleanPrices.slice(0, -5), 20) : sma20;
  const sma20SlopePercent = previousSma20 > 0 ? ((sma20 - previousSma20) / previousSma20) * 100 : 0;
  const momentum = calculateMomentum(cleanPrices);

  let direction: TrendDirection = "sideways";
  let score = 50;

  if (dataPoints < 20) {
    direction = "limited_data";
    score = latestPrice >= sma20 ? 48 : 40;
  } else if (latestPrice > sma20 && sma20 > sma50 && sma20SlopePercent > 0 && momentum > 6) {
    direction = "strong_uptrend";
    score = 84;
  } else if (latestPrice > sma20 && sma20 >= sma50 * 0.99 && momentum > -2) {
    direction = "uptrend";
    score = 72;
  } else if (latestPrice < sma20 && sma20 < sma50 && momentum < -6) {
    direction = "strong_downtrend";
    score = 16;
  } else if (latestPrice < sma20 && momentum < -2) {
    direction = "downtrend";
    score = 30;
  }

  if (priceVsSma20Percent > 12) {
    score -= 12;
  }

  return {
    direction,
    label: trendLabels[direction],
    score: clamp(Math.round(score), 0, 100),
    latestPrice,
    sma20: round(sma20, 2),
    sma50: round(sma50, 2),
    sma200: round(sma200, 2),
    priceVsSma20Percent: round(priceVsSma20Percent, 2),
    dataPoints,
  };
}

export function calculateRiskScore(input: AnalysisInput) {
  const riskTolerance = normalizeRiskTolerance(input.riskTolerance);
  const trend = classifyTrend(input.prices);
  const volatility = calculateVolatility(input.prices);
  const maxDrawdown = calculateMaxDrawdown(input.prices);
  const momentum = Math.abs(calculateMomentum(input.prices));

  const volatilityRisk = clamp(volatility * 1.35, 0, 100);
  const drawdownRisk = clamp(maxDrawdown * 2.2, 0, 100);
  const momentumRisk = clamp(momentum * 3.2, 0, 100);
  const trendRisk = 100 - trend.score;

  const weights = horizonRiskWeights(input.timeHorizon);
  const profileMismatch =
    riskTolerance <= 10 && isHighRiskInstrument(input.type)
      ? 12
      : riskTolerance <= 10 && input.type === "mixed_fund"
        ? 7
        : 0;
  const shortHorizonPenalty = input.timeHorizon === "short" && volatility > riskTolerance * 2 ? 10 : 0;

  let riskScore =
    volatilityRisk * weights.volatility +
    drawdownRisk * weights.drawdown +
    baselineRiskByType[input.type] * weights.type +
    trendRisk * weights.trend +
    momentumRisk * weights.momentum +
    profileMismatch +
    shortHorizonPenalty;

  if (input.type === "cash_savings") {
    riskScore = Math.min(40, riskScore * 0.55);
  }

  if (input.type === "money_market_fund") {
    riskScore = Math.min(55, riskScore * 0.72);
  }

  return clamp(Math.round(riskScore), 0, 100);
}

export function calculateAllocation(input: AnalysisInput, analysis: InvestmentAnalysisMetrics) {
  const capital = Math.max(0, input.capital);
  const riskTolerance = normalizeRiskTolerance(input.riskTolerance);
  const dataPenalty = analysis.dataPoints < 20 ? 0.55 : 1;
  const riskPenalty = clamp(1 - analysis.riskScore / 125, 0.18, 1);
  const scoreMultiplier = clamp(analysis.score / 100, 0.25, 1);
  const modeMultiplier = riskTolerance <= 10 ? 0.58 : riskTolerance <= 20 ? 1 : 1.22;
  const shortVolatilityPenalty =
    input.timeHorizon === "short" && analysis.volatility > riskTolerance * 2 ? 0.55 : 1;

  let allocationPercentage =
    baseAllocationByType[input.type] *
    modeMultiplier *
    riskPenalty *
    scoreMultiplier *
    dataPenalty *
    shortVolatilityPenalty;

  if (riskTolerance <= 10 && isHighRiskInstrument(input.type)) {
    allocationPercentage = Math.min(allocationPercentage, 8);
  }

  if (riskTolerance <= 10 && input.type === "mixed_fund") {
    allocationPercentage = Math.min(allocationPercentage, 12);
  }

  allocationPercentage = clamp(Math.round(allocationPercentage), 1, 55);

  return {
    allocationPercentage,
    allocationAmount: Math.round((capital * allocationPercentage) / 100),
  };
}

export function generateDoNotBuyWarnings(input: AnalysisInput, analysis: InvestmentAnalysisMetrics) {
  const riskTolerance = normalizeRiskTolerance(input.riskTolerance);
  const warnings: string[] = [];

  if (analysis.dataPoints === 0) {
    warnings.push("Tidak ada data harga yang valid, sehingga sistem tidak punya dasar historis untuk titik masuk.");
  } else if (analysis.dataPoints < 20) {
    warnings.push("Data harga kurang dari 20 titik, sehingga tingkat keyakinan diturunkan dan sinyal perlu divalidasi ulang.");
  }

  if (analysis.trend.priceVsSma20Percent > 12) {
    warnings.push("Harga jauh di atas SMA20, sehingga risiko membeli saat overextended meningkat.");
  }

  if (analysis.volatility > riskTolerance * 2.4) {
    warnings.push("Volatilitas historis terlalu tinggi dibanding toleransi risiko pengguna.");
  }

  if (input.timeHorizon === "short" && analysis.volatility > riskTolerance * 2) {
    warnings.push("Horizon pendek tidak cocok dengan volatilitas yang sedang tinggi.");
  }

  if (["downtrend", "strong_downtrend"].includes(analysis.trend.direction)) {
    warnings.push("Tren harga masih melemah, tunggu konfirmasi pemulihan sebelum masuk.");
  }

  if (analysis.maxDrawdown > riskTolerance * 2) {
    warnings.push("Max drawdown historis lebih dalam dari toleransi risiko saat ini.");
  }

  if (analysis.momentum > 15) {
    warnings.push("Momentum terlalu panas, masuk sekarang berisiko mengejar harga.");
  } else if (analysis.momentum < -6) {
    warnings.push("Momentum masih negatif, recovery belum cukup kuat.");
  }

  if (riskTolerance <= 10 && isHighRiskInstrument(input.type)) {
    warnings.push("Profil defensif sebaiknya tidak over-allocate ke saham atau reksadana saham.");
  }

  if (input.type === "cash_savings") {
    warnings.push("Tabungan/cash cocok untuk likuiditas, tetapi return biasanya rendah dan perlu dibandingkan dengan inflasi.");
  }

  if (input.type === "money_market_fund") {
    warnings.push("Reksadana pasar uang cenderung berisiko lebih rendah, tetapi potensi return juga biasanya terbatas.");
  }

  return warnings.length
    ? warnings
    : ["Tidak ada peringatan besar dari data historis, tetap gunakan pembelian bertahap dan batas risiko."];
}

export function generateVerdict(input: AnalysisInput, analysis: InvestmentAnalysisMetrics) {
  const riskTolerance = normalizeRiskTolerance(input.riskTolerance);
  const limitedData = analysis.dataPoints < 20;
  const bearishTrend = ["downtrend", "strong_downtrend"].includes(analysis.trend.direction);
  const overextended = analysis.momentum > 15 || analysis.trend.priceVsSma20Percent > 12;
  const highVolatilityForShortHorizon =
    input.timeHorizon === "short" && analysis.volatility > riskTolerance * 2;
  const extremeRisk =
    analysis.maxDrawdown > riskTolerance * 3 ||
    analysis.volatility > riskTolerance * 3.2 ||
    (bearishTrend && analysis.momentum < -6) ||
    (riskTolerance <= 10 && isHighRiskInstrument(input.type) && analysis.riskScore > 55);

  let verdict: Verdict = "WAIT";

  if (extremeRisk || (input.timeHorizon === "short" && analysis.volatility > riskTolerance * 3)) {
    verdict = "AVOID";
  } else if (
    !limitedData &&
    !bearishTrend &&
    !overextended &&
    !highVolatilityForShortHorizon &&
    analysis.riskScore <= 64 &&
    analysis.score >= 64
  ) {
    verdict = "BUY";
  }

  const confidencePenalty =
    (limitedData ? 25 : 0) +
    (analysis.dataPoints > 0 && analysis.dataPoints < 10 ? 12 : 0) +
    (analysis.riskScore > 70 ? 9 : 0) +
    (highVolatilityForShortHorizon ? 8 : 0) +
    (overextended ? 7 : 0);
  const confidence = clamp(
    Math.round(78 + analysis.score * 0.18 - analysis.riskScore * 0.12 - confidencePenalty),
    20,
    92,
  );

  return {
    verdict,
    confidence,
    score: analysis.score,
  };
}

export function analyzeInvestment(input: AnalysisInput): AnalysisResult {
  const analysis = buildAnalysis(input);
  const verdict = generateVerdict(input, analysis);
  const allocation = calculateAllocation(input, analysis);
  const doNotBuyWarnings = generateDoNotBuyWarnings(input, analysis);

  return {
    verdict: verdict.verdict,
    confidence: verdict.confidence,
    score: verdict.score,
    riskScore: analysis.riskScore,
    trend: analysis.trend,
    volatility: analysis.volatility,
    maxDrawdown: analysis.maxDrawdown,
    momentum: analysis.momentum,
    allocationPercentage: allocation.allocationPercentage,
    allocationAmount: allocation.allocationAmount,
    entryZones: buildEntryZones(input, analysis),
    doNotBuyWarnings,
    explanation: buildExplanation(input, analysis, verdict.verdict, verdict.confidence),
  };
}

function buildAnalysis(input: AnalysisInput): InvestmentAnalysisMetrics {
  const cleanPrices = sanitizePrices(input.prices);
  const trend = classifyTrend(cleanPrices);
  const volatility = calculateVolatility(cleanPrices);
  const maxDrawdown = calculateMaxDrawdown(cleanPrices);
  const momentum = calculateMomentum(cleanPrices);
  const riskScore = calculateRiskScore({ ...input, prices: cleanPrices });

  const momentumScore = scoreMomentum(momentum);
  const drawdownHealth = clamp(100 - maxDrawdown * 2, 0, 100);
  const riskHealth = 100 - riskScore;
  let score =
    trend.score * 0.35 +
    riskHealth * 0.3 +
    momentumScore * 0.2 +
    drawdownHealth * 0.15;

  if (cleanPrices.length < 20) score -= 12;
  if (cleanPrices.length > 0 && cleanPrices.length < 10) score -= 10;

  return {
    dataPoints: cleanPrices.length,
    latestPrice: trend.latestPrice,
    returns: calculateReturns(cleanPrices),
    sma20: trend.sma20,
    sma50: trend.sma50,
    sma200: trend.sma200,
    priceVsSma20Percent: trend.priceVsSma20Percent,
    trend,
    volatility,
    maxDrawdown,
    momentum,
    riskScore,
    score: clamp(Math.round(score), 0, 100),
  };
}

function buildEntryZones(input: AnalysisInput, analysis: InvestmentAnalysisMetrics): AnalysisResult["entryZones"] {
  const latest = analysis.latestPrice;
  const anchor = analysis.sma20 > 0 ? analysis.sma20 : latest;
  const idealCenter = analysis.trend.direction.includes("uptrend")
    ? Math.min(latest, anchor * 1.02)
    : anchor;
  const idealFrom = Math.max(0, idealCenter * 0.98);
  const idealTo = Math.max(idealFrom, idealCenter * 1.02);
  const fairFrom = Math.max(0, anchor * 0.97);
  const fairTo = Math.max(fairFrom, anchor * 1.05);
  const riskyAbove = Math.max(latest, anchor) * 1.1;
  const note =
    input.type === "cash_savings"
      ? "Tabungan/kas tidak membutuhkan zona masuk; gunakan ini sebagai posisi likuiditas dan dana darurat."
      : input.type === "money_market_fund"
      ? "Pembelian reksadana pasar uang biasanya tidak terlalu sensitif pada zona harga, tetapi tetap cek biaya dan imbal hasil historis."
      : "Gunakan zona sebagai panduan bertahap, bukan harga pasti.";

  return {
    ideal: {
      from: round(idealFrom, 2),
      to: round(idealTo, 2),
      label: "Zona beli ideal",
    },
    fair: {
      from: round(fairFrom, 2),
      to: round(fairTo, 2),
      label: "Zona pantau wajar",
    },
    riskyAbove: round(riskyAbove, 2),
    note,
  };
}

function buildExplanation(
  input: AnalysisInput,
  analysis: InvestmentAnalysisMetrics,
  verdict: Verdict,
  confidence: number,
) {
  const limitedData =
    analysis.dataPoints < 20
      ? " Data kurang dari 20 titik, jadi confidence sengaja diturunkan."
      : "";
  const shortHorizon =
    input.timeHorizon === "short" && analysis.volatility > normalizeRiskTolerance(input.riskTolerance) * 2
      ? " Horizon pendek dan volatilitas tinggi membuat sistem lebih konservatif."
      : "";

  return `Keputusan ${verdictLabel(verdict)} berasal dari skor peluang ${analysis.score}/100, skor risiko ${analysis.riskScore}/100, tren ${analysis.trend.label.toLowerCase()}, volatilitas ${analysis.volatility.toFixed(
    2,
  )}%, drawdown maksimum ${analysis.maxDrawdown.toFixed(2)}%, momentum ${analysis.momentum.toFixed(
    2,
  )}%, dan tingkat keyakinan ${confidence}%.${limitedData}${shortHorizon} Semua hasil dihitung dari data input dan aturan risiko deterministik.`;
}

function verdictLabel(verdict: Verdict) {
  if (verdict === "BUY") return "BELI";
  if (verdict === "WAIT") return "TUNGGU";
  return "HINDARI";
}

function scoreMomentum(momentum: number) {
  if (momentum >= 2 && momentum <= 10) return 86;
  if (momentum > 10 && momentum <= 15) return 66;
  if (momentum > 15) return 35;
  if (momentum >= -2) return 62;
  if (momentum >= -8) return 42;
  return 24;
}

function horizonRiskWeights(timeHorizon: TimeHorizon) {
  if (timeHorizon === "short") {
    return { volatility: 0.36, drawdown: 0.18, type: 0.14, trend: 0.18, momentum: 0.14 };
  }

  if (timeHorizon === "long") {
    return { volatility: 0.2, drawdown: 0.34, type: 0.22, trend: 0.16, momentum: 0.08 };
  }

  return { volatility: 0.27, drawdown: 0.27, type: 0.18, trend: 0.18, momentum: 0.1 };
}

function sanitizePrices(prices: PricePoint[]) {
  return prices.filter((price) => Number.isFinite(price.close) && price.close > 0);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function isHighRiskInstrument(type: InvestmentType) {
  return type === "stock" || type === "equity_fund";
}

function normalizeRiskTolerance(riskTolerance: number) {
  return clamp(riskTolerance, 5, 30);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

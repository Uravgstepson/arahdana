import {
  calculateMomentum,
  calculateVolatility,
  classifyTrend,
} from "@/lib/analysis/analyzeInvestment";
import type { PricePoint } from "@/lib/types/investment";

export type MarketInsightSectorKey =
  | "banking"
  | "technology"
  | "consumer"
  | "energy"
  | "healthcare"
  | "infrastructure";

export type MarketInsightSectorDefinition = {
  key: MarketInsightSectorKey;
  label: string;
  tickers: string[];
};

export type MarketInsightSectorInput = MarketInsightSectorDefinition & {
  instruments: Array<{
    ticker: string;
    prices: PricePoint[];
  }>;
};

export type MarketInsight = {
  overview: {
    ihsgTrend: string;
    marketSentiment: string;
    volatilityCondition: string;
    marketState: "Defensif" | "Seimbang" | "Agresif terbatas";
    marketHealthScore: number;
    latestPrice: number;
    momentum: number;
    dataPoints: number;
  };
  sectors: MarketInsightSector[];
  summaries: string[];
  opportunities: string[];
  risks: string[];
  sectorsToWatch: string[];
  sectorsBecomingRisky: string[];
  recommendations: string[];
  riskProfileLabel: string;
};

export type MarketInsightSector = {
  key: MarketInsightSectorKey;
  label: string;
  trendDirection: string;
  strengthScore: number;
  riskLevel: "Rendah" | "Sedang" | "Tinggi";
  summary: string;
  dataPoints: number;
  momentum: number;
  volatility: number;
};

export const MARKET_INSIGHT_SECTORS: MarketInsightSectorDefinition[] = [
  {
    key: "banking",
    label: "Banking",
    tickers: ["BBCA:IDX", "BBRI:IDX", "BMRI:IDX"],
  },
  {
    key: "technology",
    label: "Technology",
    tickers: ["GOTO:IDX"],
  },
  {
    key: "consumer",
    label: "Consumer",
    tickers: ["ICBP:IDX", "INDF:IDX", "UNVR:IDX"],
  },
  {
    key: "energy",
    label: "Energy",
    tickers: ["ADRO:IDX", "ANTM:IDX", "MDKA:IDX"],
  },
  {
    key: "healthcare",
    label: "Healthcare",
    tickers: ["KLBF:IDX", "MIKA:IDX"],
  },
  {
    key: "infrastructure",
    label: "Infrastructure",
    tickers: ["TLKM:IDX", "JSMR:IDX"],
  },
];

export function buildMarketInsight({
  ihsgPrices,
  sectors,
  riskTolerance,
  portfolioHealthScore,
}: {
  ihsgPrices: PricePoint[];
  sectors: MarketInsightSectorInput[];
  riskTolerance: number;
  portfolioHealthScore: number;
}): MarketInsight {
  const ihsgTrend = classifyTrend(ihsgPrices);
  const ihsgVolatility = calculateVolatility(ihsgPrices);
  const ihsgMomentum = calculateMomentum(ihsgPrices);
  const sectorInsights = sectors.map(analyzeSector);
  const breadthScore = calculateBreadthScore(sectorInsights);
  const volatilityScore = scoreVolatility(ihsgVolatility);
  const momentumScore = scoreMomentum(ihsgMomentum);
  const marketHealthScore = clampScore(
    ihsgTrend.score * 0.4 +
      volatilityScore * 0.25 +
      momentumScore * 0.15 +
      breadthScore * 0.2,
  );
  const marketSentiment = sentimentFromScore(marketHealthScore, ihsgTrend.score);
  const volatilityCondition = volatilityConditionFromValue(ihsgVolatility);
  const marketState = marketStateFrom({
    marketHealthScore,
    trendScore: ihsgTrend.score,
    volatility: ihsgVolatility,
  });
  const riskProfileLabel = riskProfileFromTolerance(riskTolerance);

  return {
    overview: {
      ihsgTrend: ihsgTrend.label,
      marketSentiment,
      volatilityCondition,
      marketState,
      marketHealthScore,
      latestPrice: ihsgTrend.latestPrice,
      momentum: ihsgMomentum,
      dataPoints: ihsgTrend.dataPoints,
    },
    sectors: sectorInsights,
    summaries: buildSummaries({
      marketHealthScore,
      marketState,
      volatilityCondition,
      sectors: sectorInsights,
    }),
    opportunities: buildOpportunities(sectorInsights, marketState),
    risks: buildRisks(sectorInsights, volatilityCondition),
    sectorsToWatch: sectorInsights
      .filter((sector) => sector.strengthScore >= 45 && sector.strengthScore < 68)
      .map((sector) => sector.label),
    sectorsBecomingRisky: sectorInsights
      .filter(
        (sector) =>
          sector.riskLevel === "Tinggi" ||
          sector.trendDirection.includes("turun"),
      )
      .map((sector) => sector.label),
    recommendations: buildRecommendations({
      marketState,
      marketHealthScore,
      volatilityCondition,
      riskProfileLabel,
      portfolioHealthScore,
    }),
    riskProfileLabel,
  };
}

function analyzeSector(
  sector: MarketInsightSectorInput,
): MarketInsightSector {
  const analyses = sector.instruments
    .map((instrument) => {
      const trend = classifyTrend(instrument.prices);
      return {
        trend,
        volatility: calculateVolatility(instrument.prices),
        momentum: calculateMomentum(instrument.prices),
      };
    })
    .filter((analysis) => analysis.trend.dataPoints > 0);

  if (analyses.length === 0) {
    return {
      key: sector.key,
      label: sector.label,
      trendDirection: "Data terbatas",
      strengthScore: 0,
      riskLevel: "Tinggi",
      summary: "Data sektor belum cukup untuk dibaca dengan tenang.",
      dataPoints: 0,
      momentum: 0,
      volatility: 0,
    };
  }

  const trendScore = average(analyses.map((analysis) => analysis.trend.score));
  const volatility = average(analyses.map((analysis) => analysis.volatility));
  const momentum = average(analyses.map((analysis) => analysis.momentum));
  const dataPoints = Math.round(
    average(analyses.map((analysis) => analysis.trend.dataPoints)),
  );
  const strengthScore = clampScore(
    trendScore * 0.62 + scoreVolatility(volatility) * 0.2 + scoreMomentum(momentum) * 0.18,
  );
  const riskLevel = sectorRiskLevel(strengthScore, volatility);
  const trendDirection = trendLabelFromScore(strengthScore, momentum);

  return {
    key: sector.key,
    label: sector.label,
    trendDirection,
    strengthScore,
    riskLevel,
    summary: sectorSummary(sector.label, trendDirection, strengthScore, riskLevel),
    dataPoints,
    momentum: round(momentum, 2),
    volatility: round(volatility, 2),
  };
}

function buildSummaries({
  marketHealthScore,
  marketState,
  volatilityCondition,
  sectors,
}: {
  marketHealthScore: number;
  marketState: MarketInsight["overview"]["marketState"];
  volatilityCondition: string;
  sectors: MarketInsightSector[];
}) {
  const strongest = [...sectors].sort(
    (left, right) => right.strengthScore - left.strengthScore,
  )[0];
  const summaries: string[] = [];

  if (marketHealthScore >= 62 && !volatilityCondition.includes("meningkat")) {
    summaries.push("Pasar cenderung stabil.");
  } else if (marketHealthScore < 45) {
    summaries.push("Pasar sedang butuh pendekatan lebih hati-hati.");
  } else {
    summaries.push("Pasar masih bergerak selektif.");
  }

  if (volatilityCondition.includes("meningkat")) {
    summaries.push("Volatilitas meningkat.");
  }

  if (strongest && strongest.strengthScore >= 58) {
    summaries.push(`Sektor ${strongest.label.toLowerCase()} masih relatif kuat.`);
  }

  if (marketState === "Defensif") {
    summaries.push("Kondisi defensif lebih disarankan.");
  } else if (marketState === "Agresif terbatas") {
    summaries.push("Eksposur agresif masih perlu dilakukan bertahap.");
  }

  return summaries.slice(0, 4);
}

function buildOpportunities(
  sectors: MarketInsightSector[],
  marketState: MarketInsight["overview"]["marketState"],
) {
  const constructiveSectors = sectors
    .filter(
      (sector) =>
        sector.strengthScore >= 62 &&
        sector.riskLevel !== "Tinggi" &&
        sector.dataPoints > 0,
    )
    .map((sector) => `${sector.label} terlihat lebih konstruktif dari sektor lain.`);

  if (marketState !== "Defensif") {
    constructiveSectors.push("DCA bertahap masih bisa dipertimbangkan pada instrumen berkualitas.");
  }

  return constructiveSectors.length
    ? constructiveSectors.slice(0, 3)
    : ["Belum ada peluang sektor yang cukup jelas dari data saat ini."];
}

function buildRisks(
  sectors: MarketInsightSector[],
  volatilityCondition: string,
) {
  const riskySectors = sectors
    .filter((sector) => sector.riskLevel === "Tinggi" && sector.dataPoints > 0)
    .map((sector) => `${sector.label} perlu dipantau karena risiko relatif tinggi.`);

  if (volatilityCondition.includes("meningkat")) {
    riskySectors.unshift("Pergerakan pasar lebih lebar, hindari menambah posisi besar sekaligus.");
  }

  return riskySectors.length
    ? riskySectors.slice(0, 3)
    : ["Risiko utama lebih banyak berasal dari disiplin sizing dan diversifikasi."];
}

function buildRecommendations({
  marketState,
  marketHealthScore,
  volatilityCondition,
  riskProfileLabel,
  portfolioHealthScore,
}: {
  marketState: MarketInsight["overview"]["marketState"];
  marketHealthScore: number;
  volatilityCondition: string;
  riskProfileLabel: string;
  portfolioHealthScore: number;
}) {
  const recommendations: string[] = [];

  if (marketState === "Defensif" || volatilityCondition.includes("meningkat")) {
    recommendations.push("Kurangi eksposur agresif.");
    recommendations.push("Tunggu konfirmasi tren sebelum menambah posisi besar.");
  } else if (marketHealthScore >= 55) {
    recommendations.push("Pasar masih cocok untuk DCA bertahap.");
  }

  if (riskProfileLabel === "Defensif") {
    recommendations.push("Prioritaskan kas, RDPU, atau obligasi sebelum saham berisiko tinggi.");
  } else if (riskProfileLabel === "Agresif" && marketState !== "Defensif") {
    recommendations.push("Tambah posisi agresif hanya bertahap dan tetap batasi konsentrasi.");
  }

  if (portfolioHealthScore > 0 && portfolioHealthScore < 55) {
    recommendations.push("Perbaiki health score portofolio sebelum menambah risiko baru.");
  } else if (portfolioHealthScore >= 70 && marketHealthScore >= 55) {
    recommendations.push("Portofolio relatif siap untuk rebalancing kecil yang terukur.");
  }

  return Array.from(new Set(recommendations)).slice(0, 4);
}

function marketStateFrom({
  marketHealthScore,
  trendScore,
  volatility,
}: {
  marketHealthScore: number;
  trendScore: number;
  volatility: number;
}): MarketInsight["overview"]["marketState"] {
  if (marketHealthScore < 48 || trendScore < 42 || volatility >= 26) {
    return "Defensif";
  }

  if (marketHealthScore >= 68 && trendScore >= 65 && volatility < 22) {
    return "Agresif terbatas";
  }

  return "Seimbang";
}

function sentimentFromScore(healthScore: number, trendScore: number) {
  if (healthScore >= 70 && trendScore >= 62) return "Positif selektif";
  if (healthScore >= 55) return "Netral stabil";
  if (healthScore >= 42) return "Waspada";
  return "Defensif";
}

function volatilityConditionFromValue(volatility: number) {
  if (volatility >= 26) return "Volatilitas meningkat";
  if (volatility >= 18) return "Volatilitas normal";
  return "Volatilitas rendah";
}

function sectorRiskLevel(
  strengthScore: number,
  volatility: number,
): MarketInsightSector["riskLevel"] {
  if (strengthScore < 42 || volatility >= 32) return "Tinggi";
  if (strengthScore < 62 || volatility >= 22) return "Sedang";
  return "Rendah";
}

function sectorSummary(
  label: string,
  trendDirection: string,
  strengthScore: number,
  riskLevel: MarketInsightSector["riskLevel"],
) {
  if (strengthScore >= 68 && riskLevel === "Rendah") {
    return `${label} relatif kuat dengan risiko yang masih terkendali.`;
  }

  if (strengthScore >= 52) {
    return `${label} masih layak dipantau, tetapi entry sebaiknya bertahap.`;
  }

  if (trendDirection.includes("turun")) {
    return `${label} sedang melemah, tunggu stabilisasi sebelum menambah bobot.`;
  }

  return `${label} belum memberi sinyal yang cukup bersih.`;
}

function trendLabelFromScore(strengthScore: number, momentum: number) {
  if (strengthScore >= 78 && momentum > 2) return "Tren naik kuat";
  if (strengthScore >= 62) return "Tren naik";
  if (strengthScore >= 42) return "Sideways";
  if (strengthScore >= 24) return "Tren turun";
  return "Tren turun kuat";
}

function calculateBreadthScore(sectors: MarketInsightSector[]) {
  const usable = sectors.filter((sector) => sector.dataPoints > 0);
  if (usable.length === 0) return 50;

  const constructive = usable.filter((sector) => sector.strengthScore >= 55).length;
  return clampScore((constructive / usable.length) * 100);
}

function scoreVolatility(volatility: number) {
  if (volatility <= 0) return 50;
  return clampScore(100 - Math.max(0, volatility - 10) * 3.2);
}

function scoreMomentum(momentum: number) {
  if (momentum >= 1 && momentum <= 8) return 82;
  if (momentum > 8 && momentum <= 14) return 64;
  if (momentum > 14) return 42;
  if (momentum >= -2) return 60;
  if (momentum >= -7) return 40;
  return 24;
}

function riskProfileFromTolerance(riskTolerance: number) {
  if (riskTolerance <= 10) return "Defensif";
  if (riskTolerance <= 20) return "Seimbang";
  return "Agresif";
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

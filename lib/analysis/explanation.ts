import type {
  AnalysisInput,
  AnalysisResult,
  InvestmentType,
  Verdict,
} from "@/lib/types/investment";
import {
  formatPercent,
  formatRupiah,
  investmentTypeLabel,
} from "@/lib/utils/format";

export type ExplanationMode = "beginner" | "advanced";

export type ExplanationCards = {
  decisionSummary: string;
  mainReasons: string[];
  mainRisks: string[];
  doNotBuy: string[];
  actionPlan: string[];
};

export type HumanExplanation = Record<ExplanationMode, ExplanationCards>;

export function generateHumanExplanation(
  input: AnalysisInput,
  analysis: AnalysisResult,
): HumanExplanation {
  return {
    beginner: buildBeginnerExplanation(input, analysis),
    advanced: buildAdvancedExplanation(input, analysis),
  };
}

function buildBeginnerExplanation(
  input: AnalysisInput,
  analysis: AnalysisResult,
): ExplanationCards {
  const verdict = verdictLabel(analysis.verdict);
  const riskLevel = simpleRiskLevel(input, analysis);

  return {
    decisionSummary:
      `${verdict}: ${decisionReason(analysis.verdict)} ` +
      `Saran alokasi ${analysis.allocationPercentage}% (${formatRupiah(
        analysis.allocationAmount,
      )}) dibuat agar risiko tetap terkendali. Ini bukan jaminan profit.`,
    mainReasons: [
      trendBeginnerText(analysis),
      volatilityBeginnerText(input, analysis),
      drawdownBeginnerText(input, analysis),
      allocationBeginnerText(analysis),
    ],
    mainRisks: [
      `Risiko utama saat ini: ${riskLevel}. Pantau tren, volatilitas, dan apakah harga mulai bergerak melawan rencana.`,
      instrumentRiskText(input.type),
      invalidationText(analysis),
    ],
    doNotBuy: normalizeWarnings(analysis.doNotBuyWarnings),
    actionPlan: actionPlanFor(analysis.verdict),
  };
}

function buildAdvancedExplanation(
  input: AnalysisInput,
  analysis: AnalysisResult,
): ExplanationCards {
  const verdict = verdictLabel(analysis.verdict);
  const horizon = horizonLabel(input.timeHorizon);

  return {
    decisionSummary:
      `${verdict}: skor peluang ${analysis.score}/100, skor risiko ${analysis.riskScore}/100, ` +
      `confidence ${analysis.confidence}%, horizon ${horizon}, dan profil risiko ${input.riskTolerance}%. ` +
      "Output ini berbasis aturan deterministik dari data historis, bukan prediksi pasti.",
    mainReasons: [
      `Tren: ${analysis.trend.label}. Harga terakhir ${formatRupiah(
        analysis.trend.latestPrice,
      )}, posisi terhadap SMA20 ${formatPercent(
        analysis.trend.priceVsSma20Percent,
      )}, skor tren ${analysis.trend.score}/100.`,
      `Volatilitas tahunan historis ${analysis.volatility.toFixed(
        2,
      )}%. Angka ini dibandingkan dengan toleransi risiko ${input.riskTolerance}% agar ukuran posisi tidak terlalu agresif.`,
      `Max drawdown historis ${analysis.maxDrawdown.toFixed(
        2,
      )}%. Ini menunjukkan penurunan terdalam dari puncak harga pada data yang tersedia.`,
      `Alokasi ${analysis.allocationPercentage}% (${formatRupiah(
        analysis.allocationAmount,
      )}) mempertimbangkan jenis instrumen ${investmentTypeLabel(
        input.type,
      )}, skor peluang, skor risiko, data terbatas, dan horizon investasi.`,
    ],
    mainRisks: [
      `Momentum ${formatPercent(
        analysis.momentum,
      )}; momentum terlalu panas bisa berarti risiko mengejar harga, sedangkan momentum negatif berarti pemulihan belum kuat.`,
      `Zona masuk berisiko dimulai di atas ${formatRupiah(
        analysis.entryZones.riskyAbove,
      )}. Pembelian agresif di atas area ini meningkatkan risiko entry mahal.`,
      instrumentRiskText(input.type),
    ],
    doNotBuy: normalizeWarnings(analysis.doNotBuyWarnings),
    actionPlan: actionPlanFor(analysis.verdict),
  };
}

function decisionReason(verdict: Verdict) {
  if (verdict === "BUY") {
    return "data saat ini relatif mendukung pembelian bertahap, tetapi tetap perlu batas risiko.";
  }

  if (verdict === "WAIT") {
    return "sinyal belum cukup menarik atau risiko belum sepadan dengan peluang masuk sekarang.";
  }

  return "risiko dari data historis terlalu besar untuk entry baru saat ini.";
}

function trendBeginnerText(analysis: AnalysisResult) {
  if (analysis.trend.direction === "limited_data") {
    return "Tren belum bisa dibaca kuat karena data harga masih terbatas.";
  }

  if (
    analysis.trend.direction === "strong_uptrend" ||
    analysis.trend.direction === "uptrend"
  ) {
    return "Tren terlihat lebih sehat karena harga berada dalam fase naik dibanding rata-rata pergerakan.";
  }

  if (
    analysis.trend.direction === "downtrend" ||
    analysis.trend.direction === "strong_downtrend"
  ) {
    return "Tren masih melemah, jadi risiko membeli terlalu cepat lebih besar.";
  }

  return "Tren masih cenderung datar, jadi lebih baik menunggu harga memberi arah yang lebih jelas.";
}

function volatilityBeginnerText(
  input: AnalysisInput,
  analysis: AnalysisResult,
) {
  const ratio = input.riskTolerance > 0 ? analysis.volatility / input.riskTolerance : 0;

  if (ratio > 2.4) {
    return "Volatilitas tinggi dibanding toleransi risiko, jadi harga bisa naik-turun cukup tajam.";
  }

  if (ratio > 1.2) {
    return "Volatilitas masih perlu diwaspadai. Alokasi sebaiknya tidak terlalu besar.";
  }

  return "Volatilitas relatif masih sejalan dengan toleransi risiko yang dipilih.";
}

function drawdownBeginnerText(input: AnalysisInput, analysis: AnalysisResult) {
  if (analysis.maxDrawdown > input.riskTolerance * 2) {
    return "Drawdown historis cukup dalam. Artinya, instrumen ini pernah turun lebih besar dari batas nyaman profil risiko.";
  }

  if (analysis.maxDrawdown > input.riskTolerance) {
    return "Drawdown masih terasa, jadi siapkan rencana jika harga turun setelah dibeli.";
  }

  return "Drawdown historis masih relatif terkendali dibanding toleransi risiko.";
}

function allocationBeginnerText(analysis: AnalysisResult) {
  if (analysis.verdict === "BUY") {
    return `Alokasi ${analysis.allocationPercentage}% disarankan agar pembelian tetap bertahap dan tidak all-in.`;
  }

  if (analysis.verdict === "WAIT") {
    return `Alokasi ${analysis.allocationPercentage}% adalah batas rencana, bukan ajakan masuk sekarang. Simpan cash sambil menunggu entry lebih baik.`;
  }

  return `Walau ada angka alokasi ${analysis.allocationPercentage}%, keputusan utamanya adalah hindari entry baru sampai risiko membaik.`;
}

function instrumentRiskText(type: InvestmentType) {
  if (type === "stock") {
    return "Saham bisa bergerak tajam karena sentimen pasar, kinerja emiten, dan kondisi sektor.";
  }

  if (type === "equity_fund") {
    return "Reksadana saham tetap mengikuti risiko pasar saham, jadi nilainya bisa turun cukup dalam.";
  }

  if (type === "mixed_fund") {
    return "Reksadana campuran punya risiko dari saham dan obligasi, jadi komposisinya perlu dicek berkala.";
  }

  if (type === "bond" || type === "bond_fund") {
    return "Obligasi dan reksadana pendapatan tetap sensitif pada perubahan suku bunga dan kualitas penerbit.";
  }

  if (type === "money_market_fund") {
    return "Reksadana pasar uang cenderung lebih stabil, tetapi return biasanya terbatas dan tetap bukan bebas risiko.";
  }

  return "Kas atau tabungan lebih likuid, tetapi return bisa kalah dari inflasi.";
}

function invalidationText(analysis: AnalysisResult) {
  const level =
    analysis.trend.sma20 > 0
      ? analysis.trend.sma20
      : analysis.entryZones.fair.from;

  if (level <= 0) {
    return "Gunakan batas rugi manual karena data harga belum cukup untuk level invalidasi otomatis.";
  }

  return `Level invalidasi sederhana bisa dipantau di sekitar ${formatRupiah(
    level,
  )}. Jika harga terus melemah di bawah area ini, rencana perlu ditinjau ulang.`;
}

function actionPlanFor(verdict: Verdict) {
  if (verdict === "BUY") {
    return [
      "Beli bertahap, misalnya dibagi beberapa transaksi.",
      "Jangan all-in; sisakan cash untuk volatilitas atau peluang berikutnya.",
      "Pantau level invalidasi dan evaluasi ulang jika harga bergerak melawan rencana.",
    ];
  }

  if (verdict === "WAIT") {
    return [
      "Tunggu entry yang lebih baik di zona pantau atau saat tren lebih jelas.",
      "Pantau support, volatilitas, dan apakah drawdown mulai membaik.",
      "Siapkan cash agar bisa masuk bertahap saat kondisi sudah lebih menarik.",
    ];
  }

  return [
    "Hindari entry baru untuk sementara.",
    "Tunggu sampai tren membaik dan risiko historis turun.",
    "Review lagi nanti setelah ada data harga baru atau perubahan kondisi pasar.",
  ];
}

function normalizeWarnings(warnings: string[]) {
  return warnings.length
    ? warnings
    : [
        "Tidak ada larangan besar dari data historis, tetapi tetap jangan membeli tanpa batas risiko.",
      ];
}

function simpleRiskLevel(input: AnalysisInput, analysis: AnalysisResult) {
  if (analysis.riskScore >= 70 || analysis.volatility > input.riskTolerance * 2.4) {
    return "tinggi";
  }

  if (analysis.riskScore >= 45 || analysis.volatility > input.riskTolerance * 1.2) {
    return "sedang";
  }

  return "lebih rendah";
}

function verdictLabel(verdict: Verdict) {
  if (verdict === "BUY") return "BELI";
  if (verdict === "WAIT") return "TUNGGU";
  return "HINDARI";
}

function horizonLabel(horizon: AnalysisInput["timeHorizon"]) {
  if (horizon === "short") return "jangka pendek";
  if (horizon === "long") return "jangka panjang";
  return "jangka menengah";
}

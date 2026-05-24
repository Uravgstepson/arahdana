import type { InvestmentType, PricePoint } from "@/lib/types/investment";

export type MarketCategory =
  | "idx_stock"
  | "global_stock"
  | "index_etf"
  | "equity_fund"
  | "money_market_fund"
  | "mixed_fund"
  | "bond_fund"
  | "sbn_retail"
  | "fr_bond";

export type MarketInstrument = {
  ticker: string;
  name: string;
  type: InvestmentType;
  category: MarketCategory;
  live: boolean;
  description?: string;
  seedPrice?: number;
  drift?: number;
  volatility?: number;
};

export const marketCategories: Array<{
  key: MarketCategory;
  label: string;
  description: string;
}> = [
  {
    key: "idx_stock",
    label: "Saham IDX",
    description: "Ticker Indonesia memakai format Google Finance (contoh: BBCA:IDX).",
  },
  {
    key: "global_stock",
    label: "Saham Global",
    description: "Saham global dan ADR yang tersedia di Yahoo Finance.",
  },
  {
    key: "index_etf",
    label: "Indeks & ETF",
    description: "Benchmark pasar, ETF, crypto, dan kurs yang umum dipantau.",
  },
  {
    key: "equity_fund",
    label: "Reksadana Saham",
    description: "Contoh reksadana saham untuk analisis risiko/NAV internal.",
  },
  {
    key: "money_market_fund",
    label: "Reksadana Pasar Uang",
    description: "Contoh RDPU dengan pergerakan NAV rendah.",
  },
  {
    key: "mixed_fund",
    label: "Reksadana Campuran",
    description: "Contoh produk campuran untuk skenario moderat.",
  },
  {
    key: "bond_fund",
    label: "Reksadana Pendapatan Tetap",
    description: "Contoh produk pendapatan tetap/obligasi.",
  },
  {
    key: "sbn_retail",
    label: "SBN Retail",
    description: "Contoh seri SBN retail untuk memantau kupon dan stabilitas instrumen negara.",
  },
  {
    key: "fr_bond",
    label: "Obligasi FR",
    description: "Contoh obligasi fixed rate pemerintah Indonesia untuk membaca arah yield.",
  },
];

export const marketUniverse: MarketInstrument[] = [
  { ticker: "BBCA:IDX", name: "Bank Central Asia", type: "stock", category: "idx_stock", live: true },
  { ticker: "BBRI:IDX", name: "Bank Rakyat Indonesia", type: "stock", category: "idx_stock", live: true },
  { ticker: "BMRI:IDX", name: "Bank Mandiri", type: "stock", category: "idx_stock", live: true },
  { ticker: "BBNI:IDX", name: "Bank Negara Indonesia", type: "stock", category: "idx_stock", live: true },
  { ticker: "TLKM:IDX", name: "Telkom Indonesia", type: "stock", category: "idx_stock", live: true },
  { ticker: "ASII:IDX", name: "Astra International", type: "stock", category: "idx_stock", live: true },
  { ticker: "UNVR:IDX", name: "Unilever Indonesia", type: "stock", category: "idx_stock", live: true },
  { ticker: "ICBP:IDX", name: "Indofood CBP", type: "stock", category: "idx_stock", live: true },
  { ticker: "INDF:IDX", name: "Indofood Sukses Makmur", type: "stock", category: "idx_stock", live: true },
  { ticker: "ADRO:IDX", name: "Adaro Energy Indonesia", type: "stock", category: "idx_stock", live: true },
  { ticker: "ANTM:IDX", name: "Aneka Tambang", type: "stock", category: "idx_stock", live: true },
  { ticker: "MDKA:IDX", name: "Merdeka Copper Gold", type: "stock", category: "idx_stock", live: true },
  { ticker: "GOTO:IDX", name: "GoTo Gojek Tokopedia", type: "stock", category: "idx_stock", live: true },
  { ticker: "BREN:IDX", name: "Barito Renewables Energy", type: "stock", category: "idx_stock", live: true },
  { ticker: "TPIA:IDX", name: "Chandra Asri Pacific", type: "stock", category: "idx_stock", live: true },
  { ticker: "AMMN:IDX", name: "Amman Mineral Internasional", type: "stock", category: "idx_stock", live: true },

  { ticker: "AAPL", name: "Apple", type: "stock", category: "global_stock", live: true },
  { ticker: "MSFT", name: "Microsoft", type: "stock", category: "global_stock", live: true },
  { ticker: "NVDA", name: "NVIDIA", type: "stock", category: "global_stock", live: true },
  { ticker: "GOOGL", name: "Alphabet", type: "stock", category: "global_stock", live: true },
  { ticker: "AMZN", name: "Amazon", type: "stock", category: "global_stock", live: true },
  { ticker: "META", name: "Meta Platforms", type: "stock", category: "global_stock", live: true },
  { ticker: "TSLA", name: "Tesla", type: "stock", category: "global_stock", live: true },
  { ticker: "BRK-B", name: "Berkshire Hathaway", type: "stock", category: "global_stock", live: true },
  { ticker: "TSM", name: "Taiwan Semiconductor ADR", type: "stock", category: "global_stock", live: true },

  { ticker: "^JKSE", name: "IHSG", type: "stock", category: "index_etf", live: true },
  { ticker: "^GSPC", name: "S&P 500", type: "stock", category: "index_etf", live: true },
  { ticker: "^IXIC", name: "Nasdaq Composite", type: "stock", category: "index_etf", live: true },
  { ticker: "SPY", name: "SPDR S&P 500 ETF", type: "stock", category: "index_etf", live: true },
  { ticker: "QQQ", name: "Invesco QQQ ETF", type: "stock", category: "index_etf", live: true },
  { ticker: "BTC-USD", name: "Bitcoin USD", type: "stock", category: "index_etf", live: true },
  { ticker: "ETH-USD", name: "Ethereum USD", type: "stock", category: "index_etf", live: true },
  { ticker: "IDR=X", name: "USD/IDR", type: "cash_savings", category: "index_etf", live: true },

  { ticker: "SMMF.NAV", name: "Sucorinvest Money Market Fund", type: "money_market_fund", category: "money_market_fund", live: false, seedPrice: 1964, drift: 0.08, volatility: 0.35 },
  { ticker: "AVRIST-KAS.NAV", name: "Avrist Ada Kas Mutiara", type: "money_market_fund", category: "money_market_fund", live: false, seedPrice: 1570, drift: 0.07, volatility: 0.28 },
  { ticker: "BATAVIA-KAS.NAV", name: "Batavia Dana Kas Maxima", type: "money_market_fund", category: "money_market_fund", live: false, seedPrice: 1810, drift: 0.07, volatility: 0.3 },

  { ticker: "SUCOR-EQUITY.NAV", name: "Sucorinvest Equity Fund", type: "equity_fund", category: "equity_fund", live: false, seedPrice: 2380, drift: 0.18, volatility: 2.8 },
  { ticker: "SCHRODER-DPP.NAV", name: "Schroder Dana Prestasi Plus", type: "equity_fund", category: "equity_fund", live: false, seedPrice: 2925, drift: 0.15, volatility: 2.5 },
  { ticker: "ASHMORE-EQ.NAV", name: "Ashmore Dana Ekuitas Nusantara", type: "equity_fund", category: "equity_fund", live: false, seedPrice: 1920, drift: 0.16, volatility: 2.6 },

  { ticker: "MANULIFE-CAMPURAN.NAV", name: "Manulife Dana Campuran", type: "mixed_fund", category: "mixed_fund", live: false, seedPrice: 1730, drift: 0.12, volatility: 1.4 },
  { ticker: "BNP-CAMPURAN.NAV", name: "BNP Paribas Spektra", type: "mixed_fund", category: "mixed_fund", live: false, seedPrice: 2110, drift: 0.11, volatility: 1.35 },

  { ticker: "MANDIRI-OBLIGASI.NAV", name: "Mandiri Investa Dana Obligasi", type: "bond_fund", category: "bond_fund", live: false, seedPrice: 1540, drift: 0.09, volatility: 0.8 },
  { ticker: "BNP-PENDAPATAN-TETAP.NAV", name: "BNP Paribas Prima II", type: "bond_fund", category: "bond_fund", live: false, seedPrice: 1875, drift: 0.08, volatility: 0.75 },

  { ticker: "ORI025.ID", name: "ORI025", type: "bond", category: "sbn_retail", live: false, seedPrice: 100, drift: 0.015, volatility: 0.18 },
  { ticker: "SBR013.ID", name: "SBR013", type: "bond", category: "sbn_retail", live: false, seedPrice: 100, drift: 0.012, volatility: 0.12 },
  { ticker: "SR020.ID", name: "Sukuk Retail SR020", type: "bond", category: "sbn_retail", live: false, seedPrice: 100, drift: 0.013, volatility: 0.14 },

  { ticker: "FR0100.ID", name: "FR0100", type: "bond", category: "fr_bond", live: false, seedPrice: 101.2, drift: 0.01, volatility: 0.42 },
  { ticker: "FR0097.ID", name: "FR0097", type: "bond", category: "fr_bond", live: false, seedPrice: 99.6, drift: 0.012, volatility: 0.48 },
  { ticker: "FR0098.ID", name: "FR0098", type: "bond", category: "fr_bond", live: false, seedPrice: 98.8, drift: 0.011, volatility: 0.45 },
];

export function normalizeMarketTicker(input: string) {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return raw;

  const known = marketUniverse.find(
    (item) =>
      item.ticker === raw ||
      item.ticker.replace(":IDX", "") === raw ||
      normalizeSearchText(item.name) === normalizeSearchText(input),
  );
  if (known) return known.ticker;

  // Convert legacy Yahoo IDX symbols into Google Finance format.
  if (raw.endsWith(".JK")) {
    return `${raw.slice(0, -3)}:IDX`;
  }

  if (raw.includes(":") || raw.includes("-") || raw.includes("=") || raw.startsWith("^")) {
    return raw;
  }

  // For plain alpha tickers: default to IDX format (Google Finance).
  return /^[A-Z]{2,5}$/.test(raw) ? `${raw}:IDX` : raw;
}

export function findMarketSuggestions(query: string, limit = 8) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return marketUniverse.slice(0, limit);

  return marketUniverse
    .filter((item) => {
      const haystack = `${item.ticker} ${item.name} ${item.category}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function createSyntheticPrices(instrument: MarketInstrument, length = 120): PricePoint[] {
  const seed = instrument.seedPrice ?? 1000;
  const drift = instrument.drift ?? 0.1;
  const volatility = instrument.volatility ?? 1;
  const startDate = new Date(Date.UTC(2025, 9, 1));

  return Array.from({ length }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    const cycle = Math.sin(index / 8) * volatility * seed * 0.006;
    const microCycle = Math.cos(index / 17) * volatility * seed * 0.002;
    const trend = index * drift;
    const close = Math.max(1, seed + trend + cycle + microCycle);

    return {
      date: date.toISOString().slice(0, 10),
      open: close * 0.998,
      high: close * 1.004,
      low: close * 0.996,
      close: Math.round(close * 100) / 100,
      volume: 0,
    };
  });
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

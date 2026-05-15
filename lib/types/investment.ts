export type InvestmentType =
  | "stock"
  | "money_market_fund"
  | "bond_fund"
  | "equity_fund"
  | "mixed_fund"
  | "bond"
  | "cash_savings";

export type TimeHorizon = "short" | "medium" | "long";

export type Verdict = "BUY" | "WAIT" | "AVOID";

export type RiskCategory = "low" | "medium" | "high";

export type DataSource =
  | "live_public_market_data"
  | "manual_input"
  | "semi_auto_import"
  | "bibit_import"
  | "savings_import"
  | "mock_data";

export type PricePoint = {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
};

export type AnalysisInput = {
  name: string;
  type: InvestmentType;
  ticker?: string;
  capital: number;
  riskTolerance: number;
  timeHorizon: TimeHorizon;
  prices: PricePoint[];
};

export type AnalysisResult = {
  verdict: Verdict;
  confidence: number;
  score: number;
  riskScore: number;
  trend: {
    direction:
      | "strong_uptrend"
      | "uptrend"
      | "sideways"
      | "downtrend"
      | "strong_downtrend"
      | "limited_data";
    label: string;
    score: number;
    latestPrice: number;
    sma20: number;
    sma50: number;
    sma200: number;
    priceVsSma20Percent: number;
    dataPoints: number;
  };
  volatility: number;
  maxDrawdown: number;
  momentum: number;
  allocationPercentage: number;
  allocationAmount: number;
  entryZones: {
    ideal: {
      from: number;
      to: number;
      label: string;
    };
    fair: {
      from: number;
      to: number;
      label: string;
    };
    riskyAbove: number;
    note: string;
  };
  doNotBuyWarnings: string[];
  explanation: string;
};

export type SavedAnalysisResult = {
  id: string;
  name: string;
  type: InvestmentType;
  ticker?: string;
  result: AnalysisResult;
  priceSourceLabel: string;
  isMockData: boolean;
  createdAt: string;
};

export type PortfolioItem = {
  id: string;
  name: string;
  type: InvestmentType;
  ticker?: string;
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  buyDate: string;
  notes?: string;
  riskCategory: RiskCategory;
  dataSource?: DataSource;
  lastPriceUpdatedAt?: string;
};

export type WatchlistItem = {
  id: string;
  name: string;
  type: InvestmentType;
  targetBuyZone: string;
  notes?: string;
  status: "watching" | "waiting" | "avoid" | "bought";
  dataSource?: DataSource;
  lastAnalyzedAt?: string;
};

export type UserSettings = {
  capital: number;
  riskTolerance: number;
  timeHorizon: TimeHorizon;
  preferredInstruments: InvestmentType[];
  /**
   * Estimasi imbal hasil tahunan (APR) untuk reksadana pasar uang / RDPU.
   * Dipakai hanya ketika tidak ada harga pasar live (NAV resmi) yang terhubung.
   * Nilai contoh: 0.05 = 5% per tahun.
   */
  aprMoneyMarketFund?: number;
};

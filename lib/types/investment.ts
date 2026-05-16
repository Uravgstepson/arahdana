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
  notificationPreferences?: NotificationPreferences;
};

export type FinancialGoalCategory =
  | "emergency_fund"
  | "education"
  | "motorcycle"
  | "car"
  | "house"
  | "retirement"
  | "custom";

export type FinancialGoalRiskProfile = "defensive" | "balanced" | "aggressive";

export type FinancialGoal = {
  id: string;
  category: FinancialGoalCategory;
  name: string;
  targetAmount: number;
  targetDate: string;
  monthlyContribution: number;
  riskTolerance: number;
  riskProfile: FinancialGoalRiskProfile;
  preferredInstruments: InvestmentType[];
  linkedHoldingIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  amount: number;
  contributionMonth: string;
  note?: string;
  createdAt: string;
};

export type NotificationType =
  | "reminder"
  | "risk"
  | "watchlist"
  | "goal"
  | "portfolio"
  | "market";

export type ReminderFrequency = "daily" | "weekly" | "monthly";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  sourceId?: string;
};

export type NotificationPreferences = {
  enabled: boolean;
  browserEnabled: boolean;
  reminderFrequency: ReminderFrequency;
  enabledTypes: NotificationType[];
  quietMode: boolean;
  mobileVibration: boolean;
  weeklySummary: boolean;
  lastGeneratedAt?: Partial<Record<NotificationType | "weekly_summary", string>>;
};

export type AlertType =
  | "price_below"
  | "price_above"
  | "near_buy_zone"
  | "verdict_buy"
  | "verdict_avoid"
  | "high_volatility"
  | "risk_score_worsens"
  | "portfolio_loss"
  | "concentration_risk";

export type AlertCheckStatus = "ok" | "triggered" | "error";

export type AlertRule = {
  id: string;
  name: string;
  ticker?: string;
  instrumentName?: string;
  alertType: AlertType;
  targetPrice?: number;
  buyZoneFrom?: number;
  buyZoneTo?: number;
  riskThreshold?: number;
  volatilityThreshold?: number;
  lossThreshold?: number;
  allocationThreshold?: number;
  enabled: boolean;
  notes?: string;
  createdAt: string;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
  lastCheckStatus?: AlertCheckStatus;
  lastCheckMessage?: string;
  lastObservedVerdict?: Verdict;
  sourceType: "watchlist" | "portfolio" | "manual";
  sourceId?: string;
};

export type AlertCheckResult = {
  ruleId: string;
  triggered: boolean;
  currentValue?: number;
  threshold?: number;
  title?: string;
  status?: AlertCheckStatus;
  observedVerdict?: Verdict;
  message: string;
  checkedAt: string;
};

export type SmartAlertUrgency = "low" | "medium" | "high";

export type SmartAlert = {
  id: string;
  type:
    | "allocation_concentration"
    | "health_score"
    | "holding_loss"
    | "watchlist_buy"
    | "avoid_signal"
    | "buy_zone"
    | "high_volatility"
    | "dca_due"
    | "goal_behind"
    | "defensive_cash";
  title: string;
  whatHappened: string;
  whyItMatters: string;
  suggestedAction: string;
  urgency: SmartAlertUrgency;
  sourceId?: string;
  sourceLabel?: string;
  notificationType: NotificationType;
  createdAt: string;
};

export type ReportType = "weekly" | "monthly" | "quarterly";

export type ReportScoreSet = {
  discipline: number;
  diversification: number;
  riskManagement: number;
  consistency: number;
};

export type ReportAllocationSlice = {
  type: InvestmentType;
  label: string;
  percent: number;
  value: number;
  previousPercent?: number;
};

export type PortfolioReviewReport = {
  id: string;
  type: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: string;
  portfolioValue: number;
  investedValue: number;
  gainLoss: number;
  gainLossPercent: number;
  previousPortfolioValue?: number;
  previousGainLossPercent?: number;
  healthScore: number;
  previousHealthScore?: number;
  bestPerformer?: {
    name: string;
    gainLossPercent: number;
    gainLoss: number;
  };
  worstPerformer?: {
    name: string;
    gainLossPercent: number;
    gainLoss: number;
  };
  allocation: ReportAllocationSlice[];
  riskExposure: {
    stablePercent: number;
    bondPercent: number;
    equityPercent: number;
    highRiskPercent: number;
    concentrationPercent: number;
  };
  previousRiskExposure?: PortfolioReviewReport["riskExposure"];
  dcaSummary: {
    contributionCount: number;
    totalContribution: number;
    averageContribution: number;
  };
  goalSummary: {
    activeGoals: number;
    averageProgressPercent: number;
    goalsOnTrack: number;
  };
  journalInsights: string[];
  majorAlerts: string[];
  analysis: {
    improved: string[];
    worsened: string[];
    watch: string[];
    consistent: string[];
    tooRisky: string[];
  };
  scores: ReportScoreSet;
  sourceCounts: {
    holdings: number;
    analyzerResults: number;
    goals: number;
    alerts: number;
  };
};

export type BetaInvestmentExperience = "beginner" | "intermediate" | "advanced" | "professional";

export type BetaSignup = {
  id: string;
  name: string;
  email: string;
  investmentExperience: BetaInvestmentExperience;
  feedbackInterest: string;
  createdAt: string;
  storageMode?: "supabase" | "local";
};

export type BetaTestChecklistKey =
  | "create_account"
  | "add_portfolio"
  | "refresh_prices"
  | "analyze_ticker"
  | "create_goal"
  | "create_alert"
  | "write_journal"
  | "generate_report"
  | "export_backup"
  | "test_mobile";

export type BetaTestFeedback = {
  id: string;
  rating: number;
  confusing: string;
  useful: string;
  bugs: string;
  featureRequest: string;
  checklist: Partial<Record<BetaTestChecklistKey, boolean>>;
  email?: string | null;
  createdAt: string;
  storageMode?: "supabase" | "local";
};

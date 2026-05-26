import type {
  AlertRule,
  AppNotification,
  BetaSignup,
  BetaTestFeedback,
  FinancialGoal,
  GoalContribution,
  PortfolioItem,
  PortfolioReviewReport,
  SavedAnalysisResult,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";

export const STORAGE_KEYS = {
  portfolio: "arahdana.portfolio",
  watchlist: "arahdana.watchlist",
  settings: "arahdana.settings",
  analysisResults: "arahdana.analysisResults",
  goals: "arahdana.goals",
  goalContributions: "arahdana.goalContributions",
  notifications: "arahdana.notifications",
  alertRules: "arahdana.alertRules",
  reports: "arahdana.reports",
  betaSignups: "arahdana.betaSignups",
  betaTestFeedback: "arahdana.betaTestFeedback",
} as const;

const USER_SCOPED_KEYS = new Set<string>([
  STORAGE_KEYS.portfolio,
  STORAGE_KEYS.watchlist,
  STORAGE_KEYS.settings,
  STORAGE_KEYS.analysisResults,
  STORAGE_KEYS.goals,
  STORAGE_KEYS.goalContributions,
  STORAGE_KEYS.notifications,
  STORAGE_KEYS.alertRules,
  STORAGE_KEYS.reports,
]);

const ACTIVE_USER_KEY = "arahdana.activeUserId";
const LEGACY_PORTFOLIO_KEYS = [
  "portfolio",
  "holdings",
  "arahDanaPortfolio",
  "arahDanaHoldings",
  "demoPortfolio",
  "localPortfolio",
  "investmentData",
  "portfolioSummary",
  "dashboardSummary",
  "cachedPortfolio",
  "cachedHoldings",
];
let activeUserId: string | null = null;
let storageWriteEventsPaused = false;

export function setArahDanaStorageUser(userId: string | null) {
  activeUserId = userId;
  if (typeof window === "undefined") return;

  if (userId) {
    window.localStorage.setItem(ACTIVE_USER_KEY, userId);
  } else {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  }
}

export function getArahDanaStorageUser() {
  return activeUserId ?? readPersistedActiveUserId();
}

export function setArahDanaStorageWriteEventsPaused(paused: boolean) {
  storageWriteEventsPaused = paused;
}

export function clearArahDanaRuntimeState() {
  setArahDanaStorageUser(null);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("arahdana:auth-signed-out"));
}

export function clearLegacyPortfolioStorage() {
  if (typeof window === "undefined") return;
  LEGACY_PORTFOLIO_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

export function dispatchPortfolioDataInvalidated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("arahdana:portfolio-updated"));
  window.dispatchEvent(new Event("arahdana:dashboard-summary-updated"));
  window.dispatchEvent(new Event("arahdana:analysis-summary-updated"));
  window.dispatchEvent(new Event("arahdana:portfolio-summary-updated"));
  window.dispatchEvent(new Event("arahdana:settings-derived-values-updated"));
  window.dispatchEvent(new Event("arahdana:portfolio-prices-updated"));
}

export type ArahDanaStorageAdapter = {
  readPortfolio(): PortfolioItem[] | null;
  writePortfolio(items: PortfolioItem[]): void;
  readWatchlist(): WatchlistItem[] | null;
  writeWatchlist(items: WatchlistItem[]): void;
  readSettings(): Partial<UserSettings> | null;
  writeSettings(settings: UserSettings): void;
  readAnalysisResults(): SavedAnalysisResult[] | null;
  writeAnalysisResults(items: SavedAnalysisResult[]): void;
  readGoals(): FinancialGoal[] | null;
  writeGoals(items: FinancialGoal[]): void;
  readGoalContributions(): GoalContribution[] | null;
  writeGoalContributions(items: GoalContribution[]): void;
  readNotifications(): AppNotification[] | null;
  writeNotifications(items: AppNotification[]): void;
  readAlertRules(): AlertRule[] | null;
  writeAlertRules(items: AlertRule[]): void;
  readReports(): PortfolioReviewReport[] | null;
  writeReports(items: PortfolioReviewReport[]): void;
  readBetaSignups(): BetaSignup[] | null;
  writeBetaSignups(items: BetaSignup[]): void;
  readBetaTestFeedback(): BetaTestFeedback[] | null;
  writeBetaTestFeedback(items: BetaTestFeedback[]): void;
  clearAll(defaultSettings: UserSettings): void;
};

export const localArahDanaStorage: ArahDanaStorageAdapter = {
  readPortfolio() {
    return readJson<PortfolioItem[]>(STORAGE_KEYS.portfolio);
  },
  writePortfolio(items) {
    writeJson(STORAGE_KEYS.portfolio, items);
  },
  readWatchlist() {
    return readJson<WatchlistItem[]>(STORAGE_KEYS.watchlist);
  },
  writeWatchlist(items) {
    writeJson(STORAGE_KEYS.watchlist, items);
  },
  readSettings() {
    return readJson<Partial<UserSettings>>(STORAGE_KEYS.settings);
  },
  writeSettings(settings) {
    writeJson(STORAGE_KEYS.settings, settings);
  },
  readAnalysisResults() {
    return readJson<SavedAnalysisResult[]>(STORAGE_KEYS.analysisResults);
  },
  writeAnalysisResults(items) {
    writeJson(STORAGE_KEYS.analysisResults, items);
  },
  readGoals() {
    return readJson<FinancialGoal[]>(STORAGE_KEYS.goals);
  },
  writeGoals(items) {
    writeJson(STORAGE_KEYS.goals, items);
  },
  readGoalContributions() {
    return readJson<GoalContribution[]>(STORAGE_KEYS.goalContributions);
  },
  writeGoalContributions(items) {
    writeJson(STORAGE_KEYS.goalContributions, items);
  },
  readNotifications() {
    return readJson<AppNotification[]>(STORAGE_KEYS.notifications);
  },
  writeNotifications(items) {
    writeJson(STORAGE_KEYS.notifications, items);
  },
  readAlertRules() {
    return readJson<AlertRule[]>(STORAGE_KEYS.alertRules);
  },
  writeAlertRules(items) {
    writeJson(STORAGE_KEYS.alertRules, items);
  },
  readReports() {
    return readJson<PortfolioReviewReport[]>(STORAGE_KEYS.reports);
  },
  writeReports(items) {
    writeJson(STORAGE_KEYS.reports, items);
  },
  readBetaSignups() {
    return readJson<BetaSignup[]>(STORAGE_KEYS.betaSignups);
  },
  writeBetaSignups(items) {
    writeJson(STORAGE_KEYS.betaSignups, items);
  },
  readBetaTestFeedback() {
    return readJson<BetaTestFeedback[]>(STORAGE_KEYS.betaTestFeedback);
  },
  writeBetaTestFeedback(items) {
    writeJson(STORAGE_KEYS.betaTestFeedback, items);
  },
  clearAll(defaultSettings) {
    writeJson(STORAGE_KEYS.portfolio, []);
    writeJson(STORAGE_KEYS.watchlist, []);
    writeJson(STORAGE_KEYS.settings, defaultSettings);
    writeJson(STORAGE_KEYS.analysisResults, []);
    writeJson(STORAGE_KEYS.goals, []);
    writeJson(STORAGE_KEYS.goalContributions, []);
    writeJson(STORAGE_KEYS.notifications, []);
    writeJson(STORAGE_KEYS.alertRules, []);
    writeJson(STORAGE_KEYS.reports, []);
    writeJson(STORAGE_KEYS.betaSignups, []);
    writeJson(STORAGE_KEYS.betaTestFeedback, []);
  },
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(storageKey(key));
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  const scopedKey = storageKey(key);
  window.localStorage.setItem(scopedKey, JSON.stringify(value));
  if (!storageWriteEventsPaused) {
    window.dispatchEvent(
      new CustomEvent("arahdana:storage-write", {
        detail: {
          key,
          scopedKey,
          userId: getArahDanaStorageUser(),
        },
      }),
    );
    if (key === STORAGE_KEYS.portfolio) {
      dispatchPortfolioDataInvalidated();
    }
    if (key === STORAGE_KEYS.reports) {
      window.dispatchEvent(new Event("arahdana:portfolio-summary-updated"));
      window.dispatchEvent(new Event("arahdana:dashboard-summary-updated"));
    }
  }
}

function storageKey(key: string) {
  if (!USER_SCOPED_KEYS.has(key)) return key;
  const userId = activeUserId ?? readPersistedActiveUserId();
  if (!userId) return key;
  return `arahdana.user.${userId}.${key.replace(/^arahdana\./, "")}`;
}

function readPersistedActiveUserId() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ACTIVE_USER_KEY);
  return value?.trim() || null;
}

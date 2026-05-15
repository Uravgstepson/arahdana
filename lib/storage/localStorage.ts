import type { PortfolioItem, SavedAnalysisResult, UserSettings, WatchlistItem } from "@/lib/types/investment";

export const STORAGE_KEYS = {
  portfolio: "arahdana.portfolio",
  watchlist: "arahdana.watchlist",
  settings: "arahdana.settings",
  analysisResults: "arahdana.analysisResults",
} as const;

export type ArahDanaStorageAdapter = {
  readPortfolio(): PortfolioItem[] | null;
  writePortfolio(items: PortfolioItem[]): void;
  readWatchlist(): WatchlistItem[] | null;
  writeWatchlist(items: WatchlistItem[]): void;
  readSettings(): Partial<UserSettings> | null;
  writeSettings(settings: UserSettings): void;
  readAnalysisResults(): SavedAnalysisResult[] | null;
  writeAnalysisResults(items: SavedAnalysisResult[]): void;
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
  clearAll(defaultSettings) {
    writeJson(STORAGE_KEYS.portfolio, []);
    writeJson(STORAGE_KEYS.watchlist, []);
    writeJson(STORAGE_KEYS.settings, defaultSettings);
    writeJson(STORAGE_KEYS.analysisResults, []);
  },
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

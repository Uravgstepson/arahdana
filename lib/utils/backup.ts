import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import { STORAGE_KEYS } from "@/lib/storage/localStorage";
import type {
  DataSource,
  InvestmentType,
  PortfolioItem,
  RiskCategory,
  TimeHorizon,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";
import { clampNumber, nonNegativeNumber } from "@/lib/utils/format";

export type ArahDanaBackupData = {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  settings: UserSettings;
  analysisResults: unknown[];
};

export type ArahDanaBackupFile = {
  app: "ArahDana";
  version: "0.4.0";
  exportedAt: string;
  data: ArahDanaBackupData;
};

export type BackupDataResult =
  | { ok: true; message: string; data: ArahDanaBackupData }
  | { ok: false; message: string };

export type BackupActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const BACKUP_VERSION = "0.4.0";
const ARAHDANA_STORAGE_PREFIX = "arahdana.";

const investmentTypes = new Set<InvestmentType>([
  "stock",
  "cash_savings",
  "money_market_fund",
  "bond_fund",
  "equity_fund",
  "mixed_fund",
  "bond",
]);

const riskCategories = new Set<RiskCategory>(["low", "medium", "high"]);
const timeHorizons = new Set<TimeHorizon>(["short", "medium", "long"]);
const watchlistStatuses = new Set<WatchlistItem["status"]>([
  "watching",
  "waiting",
  "avoid",
  "bought",
]);
const dataSources = new Set<DataSource>([
  "live_public_market_data",
  "manual_input",
  "semi_auto_import",
  "bibit_import",
  "savings_import",
  "mock_data",
]);

export function exportArahDanaData(): BackupDataResult {
  if (!canUseLocalStorage()) {
    return { ok: false, message: "Backup hanya bisa dibuat di browser." };
  }

  const backup: ArahDanaBackupFile = {
    app: "ArahDana",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: collectArahDanaData(),
  };

  const filename = `arahdana-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);

  return { ok: true, message: "Backup berhasil dibuat dan diunduh.", data: backup.data };
}

export function collectArahDanaData(): ArahDanaBackupData {
  return {
    portfolio: readArray<PortfolioItem>(STORAGE_KEYS.portfolio),
    watchlist: readArray<WatchlistItem>(STORAGE_KEYS.watchlist),
    settings: normalizeSettings(readObject(STORAGE_KEYS.settings)),
    analysisResults: readArray<unknown>(STORAGE_KEYS.analysisResults),
  };
}

export async function importArahDanaData(file: File): Promise<BackupDataResult> {
  if (!canUseLocalStorage()) {
    return { ok: false, message: "Backup hanya bisa diimpor di browser." };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, message: "File backup bukan JSON yang valid." };
  }

  const validation = validateBackupData(parsed);
  if (!validation.ok) return validation;

  writeJson(STORAGE_KEYS.portfolio, validation.data.portfolio);
  writeJson(STORAGE_KEYS.watchlist, validation.data.watchlist);
  writeJson(STORAGE_KEYS.settings, validation.data.settings);
  writeJson(STORAGE_KEYS.analysisResults, validation.data.analysisResults);
  notifyLocalDataUpdated();

  return {
    ok: true,
    message: `Backup berhasil dipulihkan: ${validation.data.portfolio.length} portofolio, ${validation.data.watchlist.length} pantauan, dan pengaturan.`,
    data: validation.data,
  };
}

export function validateBackupData(data: unknown): BackupDataResult {
  if (!isRecord(data)) {
    return { ok: false, message: "Format backup tidak dikenali." };
  }

  if (data.app !== "ArahDana") {
    return { ok: false, message: "File ini bukan backup ArahDana." };
  }

  if (!isRecord(data.data)) {
    return { ok: false, message: "Backup tidak memiliki bagian data yang valid." };
  }

  const portfolio = validatePortfolio(
    data.data.portfolio === undefined ? [] : data.data.portfolio,
  );
  if (!portfolio.ok) return portfolio;

  const watchlist = validateWatchlist(
    data.data.watchlist === undefined ? [] : data.data.watchlist,
  );
  if (!watchlist.ok) return watchlist;

  const settings = validateSettings(
    data.data.settings === undefined ? {} : data.data.settings,
  );
  if (!settings.ok) return settings;

  const analysisResults = validateAnalysisResults(data.data.analysisResults);
  if (!analysisResults.ok) return analysisResults;

  return {
    ok: true,
    message: "Backup valid.",
    data: {
      portfolio: portfolio.items,
      watchlist: watchlist.items,
      settings: settings.settings,
      analysisResults: analysisResults.items,
    },
  };
}

export function clearArahDanaData(): BackupActionResult {
  if (!canUseLocalStorage()) {
    return { ok: false, message: "Data lokal hanya bisa dihapus di browser." };
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(ARAHDANA_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  notifyLocalDataUpdated();

  return {
    ok: true,
    message: "Semua data lokal ArahDana berhasil dihapus dari browser ini.",
  };
}

function validatePortfolio(
  value: unknown,
): { ok: true; items: PortfolioItem[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) {
    return { ok: false, message: "Data portofolio di backup tidak valid." };
  }

  const items: PortfolioItem[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      return { ok: false, message: `Portfolio item #${index + 1} tidak valid.` };
    }

    if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name)) {
      return { ok: false, message: `Portfolio item #${index + 1} harus memiliki id dan nama.` };
    }

    if (!isInvestmentType(item.type)) {
      return { ok: false, message: `Portfolio item #${index + 1} memiliki jenis instrumen tidak dikenal.` };
    }

    if (
      !isNonNegativeNumber(item.buyPrice) ||
      !isNonNegativeNumber(item.quantity) ||
      !isNonNegativeNumber(item.currentPrice)
    ) {
      return { ok: false, message: `Portfolio item #${index + 1} memiliki angka yang tidak valid.` };
    }

    if (!isString(item.buyDate) || !isRiskCategory(item.riskCategory)) {
      return { ok: false, message: `Portfolio item #${index + 1} memiliki tanggal atau risiko tidak valid.` };
    }

    if (item.ticker !== undefined && !isString(item.ticker)) {
      return { ok: false, message: `Portfolio item #${index + 1} memiliki ticker tidak valid.` };
    }

    if (item.notes !== undefined && !isString(item.notes)) {
      return { ok: false, message: `Portfolio item #${index + 1} memiliki catatan tidak valid.` };
    }

    if (item.dataSource !== undefined && !isDataSource(item.dataSource)) {
      return { ok: false, message: `Portfolio item #${index + 1} memiliki sumber data tidak valid.` };
    }

    if (item.lastPriceUpdatedAt !== undefined && !isString(item.lastPriceUpdatedAt)) {
      return { ok: false, message: `Portfolio item #${index + 1} memiliki waktu update tidak valid.` };
    }

    items.push({
      id: item.id,
      name: item.name,
      type: item.type,
      ticker: item.ticker,
      buyPrice: item.buyPrice,
      quantity: item.quantity,
      currentPrice: item.currentPrice,
      buyDate: item.buyDate,
      notes: item.notes,
      riskCategory: item.riskCategory,
      dataSource: item.dataSource,
      lastPriceUpdatedAt: item.lastPriceUpdatedAt,
    });
  }

  return { ok: true, items };
}

function validateWatchlist(
  value: unknown,
): { ok: true; items: WatchlistItem[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) {
    return { ok: false, message: "Data watchlist di backup tidak valid." };
  }

  const items: WatchlistItem[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      return { ok: false, message: `Watchlist item #${index + 1} tidak valid.` };
    }

    if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name)) {
      return { ok: false, message: `Watchlist item #${index + 1} harus memiliki id dan nama.` };
    }

    if (!isInvestmentType(item.type)) {
      return { ok: false, message: `Watchlist item #${index + 1} memiliki jenis instrumen tidak dikenal.` };
    }

    if (!isString(item.targetBuyZone) || !isWatchlistStatus(item.status)) {
      return { ok: false, message: `Watchlist item #${index + 1} memiliki target atau status tidak valid.` };
    }

    if (item.notes !== undefined && !isString(item.notes)) {
      return { ok: false, message: `Watchlist item #${index + 1} memiliki catatan tidak valid.` };
    }

    if (item.dataSource !== undefined && !isDataSource(item.dataSource)) {
      return { ok: false, message: `Watchlist item #${index + 1} memiliki sumber data tidak valid.` };
    }

    if (item.lastAnalyzedAt !== undefined && !isString(item.lastAnalyzedAt)) {
      return { ok: false, message: `Watchlist item #${index + 1} memiliki waktu analisis tidak valid.` };
    }

    items.push({
      id: item.id,
      name: item.name,
      type: item.type,
      targetBuyZone: item.targetBuyZone,
      notes: item.notes,
      status: item.status,
      dataSource: item.dataSource,
      lastAnalyzedAt: item.lastAnalyzedAt,
    });
  }

  return { ok: true, items };
}

function validateSettings(
  value: unknown,
): { ok: true; settings: UserSettings } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: "Data settings di backup tidak valid." };
  }

  if (value.capital !== undefined && !isNonNegativeNumber(value.capital)) {
    return { ok: false, message: "Settings modal tidak valid." };
  }

  if (
    value.riskTolerance !== undefined &&
    !isNonNegativeNumber(value.riskTolerance)
  ) {
    return { ok: false, message: "Settings toleransi risiko tidak valid." };
  }

  if (value.timeHorizon !== undefined && !isTimeHorizon(value.timeHorizon)) {
    return { ok: false, message: "Settings jangka waktu tidak valid." };
  }

  if (
    value.preferredInstruments !== undefined &&
    (!Array.isArray(value.preferredInstruments) ||
      !value.preferredInstruments.every(isInvestmentType))
  ) {
    return { ok: false, message: "Settings instrumen pilihan tidak valid." };
  }

  if (
    value.aprMoneyMarketFund !== undefined &&
    !isNonNegativeNumber(value.aprMoneyMarketFund)
  ) {
    return { ok: false, message: "Settings APR RDPU tidak valid." };
  }

  return { ok: true, settings: normalizeSettings(value) };
}

function validateAnalysisResults(
  value: unknown,
): { ok: true; items: unknown[] } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, items: [] };
  if (!Array.isArray(value)) {
    return { ok: false, message: "Data analysis results di backup tidak valid." };
  }
  return { ok: true, items: value };
}

function normalizeSettings(settings: Partial<UserSettings> | null): UserSettings {
  const preferredInstruments = Array.isArray(settings?.preferredInstruments)
    ? settings.preferredInstruments.filter(isInvestmentType)
    : DEFAULT_USER_SETTINGS.preferredInstruments;

  return {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    capital: nonNegativeNumber(settings?.capital ?? DEFAULT_USER_SETTINGS.capital),
    riskTolerance: clampNumber(
      settings?.riskTolerance ?? DEFAULT_USER_SETTINGS.riskTolerance,
      5,
      30,
    ),
    timeHorizon: isTimeHorizon(settings?.timeHorizon)
      ? settings.timeHorizon
      : DEFAULT_USER_SETTINGS.timeHorizon,
    preferredInstruments,
    aprMoneyMarketFund: isNonNegativeNumber(settings?.aprMoneyMarketFund)
      ? settings.aprMoneyMarketFund
      : DEFAULT_USER_SETTINGS.aprMoneyMarketFund,
  };
}

function readArray<T>(key: string): T[] {
  const value = readJson(key);
  return Array.isArray(value) ? (value as T[]) : [];
}

function readObject(key: string): Record<string, unknown> | null {
  const value = readJson(key);
  return isRecord(value) ? value : null;
}

function readJson(key: string): unknown {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function notifyLocalDataUpdated() {
  window.dispatchEvent(new Event("arahdana:local-data-updated"));
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isInvestmentType(value: unknown): value is InvestmentType {
  return isString(value) && investmentTypes.has(value as InvestmentType);
}

function isRiskCategory(value: unknown): value is RiskCategory {
  return isString(value) && riskCategories.has(value as RiskCategory);
}

function isTimeHorizon(value: unknown): value is TimeHorizon {
  return isString(value) && timeHorizons.has(value as TimeHorizon);
}

function isWatchlistStatus(value: unknown): value is WatchlistItem["status"] {
  return isString(value) && watchlistStatuses.has(value as WatchlistItem["status"]);
}

function isDataSource(value: unknown): value is DataSource {
  return isString(value) && dataSources.has(value as DataSource);
}

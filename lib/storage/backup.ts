import type {
  DataSource,
  InvestmentType,
  PortfolioItem,
  RiskCategory,
  TimeHorizon,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { clampNumber, nonNegativeNumber } from "@/lib/utils/format";

export type ArahDanaBackup = {
  app: "ArahDana";
  version: string;
  exportedAt: string;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  settings: UserSettings;
};

export type BackupValidationResult =
  | { ok: true; backup: ArahDanaBackup }
  | { ok: false; message: string };

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

export function createBackup(
  portfolio: PortfolioItem[] | null,
  watchlist: WatchlistItem[] | null,
  settings: Partial<UserSettings> | null,
  defaultSettings: UserSettings,
): ArahDanaBackup {
  return {
    app: "ArahDana",
    version: APP_VERSION_LABEL,
    exportedAt: new Date().toISOString(),
    portfolio: Array.isArray(portfolio) ? portfolio : [],
    watchlist: Array.isArray(watchlist) ? watchlist : [],
    settings: normalizeSettings(settings, defaultSettings),
  };
}

export function validateBackupJson(
  jsonText: string,
  defaultSettings: UserSettings,
): BackupValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, message: "File backup bukan JSON yang valid." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, message: "Format backup tidak dikenali." };
  }

  if (!Array.isArray(parsed.portfolio)) {
    return { ok: false, message: "Backup harus berisi daftar portfolio." };
  }

  if (!Array.isArray(parsed.watchlist)) {
    return { ok: false, message: "Backup harus berisi daftar watchlist." };
  }

  if (!isRecord(parsed.settings)) {
    return { ok: false, message: "Backup harus berisi settings." };
  }

  const portfolio = validatePortfolio(parsed.portfolio);
  if (!portfolio.ok) return portfolio;

  const watchlist = validateWatchlist(parsed.watchlist);
  if (!watchlist.ok) return watchlist;

  const settings = validateSettings(parsed.settings, defaultSettings);
  if (!settings.ok) return settings;

  return {
    ok: true,
    backup: {
      app: "ArahDana",
      version: typeof parsed.version === "string" ? parsed.version : "unknown",
      exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
      portfolio: portfolio.items,
      watchlist: watchlist.items,
      settings: settings.settings,
    },
  };
}

function validatePortfolio(
  items: unknown[],
): { ok: true; items: PortfolioItem[] } | { ok: false; message: string } {
  const validItems: PortfolioItem[] = [];

  for (const [index, item] of items.entries()) {
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

    validItems.push({
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

  return { ok: true, items: validItems };
}

function validateWatchlist(
  items: unknown[],
): { ok: true; items: WatchlistItem[] } | { ok: false; message: string } {
  const validItems: WatchlistItem[] = [];

  for (const [index, item] of items.entries()) {
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

    validItems.push({
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

  return { ok: true, items: validItems };
}

function validateSettings(
  settings: Record<string, unknown>,
  defaultSettings: UserSettings,
): { ok: true; settings: UserSettings } | { ok: false; message: string } {
  if (
    settings.capital !== undefined &&
    !isNonNegativeNumber(settings.capital)
  ) {
    return { ok: false, message: "Settings capital tidak valid." };
  }

  if (
    settings.riskTolerance !== undefined &&
    !isNonNegativeNumber(settings.riskTolerance)
  ) {
    return { ok: false, message: "Settings toleransi risiko tidak valid." };
  }

  if (
    settings.timeHorizon !== undefined &&
    !isTimeHorizon(settings.timeHorizon)
  ) {
    return { ok: false, message: "Settings jangka waktu tidak valid." };
  }

  if (
    settings.preferredInstruments !== undefined &&
    (!Array.isArray(settings.preferredInstruments) ||
      !settings.preferredInstruments.every(isInvestmentType))
  ) {
    return { ok: false, message: "Settings instrumen pilihan tidak valid." };
  }

  if (
    settings.aprMoneyMarketFund !== undefined &&
    !isNonNegativeNumber(settings.aprMoneyMarketFund)
  ) {
    return { ok: false, message: "Settings APR RDPU tidak valid." };
  }

  return { ok: true, settings: normalizeSettings(settings, defaultSettings) };
}

function normalizeSettings(
  settings: Partial<UserSettings> | null,
  defaultSettings: UserSettings,
): UserSettings {
  const preferredInstruments = Array.isArray(settings?.preferredInstruments)
    ? settings.preferredInstruments.filter(isInvestmentType)
    : defaultSettings.preferredInstruments;

  return {
    ...defaultSettings,
    ...settings,
    capital: nonNegativeNumber(settings?.capital ?? defaultSettings.capital),
    riskTolerance: clampNumber(
      settings?.riskTolerance ?? defaultSettings.riskTolerance,
      5,
      30,
    ),
    timeHorizon: isTimeHorizon(settings?.timeHorizon)
      ? settings.timeHorizon
      : defaultSettings.timeHorizon,
    preferredInstruments,
    aprMoneyMarketFund: isNonNegativeNumber(settings?.aprMoneyMarketFund)
      ? settings.aprMoneyMarketFund
      : defaultSettings.aprMoneyMarketFund,
  };
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

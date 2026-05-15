"use client";

import type { User } from "@supabase/supabase-js";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type {
  InvestmentType,
  PortfolioItem,
  RiskCategory,
  SavedAnalysisResult,
  TimeHorizon,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";
import { requireSupabase } from "@/lib/supabase/auth";
import { clampNumber, nonNegativeNumber } from "@/lib/utils/format";

type HoldingRow = {
  id: string;
  local_id: string | null;
  name: string;
  type: InvestmentType;
  ticker: string | null;
  buy_price: number;
  quantity: number;
  current_price: number;
  buy_date: string;
  notes: string | null;
  risk_category: RiskCategory;
  data_source: PortfolioItem["dataSource"] | null;
  last_price_updated_at: string | null;
};

type WatchlistRow = {
  id: string;
  local_id: string | null;
  name: string;
  type: InvestmentType;
  target_buy_zone: string;
  notes: string | null;
  status: WatchlistItem["status"];
  data_source: WatchlistItem["dataSource"] | null;
  last_analyzed_at: string | null;
};

type SettingsRow = {
  capital: number | null;
  risk_tolerance: number | null;
  time_horizon: TimeHorizon | null;
  preferred_instruments: InvestmentType[] | null;
  apr_money_market_fund: number | null;
};

type AnalysisRow = {
  id: string;
  local_id: string | null;
  name: string;
  type: InvestmentType;
  ticker: string | null;
  result: SavedAnalysisResult["result"];
  price_source_label: string;
  is_mock_data: boolean;
  created_at: string;
};

export async function loadCloudPortfolio(user: User) {
  const supabase = requireSupabase();
  const portfolioId = await getOrCreateDefaultPortfolioId(user);
  const { data, error } = await supabase
    .from("holdings")
    .select("id,local_id,name,type,ticker,buy_price,quantity,current_price,buy_date,notes,risk_category,data_source,last_price_updated_at")
    .eq("user_id", user.id)
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as HoldingRow[]).map(rowToPortfolioItem);
}

export async function saveCloudPortfolio(user: User, items: PortfolioItem[]) {
  const supabase = requireSupabase();
  const portfolioId = await getOrCreateDefaultPortfolioId(user);
  const safeItems = normalizePortfolioForCloud(items);

  const { error: deleteError } = await supabase
    .from("holdings")
    .delete()
    .eq("user_id", user.id)
    .eq("portfolio_id", portfolioId);
  if (deleteError) throw deleteError;

  if (safeItems.length === 0) return { count: 0 };

  const rows = safeItems.map((item) => ({
    user_id: user.id,
    portfolio_id: portfolioId,
    local_id: item.id,
    name: safeText(item.name, "Untitled holding"),
    type: item.type,
    ticker: item.ticker?.trim() ?? "",
    buy_price: item.buyPrice,
    quantity: item.quantity,
    current_price: item.currentPrice,
    buy_date: safeDate(item.buyDate),
    notes: nullableText(item.notes),
    risk_category: item.riskCategory,
    data_source: item.dataSource ?? "manual_input",
    last_price_updated_at: safeTimestamp(item.lastPriceUpdatedAt),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("holdings").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

export async function loadCloudWatchlist(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("id,local_id,name,type,target_buy_zone,notes,status,data_source,last_analyzed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as WatchlistRow[]).map(rowToWatchlistItem);
}

export async function saveCloudWatchlist(user: User, items: WatchlistItem[]) {
  const supabase = requireSupabase();
  const safeItems = normalizeWatchlistForCloud(items);
  const { error: deleteError } = await supabase.from("watchlist_items").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;

  if (safeItems.length === 0) return { count: 0 };

  const rows = safeItems.map((item) => ({
    user_id: user.id,
    local_id: item.id,
    name: safeText(item.name, "Untitled watchlist item"),
    type: item.type,
    target_buy_zone: safeText(item.targetBuyZone, "-"),
    notes: nullableText(item.notes),
    status: item.status,
    data_source: item.dataSource ?? "manual_input",
    last_analyzed_at: safeTimestamp(item.lastAnalyzedAt),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("watchlist_items").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

export async function loadCloudSettings(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("user_settings")
    .select("capital,risk_tolerance,time_horizon,preferred_instruments,apr_money_market_fund")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToSettings(data as SettingsRow);
}

export async function saveCloudSettings(user: User, settings: UserSettings) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    capital: settings.capital,
    risk_tolerance: settings.riskTolerance,
    time_horizon: settings.timeHorizon,
    preferred_instruments: settings.preferredInstruments,
    apr_money_market_fund: settings.aprMoneyMarketFund ?? DEFAULT_USER_SETTINGS.aprMoneyMarketFund,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadCloudAnalysisResults(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("analysis_results")
    .select("id,local_id,name,type,ticker,result,price_source_label,is_mock_data,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as AnalysisRow[]).map(rowToSavedAnalysis);
}

export async function saveCloudAnalysisResult(user: User, item: SavedAnalysisResult) {
  const supabase = requireSupabase();
  const safeItem = normalizeAnalysisResultForCloud(item, new Set());
  const { error } = await supabase.from("analysis_results").upsert({
    user_id: user.id,
    local_id: safeItem.id,
    name: safeText(safeItem.name, "Untitled analysis"),
    type: safeItem.type,
    ticker: nullableText(safeItem.ticker),
    result: toJson(safeItem.result),
    price_source_label: safeText(safeItem.priceSourceLabel, "Data tidak diketahui"),
    is_mock_data: Boolean(safeItem.isMockData),
    created_at: safeTimestamp(safeItem.createdAt) ?? new Date().toISOString(),
  }, { onConflict: "user_id,local_id" });
  if (error) throw error;
}

export async function saveCloudAnalysisResults(user: User, items: SavedAnalysisResult[]) {
  const supabase = requireSupabase();
  const safeItems = normalizeAnalysisResultsForCloud(items);

  const { error: deleteError } = await supabase.from("analysis_results").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;

  if (safeItems.length === 0) return { count: 0 };

  const rows = safeItems.map((item) => ({
    user_id: user.id,
    local_id: item.id,
    name: safeText(item.name, "Untitled analysis"),
    type: item.type,
    ticker: nullableText(item.ticker),
    result: toJson(item.result),
    price_source_label: safeText(item.priceSourceLabel, "Data tidak diketahui"),
    is_mock_data: Boolean(item.isMockData),
    created_at: safeTimestamp(item.createdAt) ?? new Date().toISOString(),
  }));

  const { error } = await supabase.from("analysis_results").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

export async function syncLocalDataToCloud(user: User) {
  const portfolio = localArahDanaStorage.readPortfolio() ?? [];
  const watchlist = localArahDanaStorage.readWatchlist() ?? [];
  const settings = normalizeSettings(localArahDanaStorage.readSettings());
  const analysisResults = localArahDanaStorage.readAnalysisResults() ?? [];

  const results = await Promise.allSettled([
    saveCloudPortfolio(user, portfolio),
    saveCloudWatchlist(user, watchlist),
    saveCloudSettings(user, settings).then(() => ({ count: 1 })),
    saveCloudAnalysisResults(user, analysisResults),
  ]);

  const failures = results
    .map((result, index) => {
      if (result.status === "fulfilled") return null;
      return `${syncStepLabels[index]}: ${formatSupabaseError(result.reason)}`;
    })
    .filter(Boolean);

  if (failures.length > 0) {
    throw new Error(
      `Sebagian sync gagal. ${failures.join(" ")} Pastikan supabase/arahdana-schema.sql sudah dijalankan ulang di SQL Editor.`,
    );
  }

  return {
    portfolioCount: results[0].status === "fulfilled" ? results[0].value.count : 0,
    watchlistCount: results[1].status === "fulfilled" ? results[1].value.count : 0,
    analysisCount: results[3].status === "fulfilled" ? results[3].value.count : 0,
  };
}

const syncStepLabels = ["Portofolio", "Watchlist", "Settings", "Hasil analisis"];

async function getOrCreateDefaultPortfolioId(user: User) {
  const supabase = requireSupabase();
  const { data: existing, error: selectError } = await supabase
    .from("portfolios")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Default")
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: user.id,
      name: "Default",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

function rowToPortfolioItem(row: HoldingRow): PortfolioItem {
  return {
    id: row.local_id ?? row.id,
    name: row.name,
    type: row.type,
    ticker: row.ticker ?? "",
    buyPrice: nonNegativeNumber(row.buy_price),
    quantity: nonNegativeNumber(row.quantity),
    currentPrice: nonNegativeNumber(row.current_price),
    buyDate: row.buy_date,
    notes: row.notes ?? "",
    riskCategory: row.risk_category,
    dataSource: row.data_source ?? "manual_input",
    lastPriceUpdatedAt: row.last_price_updated_at ?? undefined,
  };
}

function rowToWatchlistItem(row: WatchlistRow): WatchlistItem {
  return {
    id: row.local_id ?? row.id,
    name: row.name,
    type: row.type,
    targetBuyZone: row.target_buy_zone,
    notes: row.notes ?? "",
    status: row.status,
    dataSource: row.data_source ?? "manual_input",
    lastAnalyzedAt: row.last_analyzed_at ?? undefined,
  };
}

function rowToSettings(row: SettingsRow): UserSettings {
  return normalizeSettings({
    capital: row.capital ?? undefined,
    riskTolerance: row.risk_tolerance ?? undefined,
    timeHorizon: row.time_horizon ?? undefined,
    preferredInstruments: Array.isArray(row.preferred_instruments) ? row.preferred_instruments : undefined,
    aprMoneyMarketFund: row.apr_money_market_fund ?? undefined,
  });
}

function rowToSavedAnalysis(row: AnalysisRow): SavedAnalysisResult {
  return {
    id: row.local_id ?? row.id,
    name: row.name,
    type: row.type,
    ticker: row.ticker ?? undefined,
    result: row.result,
    priceSourceLabel: row.price_source_label,
    isMockData: row.is_mock_data,
    createdAt: row.created_at,
  };
}

export function normalizeSettings(settings: Partial<UserSettings> | null | undefined): UserSettings {
  const preferredInstruments = Array.isArray(settings?.preferredInstruments)
    ? settings.preferredInstruments.filter(isInvestmentType)
    : DEFAULT_USER_SETTINGS.preferredInstruments;

  return {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    capital: nonNegativeNumber(settings?.capital ?? DEFAULT_USER_SETTINGS.capital),
    riskTolerance: clampNumber(settings?.riskTolerance ?? DEFAULT_USER_SETTINGS.riskTolerance, 5, 30),
    timeHorizon: isTimeHorizon(settings?.timeHorizon) ? settings.timeHorizon : DEFAULT_USER_SETTINGS.timeHorizon,
    preferredInstruments,
    aprMoneyMarketFund:
      typeof settings?.aprMoneyMarketFund === "number" && Number.isFinite(settings.aprMoneyMarketFund)
        ? nonNegativeNumber(settings.aprMoneyMarketFund)
        : DEFAULT_USER_SETTINGS.aprMoneyMarketFund,
  };
}

function isTimeHorizon(value: unknown): value is TimeHorizon {
  return value === "short" || value === "medium" || value === "long";
}

function isInvestmentType(value: unknown): value is InvestmentType {
  return (
    value === "stock" ||
    value === "cash_savings" ||
    value === "money_market_fund" ||
    value === "bond_fund" ||
    value === "equity_fund" ||
    value === "mixed_fund" ||
    value === "bond"
  );
}

function normalizePortfolioForCloud(items: PortfolioItem[]) {
  const seenIds = new Set<string>();

  return items
    .filter((item) => isInvestmentType(item.type))
    .map((item) => {
      const id = uniqueLocalId(item.id, seenIds);
      return {
        ...item,
        id,
        name: safeText(item.name, "Untitled holding"),
        buyPrice: nonNegativeNumber(item.buyPrice),
        quantity: nonNegativeNumber(item.quantity),
        currentPrice: nonNegativeNumber(item.currentPrice),
        buyDate: safeDate(item.buyDate),
        riskCategory: isRiskCategory(item.riskCategory) ? item.riskCategory : "medium",
        dataSource: item.dataSource ?? "manual_input",
      };
    });
}

function normalizeWatchlistForCloud(items: WatchlistItem[]) {
  const seenIds = new Set<string>();

  return items
    .filter((item) => isInvestmentType(item.type))
    .map((item) => {
      const id = uniqueLocalId(item.id, seenIds);
      return {
        ...item,
        id,
        name: safeText(item.name, "Untitled watchlist item"),
        targetBuyZone: safeText(item.targetBuyZone, "-"),
        status: isWatchlistStatus(item.status) ? item.status : "watching",
        dataSource: item.dataSource ?? "manual_input",
      };
    });
}

function normalizeAnalysisResultsForCloud(items: SavedAnalysisResult[]) {
  const seenIds = new Set<string>();
  return items
    .filter((item) => isInvestmentType(item.type) && item.result)
    .map((item) => normalizeAnalysisResultForCloud(item, seenIds));
}

function normalizeAnalysisResultForCloud(item: SavedAnalysisResult, seenIds: Set<string>) {
  return {
    ...item,
    id: uniqueLocalId(item.id, seenIds),
    name: safeText(item.name, "Untitled analysis"),
    priceSourceLabel: safeText(item.priceSourceLabel, "Data tidak diketahui"),
    createdAt: safeTimestamp(item.createdAt) ?? new Date().toISOString(),
  };
}

function uniqueLocalId(value: string | undefined, seenIds: Set<string>) {
  let id = safeText(value, crypto.randomUUID());
  while (seenIds.has(id)) {
    id = crypto.randomUUID();
  }
  seenIds.add(id);
  return id;
}

function safeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function safeTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRiskCategory(value: unknown): value is RiskCategory {
  return value === "low" || value === "medium" || value === "high";
}

function isWatchlistStatus(value: unknown): value is WatchlistItem["status"] {
  return value === "watching" || value === "waiting" || value === "avoid" || value === "bought";
}

function formatSupabaseError(error: unknown) {
  if (error instanceof Error) return error.message;

  if (isRecord(error)) {
    const message = typeof error.message === "string" ? error.message : "";
    const details = typeof error.details === "string" ? error.details : "";
    const hint = typeof error.hint === "string" ? error.hint : "";
    const code = typeof error.code === "string" ? ` (${error.code})` : "";
    const combined = [message, details, hint].filter(Boolean).join(" ");
    if (combined) return `${combined}${code}`;
  }

  return "Kesalahan Supabase tidak diketahui.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

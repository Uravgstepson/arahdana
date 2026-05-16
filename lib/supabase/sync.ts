"use client";

import type { User } from "@supabase/supabase-js";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type {
  AlertRule,
  FinancialGoal,
  InvestmentType,
  GoalContribution,
  PortfolioItem,
  PortfolioReviewReport,
  RiskCategory,
  SavedAnalysisResult,
  TimeHorizon,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";
import { requireSupabase } from "@/lib/supabase/auth";
import { clampNumber, nonNegativeNumber } from "@/lib/utils/format";
import { normalizeNotificationPreferences } from "@/lib/notifications/notificationSystem";

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
  notification_preferences?: UserSettings["notificationPreferences"] | null;
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

type GoalRow = {
  id: string;
  local_id: string | null;
  category: FinancialGoal["category"];
  name: string;
  target_amount: number;
  target_date: string;
  monthly_contribution: number;
  risk_tolerance: number;
  risk_profile: FinancialGoal["riskProfile"];
  preferred_instruments: InvestmentType[] | null;
  linked_holding_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

type GoalContributionRow = {
  id: string;
  local_id: string | null;
  goal_local_id: string;
  amount: number;
  contribution_month: string;
  note: string | null;
  created_at: string;
};

type AlertRuleRow = {
  id: string;
  local_id: string | null;
  name: string;
  ticker: string | null;
  instrument_name: string | null;
  alert_type: AlertRule["alertType"];
  target_price: number | null;
  buy_zone_from: number | null;
  buy_zone_to: number | null;
  risk_threshold: number | null;
  volatility_threshold: number | null;
  loss_threshold: number | null;
  allocation_threshold: number | null;
  enabled: boolean;
  notes: string | null;
  source_type: AlertRule["sourceType"];
  source_id: string | null;
  last_checked_at: string | null;
  last_triggered_at: string | null;
  last_check_status: AlertRule["lastCheckStatus"] | null;
  last_check_message: string | null;
  last_observed_verdict: AlertRule["lastObservedVerdict"] | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  local_id: string | null;
  report_type: PortfolioReviewReport["type"];
  title: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  report: PortfolioReviewReport;
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
    .select("capital,risk_tolerance,time_horizon,preferred_instruments,apr_money_market_fund,notification_preferences")
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
    notification_preferences: settings.notificationPreferences ?? DEFAULT_USER_SETTINGS.notificationPreferences,
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

export async function loadCloudGoals(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("financial_goals")
    .select("id,local_id,category,name,target_amount,target_date,monthly_contribution,risk_tolerance,risk_profile,preferred_instruments,linked_holding_ids,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as GoalRow[]).map(rowToGoal);
}

export async function saveCloudGoals(user: User, items: FinancialGoal[]) {
  const supabase = requireSupabase();
  const safeItems = normalizeGoalsForCloud(items);

  const { error: deleteError } = await supabase.from("financial_goals").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;

  if (safeItems.length === 0) return { count: 0 };

  const rows = safeItems.map((goal) => ({
    user_id: user.id,
    local_id: goal.id,
    category: goal.category,
    name: safeText(goal.name, "Tujuan finansial"),
    target_amount: goal.targetAmount,
    target_date: safeDate(goal.targetDate),
    monthly_contribution: goal.monthlyContribution,
    risk_tolerance: clampNumber(goal.riskTolerance, 5, 30),
    risk_profile: goal.riskProfile,
    preferred_instruments: goal.preferredInstruments,
    linked_holding_ids: goal.linkedHoldingIds,
    created_at: safeTimestamp(goal.createdAt) ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("financial_goals").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

export async function loadCloudGoalContributions(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("goal_contributions")
    .select("id,local_id,goal_local_id,amount,contribution_month,note,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as GoalContributionRow[]).map(rowToGoalContribution);
}

export async function saveCloudGoalContributions(user: User, items: GoalContribution[]) {
  const supabase = requireSupabase();
  const safeItems = normalizeGoalContributionsForCloud(items);

  const { error: deleteError } = await supabase.from("goal_contributions").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;

  if (safeItems.length === 0) return { count: 0 };

  const rows = safeItems.map((item) => ({
    user_id: user.id,
    local_id: item.id,
    goal_local_id: item.goalId,
    amount: item.amount,
    contribution_month: safeMonth(item.contributionMonth),
    note: nullableText(item.note),
    created_at: safeTimestamp(item.createdAt) ?? new Date().toISOString(),
  }));

  const { error } = await supabase.from("goal_contributions").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

export async function loadCloudAlertRules(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("id,local_id,name,ticker,instrument_name,alert_type,target_price,buy_zone_from,buy_zone_to,risk_threshold,volatility_threshold,loss_threshold,allocation_threshold,enabled,notes,source_type,source_id,last_checked_at,last_triggered_at,last_check_status,last_check_message,last_observed_verdict,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as AlertRuleRow[]).map(rowToAlertRule);
}

export async function saveCloudAlertRules(user: User, items: AlertRule[]) {
  const supabase = requireSupabase();
  const safeItems = normalizeAlertRulesForCloud(items);
  const { error: deleteError } = await supabase.from("alert_rules").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;

  if (safeItems.length === 0) return { count: 0 };

  const rows = safeItems.map((item) => ({
    user_id: user.id,
    local_id: item.id,
    name: safeText(item.name, "Alert"),
    ticker: nullableText(item.ticker),
    instrument_name: nullableText(item.instrumentName),
    alert_type: item.alertType,
    target_price: nullableNumber(item.targetPrice),
    buy_zone_from: nullableNumber(item.buyZoneFrom),
    buy_zone_to: nullableNumber(item.buyZoneTo),
    risk_threshold: nullableNumber(item.riskThreshold),
    volatility_threshold: nullableNumber(item.volatilityThreshold),
    loss_threshold: nullableNumber(item.lossThreshold),
    allocation_threshold: nullableNumber(item.allocationThreshold),
    enabled: item.enabled,
    notes: nullableText(item.notes),
    source_type: item.sourceType,
    source_id: nullableText(item.sourceId),
    last_checked_at: safeTimestamp(item.lastCheckedAt),
    last_triggered_at: safeTimestamp(item.lastTriggeredAt),
    last_check_status: isAlertCheckStatus(item.lastCheckStatus) ? item.lastCheckStatus : null,
    last_check_message: nullableText(item.lastCheckMessage),
    last_observed_verdict: isVerdict(item.lastObservedVerdict) ? item.lastObservedVerdict : null,
    created_at: safeTimestamp(item.createdAt) ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("alert_rules").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

export async function loadCloudReports(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("portfolio_reports")
    .select("id,local_id,report_type,title,period_start,period_end,generated_at,report")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ReportRow[]).map(rowToReport);
}

export async function saveCloudReports(user: User, items: PortfolioReviewReport[]) {
  const supabase = requireSupabase();
  const safeItems = normalizeReportsForCloud(items);
  const { error: deleteError } = await supabase.from("portfolio_reports").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;

  if (safeItems.length === 0) return { count: 0 };

  const rows = safeItems.map((item) => ({
    user_id: user.id,
    local_id: item.id,
    report_type: item.type,
    title: safeText(item.title, "Portfolio review"),
    period_start: safeTimestamp(item.periodStart) ?? new Date().toISOString(),
    period_end: safeTimestamp(item.periodEnd) ?? new Date().toISOString(),
    generated_at: safeTimestamp(item.generatedAt) ?? new Date().toISOString(),
    report: toJson(item),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("portfolio_reports").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}

export async function syncLocalDataToCloud(user: User) {
  const portfolio = localArahDanaStorage.readPortfolio() ?? [];
  const watchlist = localArahDanaStorage.readWatchlist() ?? [];
  const settings = normalizeSettings(localArahDanaStorage.readSettings());
  const analysisResults = localArahDanaStorage.readAnalysisResults() ?? [];
  const goals = localArahDanaStorage.readGoals() ?? [];
  const goalContributions = localArahDanaStorage.readGoalContributions() ?? [];
  const alertRules = localArahDanaStorage.readAlertRules() ?? [];
  const reports = localArahDanaStorage.readReports() ?? [];

  const results = await Promise.allSettled([
    saveCloudPortfolio(user, portfolio),
    saveCloudWatchlist(user, watchlist),
    saveCloudSettings(user, settings).then(() => ({ count: 1 })),
    saveCloudAnalysisResults(user, analysisResults),
    saveCloudGoals(user, goals),
    saveCloudGoalContributions(user, goalContributions),
    saveCloudAlertRules(user, alertRules),
    saveCloudReports(user, reports),
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
    goalCount: results[4].status === "fulfilled" ? results[4].value.count : 0,
    goalContributionCount: results[5].status === "fulfilled" ? results[5].value.count : 0,
    alertRuleCount: results[6].status === "fulfilled" ? results[6].value.count : 0,
    reportCount: results[7].status === "fulfilled" ? results[7].value.count : 0,
  };
}

const syncStepLabels = [
  "Portofolio",
  "Watchlist",
  "Settings",
  "Hasil analisis",
  "Tujuan finansial",
  "Kontribusi tujuan",
  "Alert",
  "Laporan",
];

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
    notificationPreferences: row.notification_preferences ?? undefined,
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

function rowToGoal(row: GoalRow): FinancialGoal {
  return normalizeGoal({
    id: row.local_id ?? row.id,
    category: row.category,
    name: row.name,
    targetAmount: nonNegativeNumber(row.target_amount),
    targetDate: row.target_date,
    monthlyContribution: nonNegativeNumber(row.monthly_contribution),
    riskTolerance: clampNumber(row.risk_tolerance, 5, 30),
    riskProfile: row.risk_profile,
    preferredInstruments: Array.isArray(row.preferred_instruments) ? row.preferred_instruments : [],
    linkedHoldingIds: Array.isArray(row.linked_holding_ids) ? row.linked_holding_ids : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function rowToGoalContribution(row: GoalContributionRow): GoalContribution {
  return normalizeGoalContribution({
    id: row.local_id ?? row.id,
    goalId: row.goal_local_id,
    amount: nonNegativeNumber(row.amount),
    contributionMonth: row.contribution_month,
    note: row.note ?? "",
    createdAt: row.created_at,
  });
}

function rowToAlertRule(row: AlertRuleRow): AlertRule {
  return normalizeAlertRule({
    id: row.local_id ?? row.id,
    name: row.name,
    ticker: row.ticker ?? "",
    instrumentName: row.instrument_name ?? "",
    alertType: row.alert_type,
    targetPrice: row.target_price ?? undefined,
    buyZoneFrom: row.buy_zone_from ?? undefined,
    buyZoneTo: row.buy_zone_to ?? undefined,
    riskThreshold: row.risk_threshold ?? undefined,
    volatilityThreshold: row.volatility_threshold ?? undefined,
    lossThreshold: row.loss_threshold ?? undefined,
    allocationThreshold: row.allocation_threshold ?? undefined,
    enabled: row.enabled,
    notes: row.notes ?? "",
    sourceType: row.source_type,
    sourceId: row.source_id ?? undefined,
    lastCheckedAt: row.last_checked_at ?? undefined,
    lastTriggeredAt: row.last_triggered_at ?? undefined,
    lastCheckStatus: row.last_check_status ?? undefined,
    lastCheckMessage: row.last_check_message ?? undefined,
    lastObservedVerdict: row.last_observed_verdict ?? undefined,
    createdAt: row.created_at,
  });
}

function rowToReport(row: ReportRow): PortfolioReviewReport {
  return normalizeReport({
    ...row.report,
    id: row.report?.id ?? row.local_id ?? row.id,
    type: row.report?.type ?? row.report_type,
    title: row.report?.title ?? row.title,
    periodStart: row.report?.periodStart ?? row.period_start,
    periodEnd: row.report?.periodEnd ?? row.period_end,
    generatedAt: row.report?.generatedAt ?? row.generated_at,
  });
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
    notificationPreferences: normalizeNotificationPreferences(settings?.notificationPreferences),
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

function normalizeGoalsForCloud(items: FinancialGoal[]) {
  const seenIds = new Set<string>();
  return items.map((item) => normalizeGoal({ ...item, id: uniqueLocalId(item.id, seenIds) }));
}

function normalizeGoalContributionsForCloud(items: GoalContribution[]) {
  const seenIds = new Set<string>();
  return items.map((item) =>
    normalizeGoalContribution({ ...item, id: uniqueLocalId(item.id, seenIds) }),
  );
}

function normalizeAlertRulesForCloud(items: AlertRule[]) {
  const seenIds = new Set<string>();
  return items.map((item) => normalizeAlertRule({ ...item, id: uniqueLocalId(item.id, seenIds) }));
}

function normalizeReportsForCloud(items: PortfolioReviewReport[]) {
  const seenIds = new Set<string>();
  return items.map((item) => normalizeReport({ ...item, id: uniqueLocalId(item.id, seenIds) }));
}

function normalizeGoal(goal: FinancialGoal): FinancialGoal {
  const riskTolerance = clampNumber(goal.riskTolerance, 5, 30);
  return {
    ...goal,
    id: safeText(goal.id, crypto.randomUUID()),
    category: isGoalCategory(goal.category) ? goal.category : "custom",
    name: safeText(goal.name, "Tujuan finansial"),
    targetAmount: nonNegativeNumber(goal.targetAmount),
    targetDate: safeDate(goal.targetDate),
    monthlyContribution: nonNegativeNumber(goal.monthlyContribution),
    riskTolerance,
    riskProfile: isGoalRiskProfile(goal.riskProfile)
      ? goal.riskProfile
      : riskTolerance <= 10
        ? "defensive"
        : riskTolerance <= 20
          ? "balanced"
          : "aggressive",
    preferredInstruments: Array.isArray(goal.preferredInstruments)
      ? goal.preferredInstruments.filter(isInvestmentType)
      : [],
    linkedHoldingIds: Array.isArray(goal.linkedHoldingIds)
      ? goal.linkedHoldingIds.filter((value) => typeof value === "string" && value.trim())
      : [],
    createdAt: safeTimestamp(goal.createdAt) ?? new Date().toISOString(),
    updatedAt: safeTimestamp(goal.updatedAt) ?? new Date().toISOString(),
  };
}

function normalizeGoalContribution(item: GoalContribution): GoalContribution {
  return {
    ...item,
    id: safeText(item.id, crypto.randomUUID()),
    goalId: safeText(item.goalId, ""),
    amount: nonNegativeNumber(item.amount),
    contributionMonth: safeMonth(item.contributionMonth),
    note: nullableText(item.note) ?? "",
    createdAt: safeTimestamp(item.createdAt) ?? new Date().toISOString(),
  };
}

function normalizeAlertRule(item: AlertRule): AlertRule {
  return {
    ...item,
    id: safeText(item.id, crypto.randomUUID()),
    name: safeText(item.name, "Alert"),
    ticker: item.ticker?.trim() ?? "",
    instrumentName: item.instrumentName?.trim() ?? "",
    alertType: isAlertType(item.alertType) ? item.alertType : "price_below",
    targetPrice: optionalNonNegativeNumber(item.targetPrice),
    buyZoneFrom: optionalNonNegativeNumber(item.buyZoneFrom),
    buyZoneTo: optionalNonNegativeNumber(item.buyZoneTo),
    riskThreshold: optionalNonNegativeNumber(item.riskThreshold),
    volatilityThreshold: optionalNonNegativeNumber(item.volatilityThreshold),
    lossThreshold: optionalNonNegativeNumber(item.lossThreshold),
    allocationThreshold: optionalNonNegativeNumber(item.allocationThreshold),
    enabled: Boolean(item.enabled),
    notes: item.notes ?? "",
    sourceType: isAlertSourceType(item.sourceType) ? item.sourceType : "manual",
    sourceId: item.sourceId?.trim() || undefined,
    lastCheckedAt: safeTimestamp(item.lastCheckedAt) ?? undefined,
    lastTriggeredAt: safeTimestamp(item.lastTriggeredAt) ?? undefined,
    lastCheckStatus: isAlertCheckStatus(item.lastCheckStatus) ? item.lastCheckStatus : undefined,
    lastCheckMessage: item.lastCheckMessage ?? undefined,
    lastObservedVerdict: isVerdict(item.lastObservedVerdict) ? item.lastObservedVerdict : undefined,
    createdAt: safeTimestamp(item.createdAt) ?? new Date().toISOString(),
  };
}

function normalizeReport(item: PortfolioReviewReport): PortfolioReviewReport {
  const generatedAt = safeTimestamp(item.generatedAt) ?? new Date().toISOString();
  return {
    ...item,
    id: safeText(item.id, crypto.randomUUID()),
    type: isReportType(item.type) ? item.type : "monthly",
    title: safeText(item.title, "Portfolio review"),
    periodStart: safeTimestamp(item.periodStart) ?? generatedAt,
    periodEnd: safeTimestamp(item.periodEnd) ?? generatedAt,
    generatedAt,
    summary: safeText(item.summary, "Laporan portofolio tersimpan."),
    portfolioValue: nonNegativeNumber(item.portfolioValue),
    investedValue: nonNegativeNumber(item.investedValue),
    gainLoss: typeof item.gainLoss === "number" && Number.isFinite(item.gainLoss) ? item.gainLoss : 0,
    gainLossPercent:
      typeof item.gainLossPercent === "number" && Number.isFinite(item.gainLossPercent)
        ? item.gainLossPercent
        : 0,
    healthScore: clampNumber(item.healthScore, 0, 100),
    allocation: Array.isArray(item.allocation) ? item.allocation : [],
    riskExposure: item.riskExposure ?? {
      stablePercent: 0,
      bondPercent: 0,
      equityPercent: 0,
      highRiskPercent: 0,
      concentrationPercent: 0,
    },
    dcaSummary: item.dcaSummary ?? {
      contributionCount: 0,
      totalContribution: 0,
      averageContribution: 0,
    },
    goalSummary: item.goalSummary ?? {
      activeGoals: 0,
      averageProgressPercent: 0,
      goalsOnTrack: 0,
    },
    journalInsights: Array.isArray(item.journalInsights) ? item.journalInsights : [],
    majorAlerts: Array.isArray(item.majorAlerts) ? item.majorAlerts : [],
    analysis: item.analysis ?? {
      improved: [],
      worsened: [],
      watch: [],
      consistent: [],
      tooRisky: [],
    },
    scores: item.scores ?? {
      discipline: 0,
      diversification: 0,
      riskManagement: 0,
      consistency: 0,
    },
    sourceCounts: item.sourceCounts ?? {
      holdings: 0,
      analyzerResults: 0,
      goals: 0,
      alerts: 0,
    },
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

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? nonNegativeNumber(value) : null;
}

function optionalNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? nonNegativeNumber(value) : undefined;
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

function safeMonth(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 7);
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

function isVerdict(value: unknown): value is AlertRule["lastObservedVerdict"] {
  return value === "BUY" || value === "WAIT" || value === "AVOID";
}

function isAlertCheckStatus(value: unknown): value is AlertRule["lastCheckStatus"] {
  return value === "ok" || value === "triggered" || value === "error";
}

function isAlertSourceType(value: unknown): value is AlertRule["sourceType"] {
  return value === "watchlist" || value === "portfolio" || value === "manual";
}

function isAlertType(value: unknown): value is AlertRule["alertType"] {
  return (
    value === "price_below" ||
    value === "price_above" ||
    value === "near_buy_zone" ||
    value === "verdict_buy" ||
    value === "verdict_avoid" ||
    value === "high_volatility" ||
    value === "risk_score_worsens" ||
    value === "portfolio_loss" ||
    value === "concentration_risk"
  );
}

function isReportType(value: unknown): value is PortfolioReviewReport["type"] {
  return value === "weekly" || value === "monthly" || value === "quarterly";
}

function isWatchlistStatus(value: unknown): value is WatchlistItem["status"] {
  return value === "watching" || value === "waiting" || value === "avoid" || value === "bought";
}

function isGoalCategory(value: unknown): value is FinancialGoal["category"] {
  return (
    value === "emergency_fund" ||
    value === "education" ||
    value === "motorcycle" ||
    value === "car" ||
    value === "house" ||
    value === "retirement" ||
    value === "custom"
  );
}

function isGoalRiskProfile(value: unknown): value is FinancialGoal["riskProfile"] {
  return value === "defensive" || value === "balanced" || value === "aggressive";
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

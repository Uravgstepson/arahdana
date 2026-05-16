"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AlertRule,
  AlertType,
  FinancialGoal,
  GoalContribution,
  PortfolioItem,
  SavedAnalysisResult,
  SmartAlert,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";
import { LoadingState } from "@/components/AppState";
import { useAuth } from "@/components/AuthProvider";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { loadCloudAlertRules, saveCloudAlertRules } from "@/lib/supabase/sync";
import { nonNegativeNumber } from "@/lib/utils/format";
import { checkAllAlerts, createNotificationsFromAlerts } from "@/lib/alerts/checkAlerts";
import {
  generateSmartAlerts,
  generateSmartAlertsWithMarketData,
  smartAlertToNotification,
} from "@/lib/alerts/smartAlerts";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";

type AlertForm = Omit<AlertRule, "id" | "createdAt">;
type AlertMode = "auto" | "manual";

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  price_below: "Price Below Target",
  price_above: "Price Above Target",
  near_buy_zone: "Near Buy Zone",
  verdict_buy: "Verdict Changes to BUY",
  verdict_avoid: "Verdict Changes to AVOID",
  high_volatility: "High Volatility",
  risk_score_worsens: "Risk Score Worsens",
  portfolio_loss: "Portfolio Loss Exceeds %",
  concentration_risk: "Concentration Risk",
};

export default function AlertsPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [analysisResults, setAnalysisResults] = useState<SavedAnalysisResult[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [alertMode, setAlertMode] = useState<AlertMode>("auto");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState("");
  const [checkError, setCheckError] = useState("");
  const hasAppliedPrefill = useRef(false);

  const [form, setForm] = useState<AlertForm>(() => createEmptyForm());

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    window.setTimeout(() => {
      void (async () => {
        const [
          storedRules,
          storedPortfolio,
          storedWatchlist,
          storedAnalysisResults,
          storedGoals,
          storedGoalContributions,
        ] = [
          localArahDanaStorage.readAlertRules(),
          localArahDanaStorage.readPortfolio(),
          localArahDanaStorage.readWatchlist(),
          localArahDanaStorage.readAnalysisResults(),
          localArahDanaStorage.readGoals(),
          localArahDanaStorage.readGoalContributions(),
        ];
        const storedSettings = normalizeAlertSettings(localArahDanaStorage.readSettings());
        const localPortfolio = storedPortfolio ?? [];
        const localWatchlist = storedWatchlist ?? [];
        const localAnalysisResults = storedAnalysisResults ?? [];
        const localGoals = storedGoals ?? [];
        const localGoalContributions = storedGoalContributions ?? [];
        const localSmartAlerts = generateSmartAlerts({
          portfolio: localPortfolio,
          watchlist: localWatchlist,
          analysisResults: localAnalysisResults,
          goals: localGoals,
          goalContributions: localGoalContributions,
          settings: storedSettings,
        });

        if (!user) {
          if (!isMounted) return;
          setAlertRules(storedRules ?? []);
          setPortfolio(localPortfolio);
          setWatchlist(localWatchlist);
          setAnalysisResults(localAnalysisResults);
          setGoals(localGoals);
          setGoalContributions(localGoalContributions);
          setSettings(storedSettings);
          setSmartAlerts(localSmartAlerts);
          setIsHydrated(true);
          return;
        }

        try {
          const cloudRules = await loadCloudAlertRules(user);
          if (!isMounted) return;
          const nextRules = cloudRules.length > 0 ? cloudRules : storedRules ?? [];
          setAlertRules(nextRules);
          localArahDanaStorage.writeAlertRules(nextRules);
        } catch (error) {
          if (!isMounted) return;
          setAlertRules(storedRules ?? []);
          console.error("Failed to load cloud alert rules:", error);
        } finally {
          setPortfolio(localPortfolio);
          setWatchlist(localWatchlist);
          setAnalysisResults(localAnalysisResults);
          setGoals(localGoals);
          setGoalContributions(localGoalContributions);
          setSettings(storedSettings);
          setSmartAlerts(localSmartAlerts);
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isHydrated || hasAppliedPrefill.current) return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    const id = params.get("id");
    const type = params.get("type");
    if (!source || !id) return;

    const prefilled = createPrefilledForm(source, id, watchlist, portfolio, type);
    if (!prefilled) return;

    hasAppliedPrefill.current = true;
    window.setTimeout(() => {
      setEditingId(null);
      setForm(prefilled);
      setIsFormOpen(true);
    }, 0);
  }, [isHydrated, portfolio, watchlist]);

  // Auto-save to cloud and local
  useEffect(() => {
    if (!isHydrated) return;
    localArahDanaStorage.writeAlertRules(alertRules);
    if (!user) return;

    void saveCloudAlertRules(user, alertRules).catch((error) => {
      console.error("Failed to save alert rules to cloud:", error);
    });
  }, [isHydrated, alertRules, user]);

  async function checkAlertsNow() {
    setIsChecking(true);
    setCheckMessage("");
    setCheckError("");

    try {
      const settings = normalizeAlertSettings(localArahDanaStorage.readSettings());
      const results = await checkAllAlerts(alertRules, portfolio, watchlist, { settings });
      const triggeredCount = results.filter((r) => r.triggered).length;
      const failedCount = results.filter((r) => r.status === "error").length;

      if (triggeredCount > 0) {
        const notifications = createNotificationsFromAlerts(results);
        const storedNotifications = localArahDanaStorage.readNotifications() ?? [];
        localArahDanaStorage.writeNotifications([...notifications, ...storedNotifications]);
        window.dispatchEvent(new Event("arahdana:notifications-updated"));
        setCheckMessage(
          `${triggeredCount} alert${triggeredCount !== 1 ? "s" : ""} triggered. Check notifications.`,
        );
      } else {
        setCheckMessage("All alerts checked. No alerts triggered.");
      }
      if (failedCount > 0) {
        setCheckError(`${failedCount} alert${failedCount !== 1 ? "s" : ""} could not be checked. Existing data was left unchanged.`);
      }

      setLastCheckTime(new Date().toISOString());

      const updatedRules = alertRules.map((rule) => {
        const result = results.find((r) => r.ruleId === rule.id);
        return result
          ? {
              ...rule,
              lastCheckedAt: result.checkedAt,
              lastTriggeredAt: result.triggered ? result.checkedAt : rule.lastTriggeredAt,
              lastCheckStatus: result.status,
              lastCheckMessage: result.message,
              lastObservedVerdict: result.observedVerdict ?? rule.lastObservedVerdict,
            }
          : { ...rule, lastCheckedAt: new Date().toISOString() };
      });
      setAlertRules(updatedRules);
    } catch (error) {
      setCheckError(
        error instanceof Error ? error.message : "Failed to check alerts",
      );
    } finally {
      setIsChecking(false);
    }
  }

  async function runSmartCheck() {
    setIsChecking(true);
    setCheckMessage("");
    setCheckError("");

    try {
      const latestPortfolio = localArahDanaStorage.readPortfolio() ?? portfolio;
      const latestWatchlist = localArahDanaStorage.readWatchlist() ?? watchlist;
      const latestAnalysisResults =
        localArahDanaStorage.readAnalysisResults() ?? analysisResults;
      const latestGoals = localArahDanaStorage.readGoals() ?? goals;
      const latestGoalContributions =
        localArahDanaStorage.readGoalContributions() ?? goalContributions;
      const latestSettings = normalizeAlertSettings(localArahDanaStorage.readSettings());
      const smartCheck = await generateSmartAlertsWithMarketData({
        portfolio: latestPortfolio,
        watchlist: latestWatchlist,
        analysisResults: latestAnalysisResults,
        goals: latestGoals,
        goalContributions: latestGoalContributions,
        settings: latestSettings,
      });
      const generatedAlerts = smartCheck.alerts;
      const importantNotifications = generatedAlerts
        .filter((alert) => alert.urgency === "high")
        .map(smartAlertToNotification);

      if (importantNotifications.length > 0) {
        const storedNotifications = localArahDanaStorage.readNotifications() ?? [];
        const existingIds = new Set(storedNotifications.map((item) => item.id));
        localArahDanaStorage.writeNotifications([
          ...importantNotifications.filter((item) => !existingIds.has(item.id)),
          ...storedNotifications,
        ]);
        window.dispatchEvent(new Event("arahdana:notifications-updated"));
      }

      setPortfolio(latestPortfolio);
      setWatchlist(latestWatchlist);
      setAnalysisResults(latestAnalysisResults);
      setGoals(latestGoals);
      setGoalContributions(latestGoalContributions);
      setSettings(latestSettings);
      setSmartAlerts(generatedAlerts);
      setLastCheckTime(new Date().toISOString());
      setCheckMessage(
        generatedAlerts.length > 0
          ? `${generatedAlerts.length} smart signal${generatedAlerts.length !== 1 ? "s" : ""} found. High-urgency signals were sent to notifications.`
          : "Smart check complete. No major signals found right now.",
      );
      if (smartCheck.failedMarketChecks > 0) {
        setCheckError(
          `${smartCheck.failedMarketChecks} market check${smartCheck.failedMarketChecks !== 1 ? "s" : ""} could not be refreshed. Saved data was still reviewed.`,
        );
      }
    } catch (error) {
      setCheckError(
        error instanceof Error
          ? error.message
          : "Smart check could not run. Existing data was left unchanged.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  function createAlert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setCheckError("Alert name is required");
      return;
    }

    const newRule: AlertRule = {
      ...form,
      id: editingId ?? crypto.randomUUID(),
      createdAt: editingId
        ? alertRules.find((r) => r.id === editingId)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
    };

    if (editingId) {
      setAlertRules((current) =>
        current.map((rule) => (rule.id === editingId ? newRule : rule)),
      );
      setEditingId(null);
    } else {
      setAlertRules((current) => [newRule, ...current]);
    }

    setForm(createEmptyForm());
    setIsFormOpen(false);
    setCheckError("");
  }

  function startEditing(rule: AlertRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      ticker: rule.ticker ?? "",
      instrumentName: rule.instrumentName ?? "",
      alertType: rule.alertType,
      targetPrice: rule.targetPrice,
      buyZoneFrom: rule.buyZoneFrom,
      buyZoneTo: rule.buyZoneTo,
      riskThreshold: rule.riskThreshold,
      volatilityThreshold: rule.volatilityThreshold,
      lossThreshold: rule.lossThreshold,
      allocationThreshold: rule.allocationThreshold,
      enabled: rule.enabled,
      notes: rule.notes ?? "",
      sourceType: rule.sourceType,
      sourceId: rule.sourceId,
      lastCheckedAt: rule.lastCheckedAt,
      lastTriggeredAt: rule.lastTriggeredAt,
    });
    setIsFormOpen(true);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(createEmptyForm());
  }

  function deleteAlert(id: string) {
    setAlertRules((current) => current.filter((rule) => rule.id !== id));
    if (editingId === id) {
      cancelEditing();
    }
  }

  function toggleAlert(id: string) {
    setAlertRules((current) =>
      current.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    );
  }

  if (!isHydrated) {
    return <LoadingState title="Memuat alert" message="Mengambil data lokal dan cloud." />;
  }

  const enabledCount = alertRules.filter((r) => r.enabled).length;
  const highSmartCount = smartAlerts.filter((alert) => alert.urgency === "high").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="overflow-hidden rounded-[1.8rem] bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Alerts</h2>
            <p className="mt-2 text-sm text-white/60">
              Set up decision-support signals for your portfolio and watchlist.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <HeaderMetric
            label={alertMode === "auto" ? "Smart signals" : "Total rules"}
            value={alertMode === "auto" ? String(smartAlerts.length) : String(alertRules.length)}
            helper={alertMode === "auto" ? "System generated" : "All rules"}
          />
          <HeaderMetric
            label={alertMode === "auto" ? "High urgency" : "Active"}
            value={alertMode === "auto" ? String(highSmartCount) : String(enabledCount)}
            helper={
              alertMode === "auto"
                ? "Sent to notifications"
                : enabledCount === alertRules.length
                  ? "All active"
                  : "Some inactive"
            }
          />
          <HeaderMetric
            label="Last checked"
            value={lastCheckTime ? new Date(lastCheckTime).toLocaleTimeString() : "Never"}
            helper={lastCheckTime ? new Date(lastCheckTime).toLocaleDateString() : "No checks yet"}
          />
        </div>

        <div className="mt-5 grid gap-2 rounded-[1.2rem] bg-white/8 p-1.5 ring-1 ring-white/10 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAlertMode("auto")}
            className={`min-h-11 rounded-[0.9rem] px-4 text-sm font-semibold ${
              alertMode === "auto"
                ? "bg-white text-stone-950"
                : "text-white/72 hover:bg-white/10"
            }`}
          >
            Auto Mode recommended
          </button>
          <button
            type="button"
            onClick={() => setAlertMode("manual")}
            className={`min-h-11 rounded-[0.9rem] px-4 text-sm font-semibold ${
              alertMode === "manual"
                ? "bg-white text-stone-950"
                : "text-white/72 hover:bg-white/10"
            }`}
          >
            Manual Mode advanced
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {alertMode === "auto" ? (
            <button
              type="button"
              onClick={runSmartCheck}
              disabled={isChecking}
              className="min-h-12 rounded-[1rem] bg-emerald-400 px-5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChecking ? "Checking..." : "Run Smart Check"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(createEmptyForm());
                  setIsFormOpen((current) => !current);
                }}
                className="min-h-12 rounded-[1rem] bg-emerald-400 px-5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-emerald-300"
              >
                {isFormOpen && !editingId ? "Close" : "New Alert"}
              </button>
              <button
                type="button"
                onClick={checkAlertsNow}
                disabled={isChecking || alertRules.length === 0}
                className="min-h-12 rounded-[1rem] bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/12 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isChecking ? "Checking..." : "Check Alerts Now"}
              </button>
            </>
          )}
        </div>
      </section>

      {checkMessage ? (
        <div className="rounded-[1.2rem] bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          {checkMessage}
        </div>
      ) : null}

      {false && checkMessage && (
        <div className="rounded-[1.2rem] bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          ✓ {checkMessage}
        </div>
      )}

      {checkError ? (
        <div className="rounded-[1.2rem] bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          {checkError}
        </div>
      ) : null}

      {false && checkError && (
        <div className="rounded-[1.2rem] bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          ✗ {checkError}
        </div>
      )}

      {alertMode === "auto" ? (
        <SmartAlertsSection
          alerts={smartAlerts}
          onRun={runSmartCheck}
          isChecking={isChecking}
          settings={settings}
        />
      ) : (
        <>
          {isFormOpen && (
            <AlertForm
              form={form}
              isEditing={editingId !== null}
              onSubmit={createAlert}
              onCancel={cancelEditing}
              onChange={setForm}
              watchlist={watchlist}
              portfolio={portfolio}
            />
          )}

          <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-stone-950">Manual Alert Rules</h3>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                {alertRules.length} rule{alertRules.length !== 1 ? "s" : ""}
              </span>
            </div>

            {alertRules.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-stone-300 p-6 text-center">
                <h4 className="font-semibold text-stone-950">No manual alerts yet</h4>
                <p className="mt-1 text-sm text-stone-600">
                  Auto Mode covers common signals. Create a manual rule only when you need a specific condition.
                </p>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="mt-4 rounded-[1rem] bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  Create Alert
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {alertRules.map((rule) => (
                  <AlertRuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={() => startEditing(rule)}
                    onDelete={() => deleteAlert(rule.id)}
                    onToggle={() => toggleAlert(rule.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.25rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/52">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-white/50">{helper}</p>
    </div>
  );
}

function SmartAlertsSection({
  alerts,
  onRun,
  isChecking,
  settings,
}: {
  alerts: SmartAlert[];
  onRun: () => void;
  isChecking: boolean;
  settings: UserSettings;
}) {
  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-950">Auto Smart Alerts</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
            ArahDana monitors portfolio concentration, saved analyzer verdicts, goals,
            DCA rhythm, and your risk profile. These are decision-support signals,
            not financial advice.
          </p>
          <p className="mt-2 text-xs font-medium text-stone-500">
            Risk tolerance: {settings.riskTolerance}/100. Horizon: {settings.timeHorizon}.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={isChecking}
          className="min-h-11 rounded-[1rem] bg-stone-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isChecking ? "Checking..." : "Run Smart Check"}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-5 rounded-[1.2rem] border border-dashed border-stone-300 p-6 text-center">
          <h4 className="font-semibold text-stone-950">No smart signals yet</h4>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-stone-600">
            Run a check after adding portfolio, watchlist, analysis, or goal data.
            If market data is unavailable, ArahDana will keep existing data intact.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {alerts.map((alert) => (
            <SmartAlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </section>
  );
}

function SmartAlertCard({ alert }: { alert: SmartAlert }) {
  return (
    <article className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${urgencyClass(alert.urgency)}`}>
            {alert.urgency} urgency
          </span>
          <h4 className="mt-3 font-semibold text-stone-950">{alert.title}</h4>
          {alert.sourceLabel ? (
            <p className="mt-1 text-xs font-medium text-stone-500">{alert.sourceLabel}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
        <SignalBlock label="What happened" text={alert.whatHappened} />
        <SignalBlock label="Why it matters" text={alert.whyItMatters} />
        <SignalBlock label="Suggested action" text={alert.suggestedAction} />
      </div>
    </article>
  );
}

function SignalBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">{label}</p>
      <p className="mt-1 text-stone-700">{text}</p>
    </div>
  );
}

function urgencyClass(urgency: SmartAlert["urgency"]) {
  if (urgency === "high") return "bg-rose-100 text-rose-800";
  if (urgency === "medium") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function AlertForm({
  form,
  isEditing,
  onSubmit,
  onCancel,
  onChange,
  watchlist,
  portfolio,
}: {
  form: AlertForm;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onChange: (form: AlertForm) => void;
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-950 mb-4">
        {isEditing ? "Edit Alert" : "Create Alert Rule"}
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-stone-900">Alert Name *</label>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="e.g., BBCA Buy Zone Alert"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-stone-900">Alert Type *</label>
          <select
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={form.alertType}
            onChange={(e) => onChange({ ...form, alertType: e.target.value as AlertType })}
          >
            <option value="">Select type</option>
            {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-stone-900">Ticker</label>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={form.ticker}
            onChange={(e) => onChange({ ...form, ticker: e.target.value })}
            placeholder="BBCA.JK"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-stone-900">Instrument Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={form.instrumentName}
            onChange={(e) => onChange({ ...form, instrumentName: e.target.value })}
            placeholder="Bank Central Asia"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-stone-900">Link to saved item</label>
          <select
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={`${form.sourceType}:${form.sourceId ?? ""}`}
            onChange={(event) => {
              const [sourceType, sourceId] = event.target.value.split(":");
              if (sourceType === "watchlist") {
                const item = watchlist.find((watch) => watch.id === sourceId);
                onChange({
                  ...form,
                  sourceType: "watchlist",
                  sourceId,
                  ticker: form.ticker || item?.name || "",
                  instrumentName: form.instrumentName || item?.name || "",
                });
                return;
              }
              if (sourceType === "portfolio") {
                const item = portfolio.find((holding) => holding.id === sourceId);
                onChange({
                  ...form,
                  sourceType: "portfolio",
                  sourceId,
                  ticker: form.ticker || item?.ticker || item?.name || "",
                  instrumentName: form.instrumentName || item?.name || "",
                });
                return;
              }
              onChange({ ...form, sourceType: "manual", sourceId: undefined });
            }}
          >
            <option value="manual:">Manual rule</option>
            {watchlist.length > 0 ? <option disabled>Watchlist</option> : null}
            {watchlist.map((item) => (
              <option key={item.id} value={`watchlist:${item.id}`}>
                {item.name}
              </option>
            ))}
            {portfolio.length > 0 ? <option disabled>Portfolio</option> : null}
            {portfolio.map((item) => (
              <option key={item.id} value={`portfolio:${item.id}`}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Alerts are decision-support signals. They do not guarantee outcomes.
          </p>
        </div>

        {/* Conditional fields based on alert type */}
        {(form.alertType === "price_below" || form.alertType === "price_above") && (
          <div>
            <label className="text-sm font-semibold text-stone-900">Target Price</label>
            <input
              type="number"
              min="0"
              step="100"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              value={form.targetPrice || ""}
              onChange={(e) => onChange({ ...form, targetPrice: nonNegativeNumber(Number(e.target.value)) })}
            />
          </div>
        )}

        {form.alertType === "near_buy_zone" && (
          <>
            <div>
              <label className="text-sm font-semibold text-stone-900">Buy Zone From</label>
              <input
                type="number"
                min="0"
                step="100"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                value={form.buyZoneFrom || ""}
                onChange={(e) => onChange({ ...form, buyZoneFrom: nonNegativeNumber(Number(e.target.value)) })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-900">Buy Zone To</label>
              <input
                type="number"
                min="0"
                step="100"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                value={form.buyZoneTo || ""}
                onChange={(e) => onChange({ ...form, buyZoneTo: nonNegativeNumber(Number(e.target.value)) })}
              />
            </div>
          </>
        )}

        {form.alertType === "high_volatility" && (
          <div>
            <label className="text-sm font-semibold text-stone-900">Volatility Threshold (%)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              value={form.volatilityThreshold || ""}
              onChange={(e) => onChange({ ...form, volatilityThreshold: nonNegativeNumber(Number(e.target.value)) })}
            />
          </div>
        )}

        {form.alertType === "risk_score_worsens" && (
          <div>
            <label className="text-sm font-semibold text-stone-900">Risk Threshold (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              value={form.riskThreshold || ""}
              onChange={(e) => onChange({ ...form, riskThreshold: nonNegativeNumber(Number(e.target.value)) })}
            />
          </div>
        )}

        {form.alertType === "portfolio_loss" && (
          <div>
            <label className="text-sm font-semibold text-stone-900">Loss Threshold (%)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              value={form.lossThreshold || ""}
              onChange={(e) => onChange({ ...form, lossThreshold: nonNegativeNumber(Number(e.target.value)) })}
            />
          </div>
        )}

        {form.alertType === "concentration_risk" && (
          <div>
            <label className="text-sm font-semibold text-stone-900">Allocation Threshold (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              value={form.allocationThreshold ? form.allocationThreshold * 100 : ""}
              onChange={(e) => onChange({ ...form, allocationThreshold: nonNegativeNumber(Number(e.target.value)) / 100 })}
            />
          </div>
        )}

        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-stone-900">Notes</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder="Additional notes about this alert"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            id="enabled"
            checked={form.enabled}
            onChange={(e) => onChange({ ...form, enabled: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="enabled" className="text-sm font-semibold text-stone-900">
            Enable this alert
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-[1rem] bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          {isEditing ? "Update Alert" : "Create Alert"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[1rem] border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AlertRuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: AlertRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-[1.2rem] border p-4 ${rule.enabled ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-stone-950">{rule.name}</h4>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
              {ALERT_TYPE_LABELS[rule.alertType]}
            </span>
          </div>
          {rule.instrumentName && (
            <p className="mt-1 text-sm text-stone-600">{rule.instrumentName}</p>
          )}
          {rule.notes && (
            <p className="mt-1 text-xs text-stone-500">{rule.notes}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${alertStatusClass(rule.lastCheckStatus)}`}>
              {alertStatusLabel(rule)}
            </span>
            {rule.lastTriggeredAt ? (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
                Triggered {new Date(rule.lastTriggeredAt).toLocaleString()}
              </span>
            ) : null}
          </div>
          {rule.lastCheckedAt && (
            <p className="mt-2 text-xs text-stone-500">
              Last checked: {new Date(rule.lastCheckedAt).toLocaleString()}
            </p>
          )}
          {rule.lastCheckMessage ? (
            <p className="mt-1 text-xs leading-5 text-stone-500">{rule.lastCheckMessage}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              rule.enabled
                ? "bg-emerald-100 text-emerald-800"
                : "bg-stone-200 text-stone-700"
            }`}
          >
            {rule.enabled ? "Active" : "Inactive"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function alertStatusLabel(rule: AlertRule) {
  if (!rule.lastCheckedAt) return "Not checked";
  if (rule.lastCheckStatus === "triggered") return "Triggered";
  if (rule.lastCheckStatus === "error") return "Needs attention";
  return "Clear";
}

function alertStatusClass(status: AlertRule["lastCheckStatus"]) {
  if (status === "triggered") return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
  if (status === "error") return "bg-rose-50 text-rose-800 ring-1 ring-rose-100";
  return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
}

function createPrefilledForm(
  source: string,
  id: string,
  watchlist: WatchlistItem[],
  portfolio: PortfolioItem[],
  requestedType: string | null,
): AlertForm | null {
  const alertType = isAlertType(requestedType) ? requestedType : null;
  if (source === "watchlist") {
    const item = watchlist.find((watch) => watch.id === id);
    if (!item) return null;
    const buyZone = parseBuyZone(item.targetBuyZone);
    return {
      ...createEmptyForm(),
      name: `${item.name} alert`,
      ticker: item.name,
      instrumentName: item.name,
      alertType: alertType ?? (buyZone ? "near_buy_zone" : "price_below"),
      buyZoneFrom: buyZone?.from,
      buyZoneTo: buyZone?.to,
      sourceType: "watchlist",
      sourceId: item.id,
      notes: item.notes ?? "",
    };
  }

  if (source === "portfolio") {
    const item = portfolio.find((holding) => holding.id === id);
    if (!item) return null;
    return {
      ...createEmptyForm(),
      name: `${item.name} alert`,
      ticker: item.ticker ?? "",
      instrumentName: item.name,
      alertType: alertType ?? "portfolio_loss",
      lossThreshold: 10,
      allocationThreshold: 0.25,
      riskThreshold: 70,
      sourceType: "portfolio",
      sourceId: item.id,
      notes: item.notes ?? "",
    };
  }

  return null;
}

function isAlertType(value: string | null): value is AlertType {
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

function parseBuyZone(value: string) {
  const matches = value.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const numbers = matches
    .slice(0, 2)
    .map((item) => Number(item.replace(",", ".")))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (numbers.length < 2) return null;
  return {
    from: Math.min(numbers[0], numbers[1]),
    to: Math.max(numbers[0], numbers[1]),
  };
}

function normalizeAlertSettings(settings: Partial<UserSettings> | null): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    capital:
      typeof settings?.capital === "number" && Number.isFinite(settings.capital)
        ? nonNegativeNumber(settings.capital)
        : DEFAULT_USER_SETTINGS.capital,
    riskTolerance:
      typeof settings?.riskTolerance === "number" && Number.isFinite(settings.riskTolerance)
        ? nonNegativeNumber(settings.riskTolerance)
        : DEFAULT_USER_SETTINGS.riskTolerance,
    timeHorizon: settings?.timeHorizon ?? DEFAULT_USER_SETTINGS.timeHorizon,
    preferredInstruments: settings?.preferredInstruments ?? DEFAULT_USER_SETTINGS.preferredInstruments,
    aprMoneyMarketFund: settings?.aprMoneyMarketFund ?? DEFAULT_USER_SETTINGS.aprMoneyMarketFund,
  };
}

function createEmptyForm(): AlertForm {
  return {
    name: "",
    ticker: "",
    instrumentName: "",
    alertType: "price_below",
    enabled: true,
    sourceType: "manual",
    notes: "",
  };
}

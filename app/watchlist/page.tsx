"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import type {
  AlertRule,
  AnalysisResult,
  DataSource,
  InvestmentType,
  TimeHorizon,
  WatchlistItem,
} from "@/lib/types/investment";
import { analyzeInvestment } from "@/lib/analysis/analyzeInvestment";
import { LoadingState } from "@/components/AppState";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  dataSourceLabel,
  fetchPublicMarketData,
} from "@/lib/providers/marketClient";
import { InstrumentOptions } from "@/components/PortfolioTable";
import { InstrumentBadge } from "@/components/InstrumentBadge";
import { useAuth } from "@/components/AuthProvider";
import { loadCloudAlertRules, loadCloudWatchlist, saveCloudWatchlist } from "@/lib/supabase/sync";
import {
  normalizeSafeTicker,
  validateCapital,
  validateRiskTolerance,
  validateTicker,
} from "@/lib/validation";

type WatchlistForm = Omit<WatchlistItem, "id">;
type WatchlistAnalysisState = Record<
  string,
  {
    isLoading?: boolean;
    error?: string;
    result?: AnalysisResult;
  }
>;

export default function WatchlistPage() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [form, setForm] = useState<WatchlistForm>(() =>
    createEmptyWatchlistForm(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [analysisById, setAnalysisById] = useState<WatchlistAnalysisState>({});
  const [showAlertOptions, setShowAlertOptions] = useState(false);
  const [formError, setFormError] = useState("");
  const [analysisDefaults, setAnalysisDefaults] = useState({
    capital: 10_000_000,
    riskTolerance: 15,
    timeHorizon: "medium" as TimeHorizon,
  });
  const [syncMessage, setSyncMessage] = useState("Menyiapkan pantauan...");

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    window.setTimeout(() => {
      void (async () => {
        const storedItems = readStoredWatchlist();
        const storedAlertRules = localArahDanaStorage.readAlertRules() ?? [];
        const settings = localArahDanaStorage.readSettings();
        if (isMounted) {
          setAnalysisDefaults({
            capital: Number.isFinite(settings?.capital)
              ? (settings?.capital ?? 10_000_000)
              : 10_000_000,
            riskTolerance: Number.isFinite(settings?.riskTolerance)
              ? (settings?.riskTolerance ?? 15)
              : 15,
            timeHorizon: isTimeHorizon(settings?.timeHorizon)
              ? settings.timeHorizon
              : "medium",
          });
        }

        if (!user) {
          if (!isMounted) return;
          setItems(storedItems);
          setAlertRules(storedAlertRules);
          setSyncMessage("Pantauan aman di perangkat ini.");
          setIsHydrated(true);
          return;
        }

        try {
          const cloudItems = await loadCloudWatchlist(user);
          const cloudAlertRules = await loadCloudAlertRules(user).catch(() => storedAlertRules);
          if (!isMounted) return;
          const nextItems = cloudItems.length > 0 ? cloudItems : storedItems;
          setItems(nextItems);
          setAlertRules(cloudAlertRules.length > 0 ? cloudAlertRules : storedAlertRules);
          localArahDanaStorage.writeWatchlist(nextItems);
          setSyncMessage(
            cloudItems.length > 0
              ? "Pantauan siap dan terjaga."
              : "Pantauan siap. Data baru akan dijaga otomatis.",
          );
        } catch (error) {
          if (!isMounted) return;
          setItems(storedItems);
          setAlertRules(storedAlertRules);
          setSyncMessage(
            error instanceof Error
              ? `Pantauan tetap aman di perangkat ini. ${error.message}`
              : "Pantauan tetap aman di perangkat ini.",
          );
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isHydrated) return;
    localArahDanaStorage.writeWatchlist(items);
    if (!user) return;

    void saveCloudWatchlist(user, items)
      .then(() => {
        setSyncMessage("Pantauan tersimpan.");
      })
      .catch((error) => {
        setSyncMessage(
          error instanceof Error
            ? `Pantauan tersimpan di perangkat ini. ${error.message}`
            : "Pantauan tersimpan di perangkat ini.",
        );
      });
  }, [isHydrated, items, user]);

  if (!isHydrated) {
    return <LoadingState title="Memuat pantauan" message="Mengambil watchlist lokal dan cloud bila akun tersedia." />;
  }

  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.targetBuyZone.trim()) {
      setFormError("Ticker/nama dan zona beli target wajib diisi.");
      return;
    }

    const normalized = normalizeWatchlistItem({
      ...form,
      dataSource: "manual_input",
      lastAnalyzedAt: undefined,
      id: editingId ?? crypto.randomUUID(),
    });

    setItems((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? normalized : item))
        : [normalized, ...current],
    );
    if (editingId) {
      setAnalysisById((current) => {
        const next = { ...current };
        delete next[editingId];
        return next;
      });
    }
    setEditingId(null);
    setForm(createEmptyWatchlistForm());
  }

  function startEditing(item: WatchlistItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      type: item.type,
      targetBuyZone: item.targetBuyZone,
      notes: item.notes ?? "",
      status: item.status,
      dataSource: item.dataSource,
      lastAnalyzedAt: item.lastAnalyzedAt,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(createEmptyWatchlistForm());
  }

  function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setAnalysisById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (editingId === id) {
      cancelEditing();
    }
  }

  async function analyzeItem(item: WatchlistItem) {
    const ticker = normalizeSafeTicker(item.name);
    if (!ticker) return;
    const tickerValidation = validateTicker(ticker);
    const capitalValidation = validateCapital(analysisDefaults.capital);
    const riskValidation = validateRiskTolerance(analysisDefaults.riskTolerance);
    const validation = tickerValidation || capitalValidation || riskValidation;
    if (validation) {
      setAnalysisById((current) => ({
        ...current,
        [item.id]: { error: validation },
      }));
      return;
    }

    setAnalysisById((current) => ({
      ...current,
      [item.id]: { isLoading: true },
    }));

    try {
      const marketData = await fetchPublicMarketData({
        ticker,
        range: "1y",
        interval: "1d",
      });
      const result = analyzeInvestment({
        name: item.name,
        type: item.type,
        ticker,
        capital: analysisDefaults.capital,
        riskTolerance: analysisDefaults.riskTolerance,
        timeHorizon: analysisDefaults.timeHorizon,
        prices: marketData.prices,
      });

      setAnalysisById((current) => ({
        ...current,
        [item.id]: { result },
      }));
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                dataSource: "live_public_market_data",
                lastAnalyzedAt: new Date().toISOString(),
              }
            : currentItem,
        ),
      );
    } catch (error) {
      setAnalysisById((current) => ({
        ...current,
        [item.id]: {
          error: `${error instanceof Error ? error.message : "Analisis gagal."} Data tidak bisa diperbarui; data pantauan manual/contoh sebelumnya tetap dipakai.`,
        },
      }));
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <form
        onSubmit={submitItem}
        className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit item pantauan" : "Pantau instrumen"}
          </h2>
          <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            {user ? "Data aman" : isConfigured ? "Aman" : "Aman"}
          </span>
        </div>
        <div className="mt-4 rounded-lg bg-stone-100 p-4 text-sm leading-6 text-stone-600">
          <p className="font-semibold text-stone-950">Mode penyimpanan</p>
          <p className="mt-1">
            ArahDana menjaga data tetap rapi. Login membuatnya lebih mudah dipakai di perangkat lain.
          </p>
          <p className="mt-2 font-medium">{syncMessage}</p>
        </div>
        <div className="mt-4 grid gap-4">
          <Field label="Ticker / nama">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="BBRI.JK"
            />
          </Field>
          <Field label="Jenis">
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as InvestmentType })
              }
            >
              <InstrumentOptions />
            </select>
          </Field>
          <Field label="Zona beli target">
            <input
              className="input"
              value={form.targetBuyZone}
              onChange={(e) =>
                setForm({ ...form, targetBuyZone: e.target.value })
              }
            />
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as WatchlistItem["status"],
                })
              }
            >
              <option value="watching">Dipantau</option>
              <option value="waiting">Menunggu</option>
              <option value="avoid">Hindari</option>
              <option value="bought">Sudah dibeli</option>
            </select>
          </Field>
          <Field label="Catatan">
            <textarea
              className="input min-h-24"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800">
            {editingId ? "Simpan perubahan" : "Tambah ke pantauan"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Batal edit
            </button>
          ) : null}
        </div>
        {formError ? (
          <p className="mt-3 text-sm font-medium text-rose-700">{formError}</p>
        ) : null}
      </form>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Pantauan</h2>
          <button
            type="button"
            onClick={() => setShowAlertOptions((current) => !current)}
            className="w-fit rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            {showAlertOptions ? "Sembunyikan opsi" : "Opsi lanjut"}
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
              Belum ada item pantauan tersimpan. Tambahkan ticker, reksadana,
              atau zona target obligasi untuk mulai memantau.
            </div>
          ) : null}
          {items.map((item) => {
            const itemAlertRules = alertRules.filter(
              (rule) =>
                rule.sourceType === "watchlist" &&
                rule.sourceId === item.id,
            );
            const latestCheckedAt = latestAlertCheckedAt(itemAlertRules);
            const itemStatus = watchlistAlertStatus(itemAlertRules);

            return (
            <article
              key={item.id}
              className="rounded-lg border border-stone-200 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-stone-950">{item.name}</h3>
                  <div className="mt-1">
                    <InstrumentBadge type={item.type} className="text-[10px]" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    Sumber: {dataSourceLabel(item.dataSource)}
                    {item.lastAnalyzedAt
                      ? `, dianalisis ${formatDateTime(item.lastAnalyzedAt)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
                    {watchlistStatusLabel(item.status)}
                  </span>
                  <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                    {itemStatus}
                  </span>
                  <button
                    type="button"
                    onClick={() => analyzeItem(item)}
                    disabled={analysisById[item.id]?.isLoading}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analysisById[item.id]?.isLoading
                      ? "Menganalisis..."
                      : "Analisis"}
                  </button>
                  {showAlertOptions ? (
                    <Link
                      href={`/alerts?source=watchlist&id=${encodeURIComponent(item.id)}`}
                      className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Atur pantauan
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
              {showAlertOptions ? (
                <div className="mt-3 grid gap-2 rounded-lg bg-stone-100 p-3 sm:grid-cols-3">
                  <AlertMeta label="Kondisi" value={itemStatus} />
                  <AlertMeta label="Dipantau" value={String(itemAlertRules.filter((rule) => rule.enabled).length)} />
                  <AlertMeta label="Pembaruan" value={latestCheckedAt ? formatDateTime(latestCheckedAt) : "Belum ada"} />
                </div>
              ) : null}
              <p className="mt-3 text-sm font-medium text-emerald-700">
                Target: {item.targetBuyZone}
              </p>
              {item.notes ? (
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {item.notes}
                </p>
              ) : null}
              <WatchlistAnalysisPanel state={analysisById[item.id]} />
            </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AlertMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      {children}
    </label>
  );
}

function watchlistAlertStatus(rules: AlertRule[]) {
  if (rules.length === 0) return "Stabil";
  if (rules.some((rule) => rule.lastCheckStatus === "triggered")) return "Perlu perhatian";
  if (rules.some((rule) => rule.lastCheckStatus === "error")) return "Dipantau";
  if (rules.some((rule) => rule.enabled)) return "Dipantau otomatis";
  return "Stabil";
}

function latestAlertCheckedAt(rules: AlertRule[]) {
  return rules
    .map((rule) => rule.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function readStoredWatchlist() {
  const saved = localArahDanaStorage.readWatchlist();
  if (!saved) {
    return [];
  }

  return Array.isArray(saved)
    ? saved.map(normalizeWatchlistItem)
    : [];
}

function createEmptyWatchlistForm(): WatchlistForm {
  return {
    name: "",
    type: "stock",
    targetBuyZone: "",
    notes: "",
    status: "watching",
    dataSource: "manual_input",
  };
}

function normalizeWatchlistItem(item: WatchlistItem): WatchlistItem {
  return {
    ...item,
    id: item.id || crypto.randomUUID(),
    notes: item.notes ?? "",
    status: isWatchlistStatus(item.status) ? item.status : "watching",
    dataSource: isDataSource(item.dataSource)
      ? item.dataSource
      : "manual_input",
    lastAnalyzedAt: item.lastAnalyzedAt,
  };
}

function isWatchlistStatus(value: string): value is WatchlistItem["status"] {
  return ["watching", "waiting", "avoid", "bought"].includes(value);
}

function WatchlistAnalysisPanel({
  state,
}: {
  state?: WatchlistAnalysisState[string];
}) {
  if (!state) return null;

  if (state.isLoading) {
    return (
      <div className="mt-4 rounded-lg bg-stone-100 p-4 text-sm text-stone-600">
        Menyiapkan analisis terbaru...
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-800 ring-1 ring-rose-100">
        {state.error}
      </div>
    );
  }

  if (!state.result) return null;

  const warning =
    state.result.doNotBuyWarnings[0] ??
    "Tidak ada peringatan besar dari data historis.";

  return (
    <div className="mt-4 grid gap-3 rounded-lg bg-stone-100 p-4 sm:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Keputusan
        </p>
        <p className={verdictClassName(state.result.verdict)}>
          {verdictLabel(state.result.verdict)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Skor risiko
        </p>
        <p className="mt-1 text-lg font-semibold text-stone-950">
          {state.result.riskScore}/100
        </p>
      </div>
      <div className="sm:col-span-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Peringatan utama
        </p>
        <p className="mt-1 text-sm leading-5 text-stone-700">{warning}</p>
      </div>
    </div>
  );
}

function verdictClassName(verdict: AnalysisResult["verdict"]) {
  const color =
    verdict === "BUY"
      ? "text-emerald-700"
      : verdict === "WAIT"
        ? "text-amber-700"
        : "text-rose-700";
  return `mt-1 text-xl font-bold ${color}`;
}

function verdictLabel(verdict: AnalysisResult["verdict"]) {
  if (verdict === "BUY") return "BELI";
  if (verdict === "WAIT") return "TUNGGU";
  return "HINDARI";
}

function watchlistStatusLabel(status: WatchlistItem["status"]) {
  if (status === "watching") return "Dipantau";
  if (status === "waiting") return "Menunggu";
  if (status === "avoid") return "Hindari";
  return "Sudah dibeli";
}

function isTimeHorizon(value: unknown): value is TimeHorizon {
  return value === "short" || value === "medium" || value === "long";
}

function isDataSource(value: unknown): value is DataSource {
  return (
    value === "live_public_market_data" ||
    value === "manual_input" ||
    value === "semi_auto_import" ||
    value === "bibit_import" ||
    value === "savings_import" ||
    value === "mock_data"
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

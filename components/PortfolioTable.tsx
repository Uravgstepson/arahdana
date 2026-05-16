"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import type {
  AlertRule,
  DataSource,
  InvestmentType,
  PortfolioItem,
  RiskCategory,
} from "@/lib/types/investment";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  dataSourceLabel,
  fetchPublicMarketData,
  getLatestClose,
} from "@/lib/providers/marketClient";
import {
  formatPercent,
  formatRupiah,
  investmentTypeLabel,
  nonNegativeNumber,
} from "@/lib/utils/format";
import { LoadingState } from "@/components/AppState";
import { CsvPortfolioImportSection } from "@/components/CsvPortfolioImportSection";
import { useAuth } from "@/components/AuthProvider";
import { RiskBadge } from "@/components/RiskBadge";
import { InstrumentBadge } from "@/components/InstrumentBadge";
import { PortfolioHealthBreakdown } from "@/components/PortfolioHealthBreakdown";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";
import { loadCloudAlertRules, loadCloudPortfolio, saveCloudPortfolio } from "@/lib/supabase/sync";
import {
  normalizeSafeTicker,
  validatePositiveNumber,
  validateTicker,
} from "@/lib/validation";

type PortfolioForm = Omit<PortfolioItem, "id">;

export function PortfolioTable() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [aprMoneyMarketFund, setAprMoneyMarketFund] = useState(0.05);
  const [riskTolerance, setRiskTolerance] = useState(15);
  const [form, setForm] = useState<PortfolioForm>(() =>
    createEmptyPortfolioForm(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasStoredPortfolio, setHasStoredPortfolio] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [formSubmitError, setFormSubmitError] = useState("");
  const [isLookingUpFormPrice, setIsLookingUpFormPrice] = useState(false);
  const [formLookupMessage, setFormLookupMessage] = useState("");
  const [formLookupError, setFormLookupError] = useState("");
  const [syncMessage, setSyncMessage] = useState("Memuat mode penyimpanan...");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;

    let isMounted = true;
    window.setTimeout(() => {
      void (async () => {
        const saved = localArahDanaStorage.readPortfolio();
        const storedAlertRules = localArahDanaStorage.readAlertRules() ?? [];
        const storedItems = Array.isArray(saved)
          ? normalizePortfolioItems(saved)
          : null;

        const settings = localArahDanaStorage.readSettings();
        if (
          settings &&
          typeof settings.aprMoneyMarketFund === "number" &&
          Number.isFinite(settings.aprMoneyMarketFund)
        ) {
          if (isMounted)
            setAprMoneyMarketFund(
              nonNegativeNumber(settings.aprMoneyMarketFund),
            );
        }
        if (
          settings &&
          typeof settings.riskTolerance === "number" &&
          Number.isFinite(settings.riskTolerance)
        ) {
          if (isMounted)
            setRiskTolerance(nonNegativeNumber(settings.riskTolerance));
        }

        if (!user) {
          if (!isMounted) return;
          setItems(storedItems ?? []);
          setAlertRules(storedAlertRules);
          setHasStoredPortfolio(storedItems !== null);
          setSyncMessage("Login untuk sinkronisasi antar perangkat.");
          setIsHydrated(true);
          return;
        }

        try {
          const cloudItems = await loadCloudPortfolio(user);
          const cloudAlertRules = await loadCloudAlertRules(user).catch(() => storedAlertRules);
          if (!isMounted) return;
          const nextItems =
            cloudItems.length > 0 ? cloudItems : (storedItems ?? []);
          setItems(nextItems);
          setAlertRules(cloudAlertRules.length > 0 ? cloudAlertRules : storedAlertRules);
          setHasStoredPortfolio(true);
          localArahDanaStorage.writePortfolio(nextItems);
          setSyncMessage(
            cloudItems.length > 0
              ? "Cloud sync enabled. Holding dimuat dari Supabase dan dicadangkan lokal."
              : "Cloud sync enabled. Belum ada holding cloud; data lokal akan dicadangkan saat berubah.",
          );
        } catch (error) {
          if (!isMounted) return;
          setItems(storedItems ?? []);
          setAlertRules(storedAlertRules);
          setHasStoredPortfolio(storedItems !== null);
          setSyncMessage(
            error instanceof Error
              ? `Cloud sync gagal, memakai localStorage. ${error.message}`
              : "Cloud sync gagal, memakai localStorage.",
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
    localArahDanaStorage.writePortfolio(items);
    if (!user) return;

    void saveCloudPortfolio(user, items)
      .then(() => {
        setSyncMessage(
          "Cloud sync enabled. Portofolio tersimpan di Supabase dan localStorage.",
        );
      })
      .catch((error) => {
        setSyncMessage(
          error instanceof Error
            ? `Local backup tersimpan, cloud sync gagal. ${error.message}`
            : "Local backup tersimpan, cloud sync gagal.",
        );
      });
  }, [isHydrated, items, user]);

  const totals = useMemo(() => {
    const summary = items.reduce(
      (acc, item) => {
        const invested = item.buyPrice * item.quantity;
        const { currentPriceUsed } = computePortfolioCurrentPrice(item, {
          aprMoneyMarketFund,
        });
        const current = currentPriceUsed * item.quantity;
        const profit = current - invested;

        acc.invested += invested;
        acc.current += current;
        acc.allocationMap[item.type] =
          (acc.allocationMap[item.type] ?? 0) + current;
        acc.performers.push({
          item,
          profit,
          profitPercent: invested > 0 ? (profit / invested) * 100 : 0,
        });
        return acc;
      },
      {
        invested: 0,
        current: 0,
        allocationMap: {} as Partial<Record<InvestmentType, number>>,
        performers: [] as Array<{
          item: PortfolioItem;
          profit: number;
          profitPercent: number;
        }>,
      },
    );

    const profit = summary.current - summary.invested;
    const profitPercent =
      summary.invested > 0 ? (profit / summary.invested) * 100 : 0;
    const allocation = Object.entries(summary.allocationMap).map(
      ([type, value]) => ({
        key: type,
        label: investmentTypeLabel(type as InvestmentType),
        value,
        percent:
          summary.current > 0 ? Math.round((value / summary.current) * 100) : 0,
      }),
    );
    const groupedHoldings = buildPortfolioGroups(items, aprMoneyMarketFund);

    return {
      invested: summary.invested,
      current: summary.current,
      profit,
      profitPercent,
      allocation,
      groupedHoldings,
      topGainer: summary.performers.length
        ? summary.performers.reduce((best, item) =>
            item.profitPercent > best.profitPercent ? item : best,
          )
        : null,
      worstPerformer: summary.performers.length
        ? summary.performers.reduce((worst, item) =>
            item.profitPercent < worst.profitPercent ? item : worst,
          )
        : null,
    };
  }, [aprMoneyMarketFund, items]);

  if (!isHydrated) {
    return (
      <LoadingState
        title="Memuat portofolio"
        message="Mengambil holding lokal dan cloud bila akun tersedia."
      />
    );
  }

  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormSubmitError("");

    const currentPrice =
      form.currentPrice > 0 ? form.currentPrice : form.buyPrice;

    const validationErrors = [
      !form.name.trim() ? "Nama instrumen wajib diisi." : "",
      validateTicker(form.ticker ?? "", { optional: true }),
      validatePositiveNumber(form.buyPrice, "Harga beli"),
      validatePositiveNumber(form.quantity, "Jumlah/unit"),
      validatePositiveNumber(currentPrice, "Harga kini"),
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      setFormSubmitError(validationErrors.join(" "));
      return;
    }

    const normalized = normalizePortfolioItem({
      ...form,
      currentPrice,
      dataSource: form.dataSource ?? "manual_input",
      lastPriceUpdatedAt: form.lastPriceUpdatedAt,
      id: editingId ?? crypto.randomUUID(),
    });

    setHasStoredPortfolio(true);
    setItems((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? normalized : item))
        : [
            normalized,
            ...getWritablePortfolioBase(current, hasStoredPortfolio),
          ],
    );
    setEditingId(null);
    setForm(createEmptyPortfolioForm());
    setIsFormOpen(false);
  }

  function startEditing(item: PortfolioItem) {
    setIsFormOpen(true);
    setEditingId(item.id);
    setForm({
      name: item.name,
      type: item.type,
      ticker: item.ticker ?? "",
      buyPrice: item.buyPrice,
      quantity: item.quantity,
      currentPrice: item.currentPrice,
      buyDate: item.buyDate,
      notes: item.notes ?? "",
      riskCategory: item.riskCategory,
      dataSource: item.dataSource,
      lastPriceUpdatedAt: item.lastPriceUpdatedAt,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(createEmptyPortfolioForm());
  }

  function deleteItem(id: string) {
    setHasStoredPortfolio(true);
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      cancelEditing();
    }
  }

  async function refreshPrices() {
    const refreshableItems = items.filter((item) => item.ticker?.trim());

    setRefreshMessage("");
    setRefreshError("");

    if (refreshableItems.length === 0) {
      setRefreshError(
        "Tidak ada ticker. Tambahkan ticker seperti BBCA.JK, BBRI.JK, TLKM.JK, atau ASII.JK dulu.",
      );
      return;
    }

    setIsRefreshing(true);

    try {
      const results = await Promise.allSettled(
        refreshableItems.map(async (item) => {
          const tickerValidation = validateTicker(item.ticker ?? "", {
            optional: true,
          });
          if (tickerValidation) throw new Error(tickerValidation);
          const ticker = normalizeLookupTicker(item.ticker ?? "");
          const marketData = await fetchPublicMarketData({
            ticker,
            range: "1mo",
            interval: "1d",
          });
          const latestClose = getLatestClose(marketData.prices);
          if (!latestClose) {
            throw new Error("Harga penutupan terbaru tidak tersedia.");
          }

          return {
            id: item.id,
            ticker: ticker || item.name,
            latestClose,
            updatedAt: new Date().toISOString(),
          };
        }),
      );

      const updates = new Map<
        string,
        { latestClose: number; updatedAt: string }
      >();
      const failures: string[] = [];

      results.forEach((result, index) => {
        const item = refreshableItems[index];
        if (result.status === "fulfilled") {
          updates.set(result.value.id, {
            latestClose: result.value.latestClose,
            updatedAt: result.value.updatedAt,
          });
        } else {
          failures.push(
            `${item.ticker ?? item.name}: ${result.reason instanceof Error ? result.reason.message : "gagal diperbarui"}`,
          );
        }
      });

      if (updates.size > 0) {
        setHasStoredPortfolio(true);
        setItems((current) =>
          current.map((item) => {
            const update = updates.get(item.id);
            if (!update) return item;
            return {
              ...item,
              currentPrice: update.latestClose,
              dataSource: "live_public_market_data",
              lastPriceUpdatedAt: update.updatedAt,
            };
          }),
        );
      }

      setRefreshMessage(
        updates.size > 0
          ? `${updates.size} harga diperbarui dari data pasar publik langsung.`
          : "",
      );
      setRefreshError(
        failures.length > 0
          ? `${failures.length} ticker gagal diperbarui. Harga manual sebelumnya tetap dipakai. ${failures.join(" ")}`
          : "",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function lookupFormLatestPrice() {
    const ticker = form.ticker?.trim();
    setFormLookupMessage("");
    setFormLookupError("");

    if (!ticker) {
      setFormLookupError(
        "Tambahkan ticker dulu, misalnya BBCA.JK atau BBRI.JK.",
      );
      return;
    }

    const tickerValidation = validateTicker(ticker);
    if (tickerValidation) {
      setFormLookupError(tickerValidation);
      return;
    }

    setIsLookingUpFormPrice(true);

    try {
      const normalizedTicker = normalizeLookupTicker(ticker);
      const marketData = await fetchPublicMarketData({
        ticker: normalizedTicker,
        range: "1mo",
        interval: "1d",
      });
      const latestClose = getLatestClose(marketData.prices);
      if (!latestClose) {
        throw new Error("Harga penutupan terbaru tidak tersedia.");
      }

      setForm((current) => ({
        ...current,
        name: current.name || marketData.ticker,
        ticker: normalizeSafeTicker(marketData.ticker),
        currentPrice: latestClose,
        dataSource: "live_public_market_data",
        lastPriceUpdatedAt: new Date().toISOString(),
      }));
      setFormLookupMessage(
        `Harga publik terbaru untuk ${marketData.ticker} berhasil dimuat.`,
      );
    } catch (error) {
      setFormLookupError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil harga publik terbaru.",
      );
    } finally {
      setIsLookingUpFormPrice(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.8rem] bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  user
                    ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20"
                    : "bg-amber-300/15 text-amber-100 ring-amber-200/20"
                }`}
              >
                {user ? "Cloud sync" : isConfigured ? "Local" : "Local"}
              </span>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                Private
              </span>
            </div>
            <p className="mt-6 text-sm font-medium text-white/58">
              Total portofolio
            </p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatRupiah(totals.current)}
            </h2>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1.1rem] bg-white/10 text-white/75 ring-1 ring-white/10">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <rect x="6" y="10" width="12" height="9" rx="2" />
              <path d="M9 10V7a3 3 0 0 1 6 0v3" />
            </svg>
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PortfolioHeroMetric
            label="Total P/L"
            value={formatRupiah(totals.profit)}
            helper={formatPercent(totals.profitPercent)}
            tone={totals.profit >= 0 ? "good" : "bad"}
          />
          <PortfolioHeroMetric
            label="Modal"
            value={formatRupiah(totals.invested)}
            helper={`${items.length} holding`}
          />
          <PortfolioHeroMetric
            label="Profil risiko"
            value={riskProfileLabel(items)}
            helper={syncMessage}
          />
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(createEmptyPortfolioForm());
              setIsFormOpen((current) => !current);
            }}
            className="min-h-12 rounded-[1rem] bg-emerald-400 px-5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-emerald-300"
          >
            {isFormOpen && !editingId ? "Tutup form" : "Tambah"}
          </button>
          <button
            type="button"
            onClick={refreshPrices}
            disabled={isRefreshing || items.length === 0}
            className="min-h-12 rounded-[1rem] bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/12 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefreshing ? "Memperbarui..." : "Perbarui Harga"}
          </button>
        </div>
      </section>

      <AllocationChips allocation={totals.allocation} />

      {refreshMessage ? (
        <StatusStrip tone="success">{refreshMessage}</StatusStrip>
      ) : null}
      {refreshError ? (
        <StatusStrip tone="error">{refreshError}</StatusStrip>
      ) : null}

      {isFormOpen ? (
        <form
          onSubmit={submitItem}
          className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-950">
              {editingId ? "Edit holding" : "Tambah holding"}
            </h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              Manual
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Nama instrumen">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            <Field label="Ticker / simbol">
              <input
                className="input"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                placeholder="BBCA.JK"
              />
            </Field>
            <Field label="Harga beli">
              <input
                className="input"
                type="number"
                min="0"
                value={form.buyPrice || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    buyPrice: nonNegativeNumber(Number(e.target.value)),
                  })
                }
              />
            </Field>
            <Field label="Jumlah / unit">
              <input
                className="input"
                type="number"
                min="0"
                value={form.quantity || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: nonNegativeNumber(Number(e.target.value)),
                  })
                }
              />
            </Field>
            <Field label="Harga kini">
              <input
                className="input"
                type="number"
                min="0"
                value={form.currentPrice || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    currentPrice: nonNegativeNumber(Number(e.target.value)),
                  })
                }
              />
            </Field>
            <Field label="Tanggal beli">
              <input
                className="input"
                type="date"
                value={form.buyDate}
                onChange={(e) => setForm({ ...form, buyDate: e.target.value })}
              />
            </Field>
            <Field label="Kategori risiko">
              <select
                className="input"
                value={form.riskCategory}
                onChange={(e) =>
                  setForm({
                    ...form,
                    riskCategory: e.target.value as RiskCategory,
                  })
                }
              >
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
              </select>
            </Field>
            <Field label="Catatan">
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-[1rem] bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800">
              {editingId ? "Simpan perubahan" : "Tambah instrumen"}
            </button>
            <button
              type="button"
              onClick={lookupFormLatestPrice}
              disabled={isLookingUpFormPrice || !form.ticker?.trim()}
              className="rounded-[1rem] border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLookingUpFormPrice ? "Mencari..." : "Isi harga terbaru"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-[1rem] border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Batal edit
              </button>
            ) : null}
          </div>
          {formLookupMessage ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">
              {formLookupMessage}
            </p>
          ) : null}
          {formLookupError ? (
            <p className="mt-3 text-sm font-medium text-rose-700">
              {formLookupError}
            </p>
          ) : null}
          {formSubmitError ? (
            <p className="mt-3 text-sm font-medium text-rose-700">
              {formSubmitError}
            </p>
          ) : null}
        </form>
      ) : null}

      <section className="rounded-[1.6rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Holdings</h2>
            <p className="mt-1 text-sm text-stone-500">
              Dikelompokkan agar mudah dipindai.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            {items.length} produk
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 rounded-[1.2rem] border border-dashed border-stone-300 p-6 text-center">
            <h3 className="font-semibold text-stone-950">
              Portofolio masih kosong
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="mt-4 rounded-[1rem] bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Tambah holding pertama
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {totals.groupedHoldings.map((group) => (
              <HoldingGroupCard
                key={group.key}
                group={group}
                alertRules={alertRules}
                onEdit={startEditing}
                onDelete={deleteItem}
              />
            ))}
          </div>
        )}
      </section>

      {items.length > 0 ? (
        <div className="mt-6">
          <PortfolioHealthBreakdown
            portfolio={items}
            riskTolerance={riskTolerance}
            aprMoneyMarketFund={aprMoneyMarketFund}
          />
        </div>
      ) : null}

      <details className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-stone-950">
          Import CSV dan performa detail
        </summary>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <CsvPortfolioImportSection
            existingItems={items}
            hasStoredPortfolio={hasStoredPortfolio}
            onImport={async (nextItems) => {
              localArahDanaStorage.writePortfolio(nextItems);
              if (user) {
                await saveCloudPortfolio(user, nextItems);
              }
              setHasStoredPortfolio(true);
              setItems(nextItems);
            }}
            storageLabel={user ? "Supabase dan localStorage" : "localStorage"}
            title="CSV Import"
            description="Upload CSV lokal atau tempel data. File dibaca di browser."
          />
          <section className="rounded-[1.4rem] bg-stone-100 p-4">
            <h2 className="text-sm font-semibold text-stone-950">
              Pemenang dan pemberat
            </h2>
            <div className="mt-3 grid gap-3">
              <PerformerSummary
                title="Top gainer"
                performer={totals.topGainer}
                tone="good"
              />
              <PerformerSummary
                title="Worst performer"
                performer={totals.worstPerformer}
                tone="bad"
              />
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}

export function InstrumentOptions() {
  return (
    <>
      <option value="stock">Saham IDX</option>
      <option value="cash_savings">Tabungan / Kas</option>
      <option value="money_market_fund">Reksadana Pasar Uang</option>
      <option value="bond_fund">Reksadana Pendapatan Tetap</option>
      <option value="equity_fund">Reksadana Saham</option>
      <option value="mixed_fund">Reksadana Campuran</option>
      <option value="bond">Obligasi</option>
    </>
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

function AlertMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function portfolioAlertStatus(rules: AlertRule[]) {
  if (rules.length === 0) return "No alert";
  if (rules.some((rule) => rule.lastCheckStatus === "triggered")) return "Triggered";
  if (rules.some((rule) => rule.lastCheckStatus === "error")) return "Needs check";
  if (rules.some((rule) => rule.enabled)) return "Active";
  return "Inactive";
}

function latestAlertCheckedAt(rules: AlertRule[]) {
  return rules
    .map((rule) => rule.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

type HoldingView = {
  item: PortfolioItem;
  invested: number;
  current: number;
  currentPriceUsed: number;
  isEstimated: boolean;
  profit: number;
  profitPercent: number;
};

type HoldingGroup = {
  key: string;
  title: string;
  items: HoldingView[];
  value: number;
  profit: number;
  profitPercent: number;
};

function PortfolioHeroMetric({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-200"
      : tone === "bad"
        ? "text-rose-200"
        : "text-white";

  return (
    <div className="rounded-[1.25rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
        {label}
      </p>
      <p className={`mt-2 truncate text-lg font-semibold ${valueClass}`}>
        {value}
      </p>
      {helper ? (
        <p className="mt-1 truncate text-xs font-medium text-white/50">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function AllocationChips({
  allocation,
}: {
  allocation: Array<{
    key: string;
    label: string;
    value: number;
    percent: number;
  }>;
}) {
  const visibleTypes: InvestmentType[] = [
    "money_market_fund",
    "bond_fund",
    "stock",
    "mixed_fund",
    "cash_savings",
  ];
  const byType = new Map(allocation.map((item) => [item.key, item]));

  return (
    <section className="rounded-[1.45rem] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {visibleTypes.map((type) => {
          const item = byType.get(type);
          return (
            <div
              key={type}
              className="min-w-fit rounded-full bg-stone-100 px-4 py-2 ring-1 ring-stone-200"
            >
              <span className="text-xs font-semibold text-stone-500">
                {shortAllocationLabel(type)}
              </span>
              <span className="ml-2 text-sm font-semibold text-stone-950">
                {item?.percent ?? 0}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HoldingGroupCard({
  group,
  alertRules,
  onEdit,
  onDelete,
}: {
  group: HoldingGroup;
  alertRules: AlertRule[];
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
}) {
  const toneClass = group.profit >= 0 ? "text-emerald-700" : "text-rose-700";

  return (
    <article className="rounded-[1.35rem] bg-stone-100 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-950">{group.title}</h3>
          <p className="mt-1 text-xs font-medium text-stone-500">
            {group.items.length} produk
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-stone-950">
            {formatRupiah(group.value)}
          </p>
          <p className={`text-xs font-semibold ${toneClass}`}>
            {formatRupiah(group.profit)} ({formatPercent(group.profitPercent)})
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {group.items.map((holding) => (
          <HoldingRow
            key={holding.item.id}
            holding={holding}
            alertRules={alertRules.filter(
              (rule) =>
                rule.sourceType === "portfolio" &&
                rule.sourceId === holding.item.id,
            )}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </article>
  );
}

function HoldingRow({
  holding,
  alertRules,
  onEdit,
  onDelete,
}: {
  holding: HoldingView;
  alertRules: AlertRule[];
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
}) {
  const profitClass =
    holding.profit >= 0 ? "text-emerald-700" : "text-rose-700";
  const latestCheckedAt = latestAlertCheckedAt(alertRules);

  return (
    <div className="rounded-[1.15rem] bg-white/80 p-3 ring-1 ring-stone-200/70">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
          {initials(holding.item.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold text-stone-950">
                {holding.item.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <InstrumentBadge type={holding.item.type} />
                <RiskBadge risk={holding.item.riskCategory} />
                {holding.item.ticker ? (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[0.68rem] font-bold text-stone-500">
                    {holding.item.ticker}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-stone-950">
                {formatRupiah(holding.current)}
              </p>
              <p className={`text-sm font-semibold ${profitClass}`}>
                {formatRupiah(holding.profit)} (
                {formatPercent(holding.profitPercent)})
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-3">
            <p className="text-xs font-medium text-stone-500">
              Harga {formatRupiah(holding.currentPriceUsed)}
              {holding.isEstimated ? " - estimasi" : ""}
              {holding.item.lastPriceUpdatedAt
                ? ` - ${formatDateTime(holding.item.lastPriceUpdatedAt)}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/alerts?source=portfolio&id=${encodeURIComponent(holding.item.id)}&type=portfolio_loss`}
                className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Loss alert
              </Link>
              <Link
                href={`/alerts?source=portfolio&id=${encodeURIComponent(holding.item.id)}&type=concentration_risk`}
                className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Allocation alert
              </Link>
              <Link
                href={`/alerts?source=portfolio&id=${encodeURIComponent(holding.item.id)}&type=risk_score_worsens`}
                className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Risk alert
              </Link>
              <button
                type="button"
                onClick={() => onEdit(holding.item)}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(holding.item.id)}
                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Hapus
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 rounded-lg bg-stone-100 p-3 sm:grid-cols-3">
            <AlertMeta label="Alert status" value={portfolioAlertStatus(alertRules)} />
            <AlertMeta label="Active alerts" value={String(alertRules.filter((rule) => rule.enabled).length)} />
            <AlertMeta label="Last checked" value={latestCheckedAt ? formatDateTime(latestCheckedAt) : "Belum pernah"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStrip({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[1.2rem] px-4 py-3 text-sm font-medium ${
        tone === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-rose-50 text-rose-800"
      }`}
    >
      {children}
    </div>
  );
}

function buildPortfolioGroups(
  items: PortfolioItem[],
  aprMoneyMarketFund: number,
): HoldingGroup[] {
  const groups = new Map<string, HoldingGroup>();

  items.forEach((item) => {
    const invested = item.buyPrice * item.quantity;
    const { currentPriceUsed, isEstimated } = computePortfolioCurrentPrice(
      item,
      {
        aprMoneyMarketFund,
      },
    );
    const current = currentPriceUsed * item.quantity;
    const profit = current - invested;
    const key = groupKeyForType(item.type);
    const existing =
      groups.get(key) ??
      ({
        key,
        title: groupTitleForType(item.type),
        items: [],
        value: 0,
        profit: 0,
        profitPercent: 0,
      } satisfies HoldingGroup);

    existing.items.push({
      item,
      invested,
      current,
      currentPriceUsed,
      isEstimated,
      profit,
      profitPercent: invested > 0 ? (profit / invested) * 100 : 0,
    });
    existing.value += current;
    existing.profit += profit;
    groups.set(key, existing);
  });

  return Array.from(groups.values())
    .map((group) => {
      const invested = group.items.reduce(
        (sum, item) => sum + item.invested,
        0,
      );
      return {
        ...group,
        profitPercent: invested > 0 ? (group.profit / invested) * 100 : 0,
      };
    })
    .sort((a, b) => groupOrder(a.key) - groupOrder(b.key));
}

function groupKeyForType(type: InvestmentType) {
  if (type === "cash_savings" || type === "money_market_fund") return "cash";
  if (type === "stock") return "stock";
  if (type === "bond" || type === "bond_fund") return "bond";
  if (type === "equity_fund") return "equity_fund";
  return "mixed_fund";
}

function groupTitleForType(type: InvestmentType) {
  const key = groupKeyForType(type);
  if (key === "cash") return "Dana Tabungan / Pasar Uang";
  if (key === "stock") return "Saham IDX";
  if (key === "bond") return "Obligasi";
  if (key === "equity_fund") return "Reksadana Saham";
  return "Campuran";
}

function groupOrder(key: string) {
  return ["cash", "stock", "bond", "equity_fund", "mixed_fund"].indexOf(key);
}

function riskProfileLabel(items: PortfolioItem[]) {
  if (items.length === 0) return "Belum ada data";
  const highRiskCount = items.filter(
    (item) => item.riskCategory === "high",
  ).length;
  const highRiskShare = highRiskCount / items.length;
  if (highRiskShare >= 0.5) return "Agresif";
  if (highRiskShare >= 0.25) return "Seimbang";
  return "Defensif";
}

function shortAllocationLabel(type: InvestmentType) {
  if (type === "money_market_fund") return "Pasar Uang";
  if (type === "bond_fund") return "Obligasi";
  if (type === "stock") return "Saham";
  if (type === "mixed_fund") return "Campuran";
  if (type === "cash_savings") return "Cash";
  return investmentTypeLabel(type);
}

function initials(value: string) {
  const clean = value.trim();
  if (!clean) return "AD";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PerformerSummary({
  title,
  performer,
  tone,
}: {
  title: string;
  performer: {
    item: PortfolioItem;
    profit: number;
    profitPercent: number;
  } | null;
  tone: "good" | "bad";
}) {
  const toneClass = tone === "good" ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="rounded-lg bg-stone-100 p-4">
      <p className="text-sm font-semibold text-stone-500">{title}</p>
      {performer ? (
        <>
          <p className="mt-2 font-semibold text-stone-950">
            {performer.item.name}
          </p>
          <p className={`mt-1 text-sm font-semibold ${toneClass}`}>
            {formatRupiah(performer.profit)} (
            {formatPercent(performer.profitPercent)})
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {dataSourceLabel(performer.item.dataSource)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Belum ada kepemilikan.</p>
      )}
    </div>
  );
}

function getWritablePortfolioBase(
  current: PortfolioItem[],
  hasStoredPortfolio: boolean,
) {
  return hasStoredPortfolio ? current : [];
}

function normalizeLookupTicker(value: string) {
  return normalizeMarketTicker(normalizeSafeTicker(value));
}

function createEmptyPortfolioForm(): PortfolioForm {
  return {
    name: "",
    type: "stock",
    ticker: "",
    buyPrice: 0,
    quantity: 0,
    currentPrice: 0,
    buyDate: new Date().toISOString().slice(0, 10),
    notes: "",
    riskCategory: "medium",
    dataSource: "manual_input",
  };
}

function normalizePortfolioItem(item: PortfolioItem): PortfolioItem {
  const ticker = item.ticker ?? "";
  return {
    ...item,
    id: item.id || crypto.randomUUID(),
    ticker: validateTicker(ticker, { optional: true })
      ? ""
      : normalizeSafeTicker(ticker),
    notes: item.notes ?? "",
    buyPrice: nonNegativeNumber(item.buyPrice),
    quantity: nonNegativeNumber(item.quantity),
    currentPrice: nonNegativeNumber(item.currentPrice),
    riskCategory: isRiskCategory(item.riskCategory)
      ? item.riskCategory
      : "medium",
    dataSource: isDataSource(item.dataSource)
      ? item.dataSource
      : "manual_input",
    lastPriceUpdatedAt: item.lastPriceUpdatedAt,
  };
}

function normalizePortfolioItems(items: PortfolioItem[]) {
  const seenIds = new Set<string>();

  return items.map((item) => {
    const normalized = normalizePortfolioItem(item);
    if (!seenIds.has(normalized.id)) {
      seenIds.add(normalized.id);
      return normalized;
    }

    const id = crypto.randomUUID();
    seenIds.add(id);
    return { ...normalized, id };
  });
}

function isRiskCategory(value: string): value is RiskCategory {
  return ["low", "medium", "high"].includes(value);
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

"use client";

import {
  type ReactNode,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AlertRule,
  DataSource,
  InvestmentType,
  PortfolioItem,
  RiskCategory,
} from "@/lib/types/investment";
import {
  localArahDanaStorage,
  setArahDanaStorageWriteEventsPaused,
} from "@/lib/storage/localStorage";
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
import { useAuth } from "@/components/AuthProvider";
import { InstrumentBadge } from "@/components/InstrumentBadge";
import {
  PortfolioPrivacyToggle,
  PrivateValue,
} from "@/components/PrivateValue";
import { InvestmentLogo } from "@/components/InvestmentLogo";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";
import {
  loadCloudAlertRules,
  loadCloudPortfolio,
  resetPortfolioForCurrentUser,
  saveCloudPortfolio,
} from "@/lib/supabase/sync";
import { normalizeSafeTicker, validateTicker } from "@/lib/validation";
import { ActionSheet } from "@/components/ActionSheet";
import { Button, ButtonLink } from "@/components/ui";
import { trackAppEvent } from "@/lib/monitoring/events";

type ManagedHolding = {
  holding: HoldingView;
  statusLabel: string;
} | null;

export function PortfolioTable() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [aprMoneyMarketFund, setAprMoneyMarketFund] = useState(0.05);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [syncMessage, setSyncMessage] = useState("Menyiapkan data...");
  const [managedHolding, setManagedHolding] = useState<ManagedHolding>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    let isMounted = true;
    const loadTimer = window.setTimeout(() => {
      void (async () => {
        if (isMounted) {
          setIsPortfolioLoading(true);
          if (user) setItems([]);
        }
        const storedAlertRules = localArahDanaStorage.readAlertRules() ?? [];

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
        if (!user) {
          if (!isMounted) return;
          const localModeItems = !isConfigured
            ? normalizePortfolioItems(localArahDanaStorage.readPortfolio() ?? [])
            : [];
          setItems(localModeItems);
          setAlertRules(storedAlertRules);
          setSyncMessage(
            isConfigured
              ? "Login untuk memuat portofolio akun."
              : "Mode lokal aktif. Data tersimpan di perangkat ini.",
          );
          setIsHydrated(true);
          setIsPortfolioLoading(false);
          return;
        }

        try {
          const cloudItems = await loadCloudPortfolio(user);
          const cloudAlertRules = await loadCloudAlertRules(user).catch(
            () => storedAlertRules,
          );
          if (!isMounted) return;
          const nextItems = normalizePortfolioItems(cloudItems);
          setItems(nextItems);
          setAlertRules(
            cloudAlertRules.length > 0 ? cloudAlertRules : storedAlertRules,
          );
          writePortfolioMirror(nextItems);
          setSyncMessage(
            nextItems.length > 0
              ? "Data aman dan siap dipakai."
              : "Portofolio akun masih kosong.",
          );
        } catch (error) {
          if (!isMounted) return;
          setItems([]);
          setAlertRules(storedAlertRules);
          setSyncMessage(
            error instanceof Error
              ? `Portofolio akun belum bisa dimuat. ${error.message}`
              : "Portofolio akun belum bisa dimuat.",
          );
        } finally {
          if (isMounted) {
            setIsHydrated(true);
            setIsPortfolioLoading(false);
          }
        }
      })();
    }, 0);
    return () => {
      isMounted = false;
      window.clearTimeout(loadTimer);
    };
  }, [isAuthLoading, isConfigured, user]);

  useEffect(() => {
    if (!isHydrated) return;
    let isMounted = true;

    async function refetchPortfolio() {
      if (isAuthLoading) return;
      if (user) {
        setIsPortfolioLoading(true);
        setItems([]);
      }

      try {
        const nextItems = user
          ? await loadCloudPortfolio(user)
          : !isConfigured
            ? (localArahDanaStorage.readPortfolio() ?? [])
            : [];
        if (!isMounted) return;
        const normalizedItems = normalizePortfolioItems(nextItems);
        setItems(normalizedItems);
        if (user) writePortfolioMirror(normalizedItems);
      } catch {
        if (!isMounted) return;
        setItems([]);
      } finally {
        if (isMounted) setIsPortfolioLoading(false);
      }
    }

    function handlePortfolioUpdate() {
      void refetchPortfolio();
    }

    window.addEventListener("arahdana:portfolio-updated", handlePortfolioUpdate);
    window.addEventListener(
      "arahdana:dashboard-summary-updated",
      handlePortfolioUpdate,
    );
    window.addEventListener("focus", handlePortfolioUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(
        "arahdana:portfolio-updated",
        handlePortfolioUpdate,
      );
      window.removeEventListener(
        "arahdana:dashboard-summary-updated",
        handlePortfolioUpdate,
      );
      window.removeEventListener("focus", handlePortfolioUpdate);
    };
  }, [isAuthLoading, isConfigured, isHydrated, user]);

  useEffect(() => {
    if (!isHydrated) return;

    function handleAutoRefreshStart() {
      setIsAutoRefreshing(true);
      setRefreshError("");
    }

    function handleAutoRefreshDone(event: Event) {
      setIsAutoRefreshing(false);
      const latestItems = localArahDanaStorage.readPortfolio();
      if (latestItems && (!isConfigured || user)) {
        setItems(normalizePortfolioItems(latestItems));
      }
      const detail = event instanceof CustomEvent ? event.detail : null;
      const updatedCount =
        detail && typeof detail.updatedCount === "number"
          ? detail.updatedCount
          : 0;
      const failedCount =
        detail && typeof detail.failedCount === "number"
          ? detail.failedCount
          : 0;
      if (updatedCount > 0) {
        setRefreshMessage(
          `Harga diperbarui otomatis. Update terakhir ${formatDateTime(new Date().toISOString())}.`,
        );
      } else if (failedCount > 0) {
        setRefreshError(
          "Harga belum bisa diperbarui otomatis. Data tersimpan tetap dipakai.",
        );
      }
    }

    window.addEventListener(
      "arahdana:portfolio-prices-refreshing",
      handleAutoRefreshStart,
    );
    window.addEventListener(
      "arahdana:portfolio-prices-updated",
      handleAutoRefreshDone,
    );
    return () => {
      window.removeEventListener(
        "arahdana:portfolio-prices-refreshing",
        handleAutoRefreshStart,
      );
      window.removeEventListener(
        "arahdana:portfolio-prices-updated",
        handleAutoRefreshDone,
      );
    };
  }, [isConfigured, isHydrated, user]);

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
  if (!isHydrated || isPortfolioLoading) {
    return (
      <LoadingState
        title="Memuat portofolio"
        message={
          user
            ? "Mengambil holding akun terbaru."
            : "Mengambil holding lokal bila mode tamu aktif."
        }
      />
    );
  }

  async function commitPortfolio(nextItems: PortfolioItem[], successMessage = "Portofolio siap.") {
    const normalizedItems = normalizePortfolioItems(nextItems);

    if (!isConfigured) {
      setItems(normalizedItems);
      localArahDanaStorage.writePortfolio(normalizedItems);
      setSyncMessage("Mode lokal aktif. Data tersimpan di perangkat ini.");
      return true;
    }

    if (!user) {
      setSyncMessage("Login untuk menyimpan portofolio akun.");
      return false;
    }

    try {
      setItems(normalizedItems);
      await saveCloudPortfolio(user, normalizedItems);
      const freshItems = normalizePortfolioItems(await loadCloudPortfolio(user));
      setItems(freshItems);
      localArahDanaStorage.writePortfolio(freshItems);
      setSyncMessage(successMessage);
      return true;
    } catch (error) {
      const cloudItems = await loadCloudPortfolio(user).catch(() => []);
      const freshItems = normalizePortfolioItems(cloudItems);
      setItems(freshItems);
      localArahDanaStorage.writePortfolio(freshItems);
      setSyncMessage(
        error instanceof Error
          ? `Perubahan belum tersimpan. ${error.message}`
          : "Perubahan belum tersimpan.",
      );
      return false;
    }
  }

  function deleteItem(id: string) {
    void (async () => {
      const didDelete = await commitPortfolio(
        items.filter((item) => item.id !== id),
        "Holding dihapus dari portofolio akun.",
      );
      if (didDelete) {
        trackAppEvent("portfolio_deleted", { page: "/portfolio" });
      }
    })();
  }

  async function resetPortfolio() {
    if (items.length === 0 || isResetting) return;
    const confirmed = window.confirm(
      "Reset semua holding dan laporan portofolio tersimpan?",
    );
    if (!confirmed) return;

    setIsResetting(true);
    setManagedHolding(null);
    setRefreshMessage("");
    setRefreshError("");

    try {
      setItems([]);
      await resetPortfolioForCurrentUser(user, { isConfigured });
      setSyncMessage(
        user
          ? "Portofolio akun sudah direset."
          : "Mode lokal aktif. Portofolio sudah direset.",
      );
    } catch (error) {
      setSyncMessage(
        error instanceof Error
          ? `Reset belum selesai. ${error.message}`
          : "Reset belum selesai.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  async function refreshPrices() {
    const refreshableItems = items.filter(
      (item) => item.ticker?.trim() && item.priceTrackingMode === "auto",
    );

    setRefreshMessage("");
    setRefreshError("");

    if (refreshableItems.length === 0) {
      setRefreshError(
        "Tidak ada holding dengan auto price tracking. Aktifkan mode Auto pada holding yang punya ticker.",
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
        const nextItems = items.map((item) => {
            const update = updates.get(item.id);
            if (!update) return item;
            return {
              ...item,
              currentPrice: update.latestClose,
              dataSource: "live_public_market_data" as const,
              lastPriceUpdatedAt: update.updatedAt,
            };
          });
        void commitPortfolio(nextItems, "Harga portofolio diperbarui.");
      }

      setRefreshMessage(
        updates.size > 0
          ? `${updates.size} harga diperbarui dari cache/provider market.`
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

  return (
    <div className="section-stack">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.55rem] p-5 text-white ring-1 ring-white/10 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  user
                    ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20"
                    : "bg-amber-300/15 text-amber-100 ring-amber-200/20"
                }`}
              >
                {user ? "Data aman" : isConfigured ? "Aman" : "Aman"}
              </span>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                {isAutoRefreshing ? "Auto refresh..." : "Harga otomatis"}
              </span>
            </div>
            <p className="mt-6 text-sm font-medium text-white/58">
              Total portofolio
            </p>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <h2 className="min-w-0 break-words text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                <PrivateValue>{formatRupiah(totals.current)}</PrivateValue>
              </h2>
              <PortfolioPrivacyToggle className="bg-white/12" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <PortfolioHeroMetric
            label="Total P/L"
            value={<PrivateValue>{formatRupiah(totals.profit)}</PrivateValue>}
            helper={formatPercent(totals.profitPercent)}
            tone={totals.profit >= 0 ? "good" : "bad"}
          />
          <PortfolioHeroMetric
            label="Modal"
            value={<PrivateValue>{formatRupiah(totals.invested)}</PrivateValue>}
            helper="Nilai masuk"
          />
          <PortfolioHeroMetric
            label="Profil risiko"
            value={riskProfileLabel(items)}
            helper={syncMessage}
          />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ButtonLink
              href="/porto/add"
              variant="primary"
              className="flex-1 sm:min-w-32 sm:flex-none"
            >
              Tambah
            </ButtonLink>
            <Button
              type="button"
              variant="icon"
              onClick={refreshPrices}
              disabled={isRefreshing || items.length === 0}
              className="bg-white/10 text-white/78 ring-white/12 hover:bg-white/15"
              aria-label="Cek harga"
              title="Cek harga"
            >
              <ReloadIcon className={isRefreshing ? "animate-spin" : ""} />
            </Button>
          </div>
          <p className="text-xs font-medium leading-5 text-white/54 sm:max-w-sm">
            Harga diperbarui otomatis di latar belakang saat data mulai usang.
          </p>
        </div>
      </section>

      <AllocationChips
        allocation={totals.allocation}
        groups={totals.groupedHoldings}
        alertRules={alertRules}
        onManage={(holding, statusLabel) =>
          setManagedHolding({ holding, statusLabel })
        }
      />

      {refreshMessage ? (
        <StatusStrip tone="success">{refreshMessage}</StatusStrip>
      ) : null}
      {refreshError ? (
        <StatusStrip tone="error">{refreshError}</StatusStrip>
      ) : null}

      <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">
              Performa detail
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Ringkasan performa dibuat tetap ringan agar halaman Porto fokus
              untuk memantau kepemilikan.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <ButtonLink href="/porto/manage" variant="secondary">
              Manage
            </ButtonLink>
            <Button
              type="button"
              variant="danger"
              onClick={resetPortfolio}
              disabled={items.length === 0 || isResetting}
            >
              {isResetting ? "Reset..." : "Reset"}
            </Button>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="mt-4 rounded-[1.2rem] border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
            <h3 className="font-semibold text-stone-950">
              Portofolio masih kosong
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Tambahkan holding pertama. Data lama dari cache lokal tidak akan
              mengisi ulang halaman ini.
            </p>
            <ButtonLink href="/porto/add" variant="primary" className="mt-4">
              Tambah holding
            </ButtonLink>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      {managedHolding ? (
        <HoldingManagementSheet
          holding={managedHolding.holding}
          statusLabel={managedHolding.statusLabel}
          onClose={() => setManagedHolding(null)}
          onEdit={() => {
            const item = managedHolding.holding.item;
            setManagedHolding(null);
            window.location.assign(
              `/porto/edit?id=${encodeURIComponent(item.id)}`,
            );
          }}
          onDelete={() => {
            const id = managedHolding.holding.item.id;
            setManagedHolding(null);
            deleteItem(id);
          }}
        />
      ) : null}
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

function holdingHealthStatus(holding: HoldingView, rules: AlertRule[]) {
  if (
    rules.some(
      (rule) =>
        rule.lastCheckStatus === "triggered" ||
        rule.lastCheckStatus === "error",
    ) ||
    holding.profitPercent <= -10 ||
    holding.item.riskCategory === "high"
  ) {
    return {
      label: "Perlu perhatian",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
    };
  }

  if (rules.some((rule) => rule.enabled) || holding.isEstimated) {
    return {
      label: "Dipantau",
      className: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    };
  }

  return {
    label: "Aman",
    className: "bg-stone-100 text-stone-600 ring-stone-200",
  };
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
  value: ReactNode;
  helper?: ReactNode;
  tone?: "neutral" | "good" | "bad";
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-200"
      : tone === "bad"
        ? "text-rose-200"
        : "text-white";

  return (
    <div className="rounded-[1.15rem] bg-white/8 p-4 ring-1 ring-white/10">
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
  groups,
  alertRules,
  onManage,
}: {
  allocation: Array<{
    key: string;
    label: string;
    value: number;
    percent: number;
  }>;
  groups: HoldingGroup[];
  alertRules: AlertRule[];
  onManage: (holding: HoldingView, statusLabel: string) => void;
}) {
  const [openType, setOpenType] = useState<InvestmentType | null>(null);
  const visibleTypes: InvestmentType[] = [
    "money_market_fund",
    "bond_fund",
    "stock",
    "mixed_fund",
    "cash_savings",
  ];
  const byType = new Map(allocation.map((item) => [item.key, item]));
  const holdings = groups.flatMap((group) => group.items);
  const openHoldings = openType
    ? holdings.filter((holding) =>
        segmentTypes(openType).includes(holding.item.type),
      )
    : [];

  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {visibleTypes.map((type) => {
          const item = byType.get(type);
          const isOpen = openType === type;
          return (
            <button
              type="button"
              key={type}
              aria-expanded={isOpen}
              onClick={() =>
                setOpenType((current) => (current === type ? null : type))
              }
              className={`inline-flex min-h-[3.9rem] w-[4.9rem] shrink-0 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-2 py-2 text-center ring-1 transition-colors sm:min-h-10 sm:w-auto sm:min-w-fit sm:flex-row sm:gap-2 sm:px-3.5 ${
                isOpen
                  ? "bg-stone-950 text-white ring-stone-800"
                  : "bg-stone-50 text-stone-950 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              <span
                className={`max-w-full break-words text-[0.68rem] font-semibold leading-tight sm:text-xs ${
                  isOpen ? "text-white/68" : "text-stone-500"
                }`}
              >
                {shortAllocationLabel(type)}
              </span>
              <span className="text-sm font-semibold leading-none sm:leading-normal">
                {item?.percent ?? 0}%
              </span>
            </button>
          );
        })}
      </div>

      {openType ? (
        <div className="mt-4 grid gap-2.5 border-t border-stone-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Segmen
              </p>
              <h3 className="mt-1 font-semibold text-stone-950">
                {shortAllocationLabel(openType)}
              </h3>
            </div>
            <span className="inline-flex min-h-7 items-center rounded-full bg-stone-100 px-3 text-xs font-semibold text-stone-600 ring-1 ring-stone-200/80">
              {openHoldings.length} produk
            </span>
          </div>
          {openHoldings.length > 0 ? (
            openHoldings.map((holding) => (
              <HoldingRow
                key={holding.item.id}
                holding={holding}
                alertRules={alertRules.filter(
                  (rule) =>
                    rule.sourceType === "portfolio" &&
                    rule.sourceId === holding.item.id,
                )}
                onManage={onManage}
              />
            ))
          ) : (
            <p className="rounded-[1rem] bg-stone-50 p-4 text-sm font-medium text-stone-500 ring-1 ring-stone-200/80">
              Belum ada holding di segmen ini.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function segmentTypes(type: InvestmentType): InvestmentType[] {
  if (type === "money_market_fund") return ["money_market_fund"];
  if (type === "cash_savings") return ["cash_savings"];
  if (type === "bond_fund") return ["bond_fund", "bond"];
  return [type];
}

const HoldingRow = memo(function HoldingRow({
  holding,
  alertRules,
  onManage,
}: {
  holding: HoldingView;
  alertRules: AlertRule[];
  onManage: (holding: HoldingView, statusLabel: string) => void;
}) {
  const profitClass =
    holding.profit >= 0 ? "text-emerald-700" : "text-rose-700";
  const status = holdingHealthStatus(holding, alertRules);
  const longPressTimerRef = useRef<number | null>(null);

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function startLongPress() {
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      onManage(holding, status.label);
      longPressTimerRef.current = null;
    }, 520);
  }

  useEffect(() => clearLongPressTimer, []);

  return (
    <div
      className="min-w-0 touch-manipulation rounded-[1.15rem] bg-white p-3.5 ring-1 ring-stone-200/80 transition-all hover:shadow-md sm:p-4"
      onPointerDown={startLongPress}
      onPointerLeave={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onPointerUp={clearLongPressTimer}
    >
      <div className="flex items-start gap-3">
        <InvestmentLogo
          name={holding.item.name}
          ticker={holding.item.ticker}
          className="h-11 w-11"
          fallbackInitials={initials(holding.item.name)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="break-words font-semibold text-stone-950">
                {holding.item.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <InstrumentBadge type={holding.item.type} compact />
                {holding.item.ticker ? (
                  <span className="inline-flex min-h-7 items-center rounded-full bg-stone-100 px-2.5 text-[0.68rem] font-bold leading-none text-stone-500 ring-1 ring-stone-200/70">
                    {holding.item.ticker}
                  </span>
                ) : null}
                <span className="inline-flex min-h-7 items-center rounded-full bg-emerald-50 px-2.5 text-[0.68rem] font-bold leading-none text-emerald-800 ring-1 ring-emerald-100">
                  {holding.item.priceTrackingMode === "auto"
                    ? holding.item.dataSource === "live_public_market_data"
                      ? "Auto price"
                      : "Harga otomatis belum tersedia"
                    : "Manual"}
                </span>
              </div>
            </div>
            <div className="min-w-0 text-left sm:text-right">
              <p className="break-words font-semibold text-stone-950">
                <PrivateValue>{formatRupiah(holding.current)}</PrivateValue>
              </p>
              <p
                className={`mt-1 break-words text-sm font-semibold ${profitClass}`}
              >
                <PrivateValue>{formatRupiah(holding.profit)}</PrivateValue> (
                {formatPercent(holding.profitPercent)})
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-200/80 pt-3">
            <span
              className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold leading-none ring-1 ${status.className}`}
            >
              {status.label}
            </span>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onManage(holding, status.label);
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-lg font-semibold leading-none text-stone-500 ring-1 ring-stone-200 hover:bg-white"
              aria-label={`Kelola ${holding.item.name}`}
            >
              ...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

function HoldingManagementSheet({
  holding,
  statusLabel,
  onClose,
  onEdit,
  onDelete,
}: {
  holding: HoldingView;
  statusLabel: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const titleId = `holding-actions-${holding.item.id}`;

  return (
    <ActionSheet labelledBy={titleId} onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={titleId} className="break-words text-lg font-semibold">
            {holding.item.name}
          </p>
          <p className="mt-1 text-sm font-medium text-stone-500">
            {statusLabel} |{" "}
            <PrivateValue>{formatRupiah(holding.current)}</PrivateValue>
          </p>
        </div>
        <Button
          type="button"
          variant="icon"
          onClick={onClose}
          className="h-9 w-9 bg-stone-100 text-xl leading-none text-stone-500"
          aria-label="Tutup"
        >
          x
        </Button>
      </div>

      <div className="mt-4 grid gap-2">
        <ButtonLink
          href={`/alerts?source=portfolio&id=${encodeURIComponent(holding.item.id)}&type=portfolio_loss`}
          variant="secondary"
          className="justify-start"
        >
          Atur batas rugi
        </ButtonLink>
        <ButtonLink
          href={`/alerts?source=portfolio&id=${encodeURIComponent(holding.item.id)}&type=concentration_risk`}
          variant="secondary"
          className="justify-start"
        >
          Atur alokasi
        </ButtonLink>
        <ButtonLink
          href={`/alerts?source=portfolio&id=${encodeURIComponent(holding.item.id)}&type=risk_score_worsens`}
          variant="secondary"
          className="justify-start"
        >
          Atur risiko
        </ButtonLink>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="danger" onClick={onDelete}>
            Hapus
          </Button>
        </div>
      </div>
    </ActionSheet>
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
            <PrivateValue>{formatRupiah(performer.profit)}</PrivateValue> (
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

function ReloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M3 12A9 9 0 0 1 18.5 5.8" />
      <path d="M18 2v4h4" />
      <path d="M6 22v-4H2" />
    </svg>
  );
}

function normalizeLookupTicker(value: string) {
  return normalizeMarketTicker(normalizeSafeTicker(value));
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
    marketAssetId: item.marketAssetId,
    priceTrackingMode:
      item.priceTrackingMode === "auto" ? "auto" : "manual",
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

function writePortfolioMirror(items: PortfolioItem[]) {
  setArahDanaStorageWriteEventsPaused(true);
  try {
    localArahDanaStorage.writePortfolio(items);
  } finally {
    setArahDanaStorageWriteEventsPaused(false);
  }
}

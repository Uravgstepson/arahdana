"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LoadingState } from "@/components/AppState";
import { useAuth } from "@/components/AuthProvider";
import { MeasuredChartFrame } from "@/components/MeasuredChartFrame";
import { PrivateValue } from "@/components/PrivateValue";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  loadCloudGoalContributions,
  loadCloudGoals,
  loadCloudPortfolio,
  loadCloudSettings,
  saveCloudGoalContributions,
  saveCloudGoals,
} from "@/lib/supabase/sync";
import type {
  FinancialGoal,
  GoalContribution,
  InvestmentType,
  PortfolioItem,
} from "@/lib/types/investment";
import {
  formatRupiah,
  nonNegativeNumber,
} from "@/lib/utils/format";
import { usePerformanceMode } from "@/lib/utils/performanceMode";
import {
  goalCategoryLabel,
  goalRiskProfile,
  investmentLabel,
  planFinancialGoal,
  type GoalPlan,
} from "@/lib/goals/goalPlanner";
import { validatePositiveNumber } from "@/lib/validation";

type ContributionDraft = Record<string, { amount: number; contributionMonth: string; note: string }>;

const selectableInstrumentTypes: InvestmentType[] = [
  "cash_savings",
  "money_market_fund",
  "bond_fund",
  "mixed_fund",
  "equity_fund",
  "stock",
];

export default function GoalsPage() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [aprMoneyMarketFund, setAprMoneyMarketFund] = useState(0.05);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Memuat tujuan finansial...");
  const [drafts, setDrafts] = useState<ContributionDraft>({});

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    window.setTimeout(() => {
      void (async () => {
        const localGoals = normalizeGoals(localArahDanaStorage.readGoals() ?? []);
        const localContributions = normalizeContributions(
          localArahDanaStorage.readGoalContributions() ?? [],
        );
        const localPortfolio = !isConfigured
          ? localArahDanaStorage.readPortfolio() ?? []
          : [];
        const localSettings = localArahDanaStorage.readSettings();
        const localApr =
          typeof localSettings?.aprMoneyMarketFund === "number" &&
          Number.isFinite(localSettings.aprMoneyMarketFund)
            ? nonNegativeNumber(localSettings.aprMoneyMarketFund)
            : 0.05;

        if (!user) {
          if (!isMounted) return;
          setGoals(localGoals);
          setContributions(localContributions);
          setPortfolio(localPortfolio);
          setAprMoneyMarketFund(localApr);
          setSyncMessage("Tujuan aman di perangkat ini.");
          setIsHydrated(true);
          return;
        }

        try {
          const [cloudGoals, cloudContributions, cloudPortfolio, cloudSettings] =
            await Promise.all([
              loadCloudGoals(user),
              loadCloudGoalContributions(user),
              loadCloudPortfolio(user),
              loadCloudSettings(user),
            ]);
          if (!isMounted) return;
          const nextGoals = cloudGoals.length > 0 ? cloudGoals : localGoals;
          const nextContributions =
            cloudContributions.length > 0 ? cloudContributions : localContributions;
          const nextPortfolio = cloudPortfolio;
          setGoals(nextGoals);
          setContributions(nextContributions);
          setPortfolio(nextPortfolio);
          setAprMoneyMarketFund(
            nonNegativeNumber(cloudSettings?.aprMoneyMarketFund ?? localApr),
          );
          localArahDanaStorage.writeGoals(nextGoals);
          localArahDanaStorage.writeGoalContributions(nextContributions);
          localArahDanaStorage.writePortfolio(nextPortfolio);
          setSyncMessage(
            cloudGoals.length > 0
              ? "Tujuan siap dan terjaga."
              : "Tujuan siap. Data baru akan dijaga otomatis.",
          );
        } catch (error) {
          if (!isMounted) return;
          setGoals(localGoals);
          setContributions(localContributions);
          setPortfolio(user ? [] : localPortfolio);
          setAprMoneyMarketFund(localApr);
          setSyncMessage(
            error instanceof Error
              ? `Tujuan tetap aman di perangkat ini. ${error.message}`
              : "Tujuan tetap aman di perangkat ini.",
          );
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, user]);

  useEffect(() => {
    if (!isHydrated) return;
    localArahDanaStorage.writeGoals(goals);
    if (!user) return;

    void saveCloudGoals(user, goals)
      .then(() => setSyncMessage("Tujuan tersimpan."))
      .catch((error) =>
        setSyncMessage(
          error instanceof Error
            ? `Tujuan tersimpan di perangkat ini. ${error.message}`
            : "Tujuan tersimpan di perangkat ini.",
        ),
      );
  }, [goals, isHydrated, user]);

  useEffect(() => {
    if (!isHydrated) return;
    localArahDanaStorage.writeGoalContributions(contributions);
    if (!user) return;

    void saveCloudGoalContributions(user, contributions)
      .then(() => setSyncMessage("Kontribusi tersimpan."))
      .catch((error) =>
        setSyncMessage(
          error instanceof Error
            ? `Kontribusi tersimpan di perangkat ini. ${error.message}`
            : "Kontribusi tersimpan di perangkat ini.",
        ),
      );
  }, [contributions, isHydrated, user]);

  const plans = useMemo(() => {
    return goals.map((goal) => ({
      goal,
      plan: planFinancialGoal({
        goal,
        portfolio,
        contributions,
        aprMoneyMarketFund,
      }),
    }));
  }, [aprMoneyMarketFund, contributions, goals, portfolio]);

  function deleteGoal(id: string) {
    setGoals((current) => current.filter((goal) => goal.id !== id));
    setContributions((current) => current.filter((item) => item.goalId !== id));
  }

  function addContribution(goal: FinancialGoal) {
    const draft = drafts[goal.id] ?? createContributionDraft(goal);
    const amountError = validatePositiveNumber(draft.amount, "Kontribusi");
    if (amountError) {
      setSyncMessage(amountError);
      return;
    }

    const contribution: GoalContribution = {
      id: crypto.randomUUID(),
      goalId: goal.id,
      amount: nonNegativeNumber(draft.amount),
      contributionMonth: safeMonth(draft.contributionMonth),
      note: draft.note.trim(),
      createdAt: new Date().toISOString(),
    };
    setContributions((current) => [contribution, ...current]);
    setDrafts((current) => ({
      ...current,
      [goal.id]: createContributionDraft(goal),
    }));
  }

  function deleteContribution(id: string) {
    setContributions((current) => current.filter((item) => item.id !== id));
  }

  if (!isHydrated) {
    return (
      <LoadingState
        title="Memuat tujuan"
        message="Mengambil tujuan finansial lokal dan cloud bila akun tersedia."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.8rem] p-5 text-white sm:p-6">
        <p className="text-sm font-medium text-white/62">Smart DCA Planner</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Rencanakan tujuan dengan disiplin
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
          Buat target jangka panjang, hubungkan holding portofolio, dan lihat estimasi DCA konservatif. Proyeksi ini bukan janji return.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <HeroMetric label="Tujuan aktif" value={`${goals.length}`} />
          <HeroMetric label="Kontribusi tercatat" value={`${contributions.length}`} />
          <HeroMetric label="Status" value={user ? "Data aman" : "Aman"} />
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-stone-950">Status penyimpanan</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">{syncMessage}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="h-fit rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Focused flow
          </p>
          <h2 className="mt-2 text-lg font-semibold text-stone-950">
            Kelola tujuan di halaman khusus
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Pembuatan dan edit tujuan dipindahkan ke flow bertahap agar halaman
            ini tetap menjadi ringkasan dan monitor progress.
          </p>
          <div className="mt-4 grid gap-2">
            <Link
              href="/goals/new"
              className="inline-flex min-h-11 items-center justify-center rounded-[1rem] bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
            >
              Buat tujuan baru
            </Link>
            <Link
              href="/goals/edit"
              className="inline-flex min-h-11 items-center justify-center rounded-[1rem] bg-stone-950/5 px-4 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-950/10"
            >
              Edit tujuan
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          {goals.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-stone-950">Belum ada tujuan</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
                Mulai dari dana darurat, pendidikan, rumah, atau tujuan custom. ArahDana akan membantu menghitung DCA dan peringatan risikonya.
              </p>
            </div>
          ) : null}

          {plans.map(({ goal, plan }) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              plan={plan}
              portfolio={portfolio}
              contributions={contributions.filter((item) => item.goalId === goal.id)}
              draft={drafts[goal.id] ?? createContributionDraft(goal)}
              onDraftChange={(draft) =>
                setDrafts((current) => ({ ...current, [goal.id]: draft }))
              }
              onAddContribution={() => addContribution(goal)}
              onDeleteContribution={deleteContribution}
              onEdit={() => {
                window.location.assign(
                  `/goals/edit?id=${encodeURIComponent(goal.id)}`,
                );
              }}
              onDelete={() => deleteGoal(goal.id)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  plan,
  portfolio,
  contributions,
  draft,
  onDraftChange,
  onAddContribution,
  onDeleteContribution,
  onEdit,
  onDelete,
}: {
  goal: FinancialGoal;
  plan: GoalPlan;
  portfolio: PortfolioItem[];
  contributions: GoalContribution[];
  draft: { amount: number; contributionMonth: string; note: string };
  onDraftChange: (draft: { amount: number; contributionMonth: string; note: string }) => void;
  onAddContribution: () => void;
  onDeleteContribution: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const linkedNames = portfolio
    .filter((item) => goal.linkedHoldingIds.includes(item.id))
    .map((item) => item.name);

  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              {goalCategoryLabel(goal.category)}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
              {riskLabel(goal.riskProfile)}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950">{goal.name}</h2>
          <p className="mt-1 text-sm text-stone-500">
            Target {formatDate(goal.targetDate)} | {plan.monthsRemaining} bulan tersisa
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Hapus
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Target" value={<PrivateValue>{formatRupiah(goal.targetAmount)}</PrivateValue>} />
        <Metric label="Progress" value={<PrivateValue>{formatRupiah(plan.currentProgress)}</PrivateValue>} helper={`${plan.progressPercent}%`} />
        <Metric label="DCA disarankan" value={<PrivateValue>{formatRupiah(plan.requiredMonthlyInvestment)}</PrivateValue>} helper="Estimasi tenang" />
        <Metric label="Streak" value={`${plan.contributionStreak} bulan`} helper="Kontribusi rutin" />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
          <span>Progress</span>
          <span>{plan.progressPercent}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-emerald-700"
            style={{ width: `${Math.min(100, plan.progressPercent)}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <ProjectionChart plan={plan} />
        <div className="grid gap-4">
          <AllocationSummary title="Alokasi rekomendasi" items={plan.recommendedAllocation} />
          <div className="grid gap-3 sm:grid-cols-2">
            <AllocationSummary title="Lebih aman" items={plan.saferAllocation} compact />
            <AllocationSummary title="Lebih agresif" items={plan.aggressiveAllocation} compact />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[1.2rem] bg-stone-100 p-4">
          <h3 className="text-sm font-semibold text-stone-950">Penjelasan</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">{plan.explanation}</p>
          <p className="mt-3 text-xs font-semibold text-amber-800">
            Proyeksi ini bukan janji return. Selalu verifikasi dan sesuaikan dengan kondisi keuangan pribadi.
          </p>
          <div className="mt-4 grid gap-2 text-sm text-stone-600">
            <p>
              <span className="font-semibold text-stone-950">Range:</span>{" "}
              <PrivateValue>{formatRupiah(plan.lowFutureValue)} - {formatRupiah(plan.highFutureValue)}</PrivateValue>
            </p>
            <p>
              <span className="font-semibold text-stone-950">Estimasi selesai:</span>{" "}
              {plan.estimatedCompletion}
            </p>
            <p>
              <span className="font-semibold text-stone-950">Holding terhubung:</span>{" "}
              {linkedNames.length ? linkedNames.join(", ") : "Belum ada"}
            </p>
          </div>
        </section>

        <section className="rounded-[1.2rem] bg-stone-100 p-4">
          <h3 className="text-sm font-semibold text-stone-950">Peringatan</h3>
          <div className="mt-3 grid gap-2">
            {plan.warnings.length === 0 ? (
              <p className="rounded-[1rem] bg-white p-3 text-sm text-stone-600">
                Belum ada peringatan besar. Tetap tinjau target secara berkala.
              </p>
            ) : null}
            {plan.warnings.map((warning) => (
              <p
                key={warning}
                className="rounded-[1rem] bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-900 ring-1 ring-amber-100"
              >
                {warning}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[1.2rem] border border-stone-200 bg-white/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-950">Catat kontribusi</h3>
            <p className="mt-1 text-sm text-stone-500">
              Streak dihitung dari kontribusi bulanan yang tercatat.
            </p>
          </div>
          <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            {contributions.length} catatan
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            className="input"
            type="number"
            min="0"
            value={draft.amount || ""}
            onChange={(event) =>
              onDraftChange({ ...draft, amount: nonNegativeNumber(Number(event.target.value)) })
            }
            aria-label="Jumlah kontribusi"
          />
          <input
            className="input"
            type="month"
            value={draft.contributionMonth}
            onChange={(event) => onDraftChange({ ...draft, contributionMonth: event.target.value })}
            aria-label="Bulan kontribusi"
          />
          <input
            className="input"
            value={draft.note}
            onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
            placeholder="Catatan opsional"
            aria-label="Catatan kontribusi"
          />
          <button
            type="button"
            onClick={onAddContribution}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Catat
          </button>
        </div>
        {contributions.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {contributions.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[1rem] bg-stone-100 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-stone-950">
                    <PrivateValue>{formatRupiah(item.amount)}</PrivateValue> | {item.contributionMonth}
                  </p>
                  {item.note ? <p className="truncate text-xs text-stone-500">{item.note}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteContribution(item.id)}
                  className="shrink-0 rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </article>
  );
}

function ProjectionChart({ plan }: { plan: GoalPlan }) {
  const performanceProfile = usePerformanceMode();

  return (
    <section className="rounded-[1.2rem] bg-stone-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-950">Proyeksi konservatif</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600">
          Bukan janji return
        </span>
      </div>
      <MeasuredChartFrame className="mt-4 h-64">
        {({ width, height }) => (
          <LineChart
            width={width}
            height={height}
            data={plan.projection}
            margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
          >
            <CartesianGrid stroke="#e7edf3" strokeDasharray="3 3" />
            <XAxis dataKey="month" minTickGap={20} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis
              width={72}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(value) => compactRupiah(Number(value))}
            />
            {performanceProfile.simplifyTooltips ? null : (
              <Tooltip content={<ProjectionTooltip />} />
            )}
            <Line type="monotone" dataKey="low" name="Rendah" stroke="#94a3b8" strokeWidth={1.8} dot={false} isAnimationActive={!performanceProfile.reduceChartAnimation} />
            <Line type="monotone" dataKey="base" name="Base" stroke="#087f5b" strokeWidth={2.4} dot={false} isAnimationActive={!performanceProfile.reduceChartAnimation} />
            <Line type="monotone" dataKey="high" name="Tinggi" stroke="#2563eb" strokeWidth={1.8} dot={false} isAnimationActive={!performanceProfile.reduceChartAnimation} />
          </LineChart>
        )}
      </MeasuredChartFrame>
    </section>
  );
}

function ProjectionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white/95 p-3 text-sm shadow-sm">
      <p className="font-semibold text-stone-950">{label}</p>
      <div className="mt-2 grid gap-1">
        {payload.map((item) => (
          <p key={item.name} className="flex items-center justify-between gap-4 text-stone-600">
            <span>{item.name}</span>
            <span className="font-semibold text-stone-950"><PrivateValue>{formatRupiah(Number(item.value ?? 0))}</PrivateValue></span>
          </p>
        ))}
      </div>
    </div>
  );
}

function AllocationSummary({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: GoalPlan["recommendedAllocation"];
  compact?: boolean;
}) {
  return (
    <section className="rounded-[1.2rem] bg-stone-100 p-4">
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={`${title}-${item.type}`} className="rounded-[1rem] bg-white p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-stone-950">
                {compact ? investmentLabel(item.type) : item.label}
              </span>
              <span className="font-semibold text-emerald-700">{item.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-emerald-700" style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/48">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-[1.1rem] bg-stone-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-stone-950">{value}</p>
      {helper ? <p className="mt-1 text-sm text-stone-500">{helper}</p> : null}
    </div>
  );
}

function createContributionDraft(goal: FinancialGoal) {
  return {
    amount: goal.monthlyContribution,
    contributionMonth: new Date().toISOString().slice(0, 7),
    note: "",
  };
}

function normalizeGoals(items: FinancialGoal[]) {
  return items.map((goal) => ({
    ...goal,
    targetAmount: nonNegativeNumber(goal.targetAmount),
    monthlyContribution: nonNegativeNumber(goal.monthlyContribution),
    riskTolerance: clampRisk(goal.riskTolerance),
    riskProfile: goalRiskProfile(goal.riskTolerance),
    preferredInstruments: dedupeInstruments(goal.preferredInstruments ?? []),
    linkedHoldingIds: Array.isArray(goal.linkedHoldingIds) ? goal.linkedHoldingIds : [],
    createdAt: goal.createdAt ?? new Date().toISOString(),
    updatedAt: goal.updatedAt ?? new Date().toISOString(),
  }));
}

function normalizeContributions(items: GoalContribution[]) {
  return items.map((item) => ({
    ...item,
    amount: nonNegativeNumber(item.amount),
    contributionMonth: safeMonth(item.contributionMonth),
    note: item.note ?? "",
    createdAt: item.createdAt ?? new Date().toISOString(),
  }));
}

function dedupeInstruments(items: InvestmentType[]) {
  const allowed = new Set(selectableInstrumentTypes);
  return Array.from(new Set(items.filter((item) => allowed.has(item))));
}

function clampRisk(value: number) {
  if (!Number.isFinite(value)) return 15;
  return Math.min(30, Math.max(5, value));
}

function riskLabel(value: FinancialGoal["riskProfile"]) {
  if (value === "defensive") return "Defensif";
  if (value === "balanced") return "Seimbang";
  return "Agresif";
}

function safeMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 7);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

function compactRupiah(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)} M`;
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 1_000_000)} jt`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return value.toLocaleString("id-ID");
}

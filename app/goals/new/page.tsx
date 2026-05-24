"use client";

import { useState } from "react";
import {
  FlowPanel,
  FlowStep,
  FocusedFlowShell,
  StickyFlowActions,
} from "@/components/FocusedFlow";
import { Button, ButtonLink } from "@/components/ui";
import { goalCategoryLabel, goalRiskProfile } from "@/lib/goals/goalPlanner";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type {
  FinancialGoal,
  FinancialGoalCategory,
  InvestmentType,
} from "@/lib/types/investment";
import { formatRupiah, nonNegativeNumber } from "@/lib/utils/format";

type GoalDraft = {
  category: FinancialGoalCategory;
  name: string;
  targetAmount: string;
  targetDate: string;
  monthlyContribution: string;
  riskTolerance: number;
  preferredInstruments: InvestmentType[];
};

const categories: FinancialGoalCategory[] = [
  "emergency_fund",
  "education",
  "motorcycle",
  "car",
  "house",
  "retirement",
  "custom",
];

const instrumentChoices: InvestmentType[] = [
  "cash_savings",
  "money_market_fund",
  "bond_fund",
  "mixed_fund",
  "equity_fund",
  "stock",
];

const steps = ["Nama", "Target", "Setoran", "Summary"];

export default function NewGoalPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GoalDraft>(() => ({
    category: "emergency_fund",
    name: "",
    targetAmount: "",
    targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .slice(0, 10),
    monthlyContribution: "",
    riskTolerance: 35,
    preferredInstruments: ["money_market_fund"],
  }));
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState("");

  function update(next: Partial<GoalDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError("");
  }

  function validateCurrentStep() {
    if (step === 0 && !draft.name.trim()) return "Nama tujuan wajib diisi.";
    if (step === 1 && parseNumber(draft.targetAmount) <= 0) {
      return "Target dana wajib lebih dari 0.";
    }
    if (step === 2 && parseNumber(draft.monthlyContribution) < 0) {
      return "Setoran bulanan tidak boleh negatif.";
    }
    return "";
  }

  function saveGoal() {
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }
    const now = new Date().toISOString();
    const goal: FinancialGoal = {
      id: crypto.randomUUID(),
      category: draft.category,
      name: draft.name.trim(),
      targetAmount: parseNumber(draft.targetAmount),
      targetDate: draft.targetDate,
      monthlyContribution: parseNumber(draft.monthlyContribution),
      riskTolerance: clampRisk(draft.riskTolerance),
      riskProfile: goalRiskProfile(draft.riskTolerance),
      preferredInstruments: draft.preferredInstruments,
      linkedHoldingIds: [],
      createdAt: now,
      updatedAt: now,
    };
    const current = localArahDanaStorage.readGoals() ?? [];
    localArahDanaStorage.writeGoals([goal, ...current]);
    setSavedName(goal.name);
  }

  if (savedName) {
    return (
      <FocusedFlowShell
        eyebrow="Tujuan"
        title="Goal Created"
        description={`${savedName} sudah dibuat. Result screen dipisahkan supaya aksi selesai terasa jelas.`}
        backHref="/goals"
      >
        <FlowPanel className="grid gap-3">
          <ButtonLink href="/goals" variant="primary">
            Lihat Tujuan
          </ButtonLink>
          <ButtonLink href="/portfolio" variant="secondary">
            Hubungkan Porto
          </ButtonLink>
        </FlowPanel>
      </FocusedFlowShell>
    );
  }

  return (
    <FocusedFlowShell
      eyebrow="Goal Planning"
      title="Buat tujuan finansial"
      description="Goal planning dibuat bertahap agar keputusan target, waktu, dan kontribusi terasa lebih tenang di layar mobile."
      backHref="/goals"
    >
      <FlowPanel className="grid gap-5">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {steps.map((label, index) => (
            <FlowStep
              key={label}
              number={index + 1}
              title={label}
              active={step === index}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Nama tujuan
              <input
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="Dana darurat, rumah, pendidikan..."
                className="min-h-12 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 text-sm font-medium outline-none focus:border-emerald-300 focus:bg-white"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => update({ category })}
                  className={`rounded-[1rem] p-4 text-left text-sm font-semibold ring-1 ${
                    draft.category === category
                      ? "bg-emerald-50 text-emerald-950 ring-emerald-200"
                      : "bg-stone-50 text-stone-700 ring-stone-200"
                  }`}
                >
                  {goalCategoryLabel(category)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Target dana"
              value={draft.targetAmount}
              onChange={(value) => update({ targetAmount: value })}
              placeholder="50000000"
            />
            <InputField
              label="Target tanggal"
              type="date"
              value={draft.targetDate}
              onChange={(value) => update({ targetDate: value })}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <InputField
              label="Setoran bulanan"
              value={draft.monthlyContribution}
              onChange={(value) => update({ monthlyContribution: value })}
              placeholder="2500000"
            />
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Toleransi risiko: {draft.riskTolerance}%
              <input
                type="range"
                min={0}
                max={100}
                value={draft.riskTolerance}
                onChange={(event) =>
                  update({ riskTolerance: Number(event.target.value) })
                }
                className="accent-emerald-500"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {instrumentChoices.map((type) => {
                const active = draft.preferredInstruments.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      update({
                        preferredInstruments: active
                          ? draft.preferredInstruments.filter(
                              (item) => item !== type,
                            )
                          : [...draft.preferredInstruments, type],
                      })
                    }
                    className={`rounded-[1rem] p-3 text-left text-xs font-semibold ring-1 ${
                      active
                        ? "bg-stone-950 text-white ring-stone-950"
                        : "bg-stone-50 text-stone-700 ring-stone-200"
                    }`}
                  >
                    {type.replaceAll("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3">
            <SummaryRow label="Nama" value={draft.name || "-"} />
            <SummaryRow label="Kategori" value={goalCategoryLabel(draft.category)} />
            <SummaryRow
              label="Target"
              value={formatRupiah(parseNumber(draft.targetAmount))}
            />
            <SummaryRow label="Timeline" value={draft.targetDate} />
            <SummaryRow
              label="Setoran"
              value={formatRupiah(parseNumber(draft.monthlyContribution))}
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-[1rem] bg-rose-50 p-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-100">
            {error}
          </p>
        ) : null}
      </FlowPanel>

      <StickyFlowActions>
        <Button
          type="button"
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
        >
          Kembali
        </Button>
        {step === steps.length - 1 ? (
          <Button type="button" variant="primary" onClick={saveGoal}>
            Simpan tujuan
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              const validation = validateCurrentStep();
              if (validation) {
                setError(validation);
                return;
              }
              setStep((current) => current + 1);
            }}
          >
            Lanjut
          </Button>
        )}
      </StickyFlowActions>
    </FocusedFlowShell>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-800">
      {label}
      <input
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 text-sm font-medium outline-none focus:border-emerald-300 focus:bg-white"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-[1rem] bg-stone-50 p-4 ring-1 ring-stone-200">
      <span className="text-sm font-medium text-stone-500">{label}</span>
      <span className="text-right text-sm font-semibold text-stone-950">
        {value}
      </span>
    </div>
  );
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? nonNegativeNumber(parsed) : 0;
}

function clampRisk(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

"use client";

import { useState } from "react";
import { FlowPanel, FocusedFlowShell, StickyFlowActions } from "@/components/FocusedFlow";
import { Button, ButtonLink } from "@/components/ui";
import { goalCategoryLabel, goalRiskProfile } from "@/lib/goals/goalPlanner";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { FinancialGoal } from "@/lib/types/investment";
import { formatRupiah, nonNegativeNumber } from "@/lib/utils/format";

export default function EditGoalPage() {
  const [goals, setGoals] = useState<FinancialGoal[]>(
    () => localArahDanaStorage.readGoals() ?? [],
  );
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("id") ?? "";
  });
  const selectedGoal = goals.find((goal) => goal.id === selectedId) ?? null;
  const [draft, setDraft] = useState(() => selectedGoalToDraft(selectedGoal));
  const [isSaved, setIsSaved] = useState(false);

  function chooseGoal(goal: FinancialGoal) {
    setSelectedId(goal.id);
    setDraft(selectedGoalToDraft(goal));
    setIsSaved(false);
  }

  function saveGoal() {
    if (!selectedGoal) return;
    const updated: FinancialGoal = {
      ...selectedGoal,
      name: draft.name.trim() || selectedGoal.name,
      targetAmount: parseNumber(draft.targetAmount),
      targetDate: draft.targetDate,
      monthlyContribution: parseNumber(draft.monthlyContribution),
      riskTolerance: clampRisk(draft.riskTolerance),
      riskProfile: goalRiskProfile(draft.riskTolerance),
      updatedAt: new Date().toISOString(),
    };
    const nextGoals = goals.map((goal) =>
      goal.id === updated.id ? updated : goal,
    );
    localArahDanaStorage.writeGoals(nextGoals);
    setGoals(nextGoals);
    setIsSaved(true);
  }

  return (
    <FocusedFlowShell
      eyebrow="Edit Tujuan"
      title="Perbarui tujuan finansial"
      description="Edit goal dipisahkan dari dashboard tujuan agar perubahan target dan kontribusi tetap fokus."
      backHref="/goals"
    >
      {!selectedGoal ? (
        <FlowPanel className="grid gap-3">
          <h2 className="text-lg font-semibold text-stone-950">
            Pilih tujuan
          </h2>
          {goals.length === 0 ? (
            <p className="text-sm leading-6 text-stone-600">
              Belum ada tujuan tersimpan.
            </p>
          ) : null}
          {goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => chooseGoal(goal)}
              className="rounded-[1rem] bg-stone-50 p-4 text-left ring-1 ring-stone-200"
            >
              <span className="block text-sm font-semibold text-stone-950">
                {goal.name}
              </span>
              <span className="mt-1 block text-xs text-stone-500">
                {formatRupiah(goal.targetAmount)} |{" "}
                {goalCategoryLabel(goal.category)}
              </span>
            </button>
          ))}
          <ButtonLink href="/goals/new" variant="primary">
            Buat tujuan baru
          </ButtonLink>
        </FlowPanel>
      ) : (
        <>
          <FlowPanel className="grid gap-4">
            {isSaved ? (
              <p className="rounded-[1rem] bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100">
                Tujuan berhasil diperbarui.
              </p>
            ) : null}
            <InputField
              label="Nama tujuan"
              value={draft.name}
              onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Target dana"
                value={draft.targetAmount}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, targetAmount: value }))
                }
              />
              <InputField
                label="Target tanggal"
                type="date"
                value={draft.targetDate}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, targetDate: value }))
                }
              />
              <InputField
                label="Setoran bulanan"
                value={draft.monthlyContribution}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    monthlyContribution: value,
                  }))
                }
              />
              <label className="grid gap-2 text-sm font-semibold text-stone-800">
                Risiko: {draft.riskTolerance}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.riskTolerance}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      riskTolerance: Number(event.target.value),
                    }))
                  }
                  className="min-h-12 accent-emerald-500"
                />
              </label>
            </div>
          </FlowPanel>
          <StickyFlowActions>
            <ButtonLink href="/goals" variant="secondary">
              Batal
            </ButtonLink>
            <Button type="button" variant="primary" onClick={saveGoal}>
              Simpan
            </Button>
          </StickyFlowActions>
        </>
      )}
    </FocusedFlowShell>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        className="min-h-12 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 text-sm font-medium outline-none focus:border-emerald-300 focus:bg-white"
      />
    </label>
  );
}

function selectedGoalToDraft(goal: FinancialGoal | null) {
  return {
    name: goal?.name ?? "",
    targetAmount: goal ? String(goal.targetAmount) : "",
    targetDate: goal?.targetDate ?? new Date().toISOString().slice(0, 10),
    monthlyContribution: goal ? String(goal.monthlyContribution) : "",
    riskTolerance: goal?.riskTolerance ?? 35,
  };
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? nonNegativeNumber(parsed) : 0;
}

function clampRisk(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

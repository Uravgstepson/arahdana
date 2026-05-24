"use client";

import { useMemo, useState } from "react";
import {
  FlowPanel,
  FocusedFlowShell,
  StickyFlowActions,
} from "@/components/FocusedFlow";
import { Button, ButtonLink } from "@/components/ui";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { PortfolioItem } from "@/lib/types/investment";
import { formatRupiah } from "@/lib/utils/format";
import {
  draftToPortfolioItem,
  portfolioItemToDraft,
  productTypeChoices,
  productTypeLabel,
  riskChoices,
  validateHoldingDraft,
  type HoldingDraft,
} from "../holdingFlow";

type EditState = {
  id: string;
  items: PortfolioItem[];
  draft: HoldingDraft | null;
};

export default function PortoEditPage() {
  const [state, setState] = useState<EditState>(() => {
    const id =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("id") ?? "";
    const items = localArahDanaStorage.readPortfolio() ?? [];
    const item = items.find((holding) => holding.id === id);
    return {
      id,
      items,
      draft: item ? portfolioItemToDraft(item) : null,
    };
  });
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const preview = useMemo(() => {
    if (!state.draft) return null;
    const item = draftToPortfolioItem(state.draft, state.id || "preview");
    return {
      value: item.currentPrice * item.quantity,
      invested: item.buyPrice * item.quantity,
    };
  }, [state.draft, state.id]);

  function update(next: Partial<HoldingDraft>) {
    setState((current) => ({
      ...current,
      draft: current.draft ? { ...current.draft, ...next } : current.draft,
    }));
    setError("");
  }

  function saveEdit() {
    if (!state.draft) return;
    const validation = validateHoldingDraft(state.draft);
    if (validation) {
      setError(validation);
      return;
    }

    const nextItem = draftToPortfolioItem(state.draft, state.id);
    const nextItems = state.items.map((item) =>
      item.id === state.id ? nextItem : item,
    );
    localArahDanaStorage.writePortfolio(nextItems);
    setState((current) => ({ ...current, items: nextItems }));
    setIsSaved(true);
  }

  if (!state.draft) {
    return (
      <FocusedFlowShell
        eyebrow="Edit Porto"
        title="Holding tidak ditemukan"
        description="Data yang ingin diedit tidak tersedia di penyimpanan perangkat ini."
        backHref="/portfolio"
      >
        <FlowPanel className="grid gap-3">
          <p className="text-sm leading-6 text-stone-600">
            Buka dari tombol kelola pada holding di halaman Porto agar konteks
            instrumennya terbawa otomatis.
          </p>
          <ButtonLink href="/portfolio" variant="primary">
            Kembali ke Porto
          </ButtonLink>
        </FlowPanel>
      </FocusedFlowShell>
    );
  }

  if (isSaved) {
    return (
      <FocusedFlowShell
        eyebrow="Edit Porto"
        title="Holding Updated"
        description={`${state.draft.name} sudah diperbarui. Perubahan akan tampil di ringkasan Porto.`}
        backHref="/portfolio"
      >
        <FlowPanel className="grid gap-3">
          <p className="rounded-[1rem] bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 ring-1 ring-emerald-100">
            Edit selesai di flow khusus, tanpa mengganggu tampilan dashboard.
          </p>
          <ButtonLink href="/portfolio" variant="primary">
            Lihat Porto
          </ButtonLink>
        </FlowPanel>
      </FocusedFlowShell>
    );
  }

  return (
    <FocusedFlowShell
      eyebrow="Edit Porto"
      title="Perbarui holding"
      description="Edit data inti instrumen di ruang khusus agar dashboard tetap menjadi tempat memantau, bukan mengisi form panjang."
      backHref="/portfolio"
    >
      <FlowPanel className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nama instrumen"
            value={state.draft.name}
            onChange={(value) => update({ name: value })}
          />
          <TextField
            label="Ticker atau kode"
            value={state.draft.ticker}
            onChange={(value) => update({ ticker: value })}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {productTypeChoices.map((choice) => (
            <button
              key={choice.type}
              type="button"
              onClick={() => update({ type: choice.type })}
              className={`rounded-[1rem] p-3 text-left text-sm font-semibold ring-1 ${
                state.draft?.type === choice.type
                  ? "bg-emerald-50 text-emerald-950 ring-emerald-200"
                  : "bg-stone-50 text-stone-700 ring-stone-200"
              }`}
            >
              {choice.title}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Harga beli / modal per unit"
            value={state.draft.buyPrice}
            onChange={(value) => update({ buyPrice: value })}
            inputMode="decimal"
          />
          <TextField
            label="Jumlah unit"
            value={state.draft.quantity}
            onChange={(value) => update({ quantity: value })}
            inputMode="decimal"
          />
          <TextField
            label="Harga kini"
            value={state.draft.currentPrice}
            onChange={(value) => update({ currentPrice: value })}
            inputMode="decimal"
          />
          <TextField
            label="Tanggal beli"
            value={state.draft.buyDate}
            onChange={(value) => update({ buyDate: value })}
            type="date"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {riskChoices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onClick={() => update({ riskCategory: choice.value })}
              className={`rounded-[1rem] p-3 text-left ring-1 ${
                state.draft?.riskCategory === choice.value
                  ? "bg-stone-950 text-white ring-stone-950"
                  : "bg-stone-50 text-stone-700 ring-stone-200"
              }`}
            >
              <span className="block text-sm font-semibold">
                {choice.label}
              </span>
              <span className="mt-1 block text-xs opacity-70">
                {choice.helper}
              </span>
            </button>
          ))}
        </div>

        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Catatan
          <textarea
            value={state.draft.notes}
            onChange={(event) => update({ notes: event.target.value })}
            rows={4}
            className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium leading-6 text-stone-950 outline-none focus:border-emerald-300 focus:bg-white"
          />
        </label>

        {preview ? (
          <div className="grid gap-2 rounded-[1.2rem] bg-stone-50 p-4 ring-1 ring-stone-200">
            <SummaryRow label="Produk" value={productTypeLabel(state.draft.type)} />
            <SummaryRow label="Modal" value={formatRupiah(preview.invested)} />
            <SummaryRow label="Nilai kini" value={formatRupiah(preview.value)} />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-[1rem] bg-rose-50 p-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-100">
            {error}
          </p>
        ) : null}
      </FlowPanel>

      <StickyFlowActions>
        <ButtonLink href="/portfolio" variant="secondary">
          Batal
        </ButtonLink>
        <Button type="button" variant="primary" onClick={saveEdit}>
          Simpan perubahan
        </Button>
      </StickyFlowActions>
    </FocusedFlowShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "numeric";
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-800">
      {label}
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-950 outline-none focus:border-emerald-300 focus:bg-white"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-stone-500">{label}</span>
      <span className="text-right font-semibold text-stone-950">{value}</span>
    </div>
  );
}

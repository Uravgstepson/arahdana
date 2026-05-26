"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FlowPanel,
  FlowStep,
  FocusedFlowShell,
  StickyFlowActions,
} from "@/components/FocusedFlow";
import { CsvPortfolioImportSection } from "@/components/CsvPortfolioImportSection";
import { Button, ButtonLink } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { PortfolioItem } from "@/lib/types/investment";
import { formatRupiah } from "@/lib/utils/format";
import { loadCloudPortfolio, saveCloudPortfolio } from "@/lib/supabase/sync";
import { trackAppEvent } from "@/lib/monitoring/events";
import {
  createHoldingDraft,
  draftToPortfolioItem,
  productTypeChoices,
  productTypeLabel,
  riskChoices,
  validateHoldingDraft,
  type HoldingDraft,
} from "../holdingFlow";

const steps = ["Produk", "Instrumen", "Detail", "Konfirmasi"];
type AddMode = "manual" | "import" | null;

export default function PortoAddPage() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [mode, setMode] = useState<AddMode>(() => readPersistedAddMode());
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<HoldingDraft>(() => createHoldingDraft());
  const [importItems, setImportItems] = useState<PortfolioItem[]>([]);
  const [hasStoredPortfolio, setHasStoredPortfolio] = useState(false);
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState("");
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    void (async () => {
      try {
        const nextItems = user
          ? await loadCloudPortfolio(user)
          : !isConfigured
            ? (localArahDanaStorage.readPortfolio() ?? [])
            : [];
        if (!isMounted) return;
        setImportItems(nextItems);
        setHasStoredPortfolio(nextItems.length > 0);
        if (user) localArahDanaStorage.writePortfolio(nextItems);
      } catch {
        if (!isMounted) return;
        setImportItems([]);
        setHasStoredPortfolio(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, user]);

  const preview = useMemo(() => {
    const item = draftToPortfolioItem(draft, "preview");
    return {
      value: item.currentPrice * item.quantity,
      invested: item.buyPrice * item.quantity,
    };
  }, [draft]);

  function update(next: Partial<HoldingDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError("");
  }

  function selectMode(nextMode: AddMode) {
    setMode(nextMode);
    persistAddMode(nextMode);
  }

  function goNext() {
    const validation = step >= 2 ? validateHoldingDraft(draft) : "";
    if (validation) {
      setError(validation);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function readCurrentPortfolio() {
    if (user) return loadCloudPortfolio(user);
    if (!isConfigured) return localArahDanaStorage.readPortfolio() ?? [];
    throw new Error("Login dulu untuk menyimpan portofolio akun.");
  }

  async function savePortfolio(nextItems: PortfolioItem[]) {
    if (!user) {
      localArahDanaStorage.writePortfolio(nextItems);
      return;
    }
    await saveCloudPortfolio(user, nextItems);
    const freshItems = await loadCloudPortfolio(user);
    localArahDanaStorage.writePortfolio(freshItems);
  }

  async function saveHolding() {
    const validation = validateHoldingDraft(draft);
    if (validation) {
      setError(validation);
      return;
    }

    try {
      const current = await readCurrentPortfolio();
      const item = draftToPortfolioItem(draft, crypto.randomUUID());
      await savePortfolio([item, ...current]);
      trackAppEvent("portfolio_added", { page: "/porto/add", source: "manual" });
      setSavedName(item.name);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Holding belum bisa disimpan.",
      );
    }
  }

  function saveImportedItems(nextItems: PortfolioItem[]) {
    void (async () => {
      try {
        await savePortfolio(nextItems);
        trackAppEvent("csv_import_used", {
          page: "/porto/add",
          source: "portfolio_import",
        });
        setImportItems(nextItems);
        setHasStoredPortfolio(nextItems.length > 0);
        setImportMessage("Import CSV selesai dan data sudah masuk ke Porto.");
      } catch (error) {
        setImportMessage(
          error instanceof Error
            ? `Import belum tersimpan. ${error.message}`
            : "Import belum tersimpan.",
        );
      }
    })();
  }

  if (savedName) {
    return (
      <FocusedFlowShell
        eyebrow="Porto"
        title="Portfolio Added"
        description={`${savedName} sudah masuk ke Porto. Dashboard tetap bersih, sementara input selesai di flow khusus.`}
        backHref="/portfolio"
      >
        <FlowPanel>
          <div className="grid gap-3">
            <p className="rounded-[1.1rem] bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 ring-1 ring-emerald-100">
              Holding tersimpan di perangkat ini dan akan tampil di halaman
              Porto.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <ButtonLink href="/portfolio" variant="primary">
                Lihat Porto
              </ButtonLink>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraft(createHoldingDraft());
                  setStep(0);
                  setSavedName("");
                  selectMode("manual");
                }}
              >
                Tambah lagi
              </Button>
              <ButtonLink href="/review" variant="secondary">
                Buka Review
              </ButtonLink>
            </div>
          </div>
        </FlowPanel>
      </FocusedFlowShell>
    );
  }

  if (!mode) {
    return (
      <FocusedFlowShell
        eyebrow="Tambah ke Porto"
        title="Pilih cara tambah"
        description="Mulai dari pilihan yang jelas dulu. Setelah memilih manual atau import, baru ArahDana menampilkan input yang relevan."
        backHref="/portfolio"
      >
        <FlowPanel className="grid gap-3">
          <button
            type="button"
            onClick={() => selectMode("manual")}
            className="min-h-24 rounded-[1.2rem] bg-white p-5 text-left ring-1 ring-emerald-100 transition hover:bg-emerald-50 hover:ring-emerald-200"
          >
            <span className="block text-base font-semibold text-stone-950">
              Tambah manual
            </span>
            <span className="mt-2 block text-sm font-medium leading-6 text-stone-500">
              Isi holding satu per satu dengan flow bertahap.
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectMode("import")}
            className="min-h-24 rounded-[1.2rem] bg-white p-5 text-left ring-1 ring-stone-200 transition hover:bg-stone-50 hover:ring-stone-300"
          >
            <span className="block text-base font-semibold text-stone-950">
              Import CSV
            </span>
            <span className="mt-2 block text-sm font-medium leading-6 text-stone-500">
              Upload atau tempel banyak holding sekaligus.
            </span>
          </button>
        </FlowPanel>
      </FocusedFlowShell>
    );
  }

  if (mode === "import") {
    return (
      <FocusedFlowShell
        eyebrow="Import Porto"
        title="Import holding dari CSV"
        description="Upload atau tempel data hanya setelah mode import dipilih, supaya flow tambah tetap fokus."
        backHref="/portfolio"
      >
        <FlowPanel className="grid gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => {
              selectMode(null);
              setImportMessage("");
            }}
          >
            Pilih cara lain
          </Button>
          {importMessage ? (
            <p className="rounded-[1rem] bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 ring-1 ring-emerald-100">
              {importMessage}
            </p>
          ) : null}
        </FlowPanel>

        <CsvPortfolioImportSection
          existingItems={importItems}
          hasStoredPortfolio={hasStoredPortfolio}
          onImport={saveImportedItems}
          storageLabel="Porto"
          title="Upload atau tempel CSV"
          description="Pilih file CSV, cek pratinjau, lalu simpan. Proses ini tetap lokal di browser."
        />
      </FocusedFlowShell>
    );
  }

  return (
    <FocusedFlowShell
      eyebrow="Tambah ke Porto"
      title="Tambah holding dengan fokus"
      description="Pilih produk, isi instrumen, lalu cek ringkasan sebelum disimpan. Tidak ada form besar yang menumpuk di dashboard."
      backHref="/portfolio"
    >
      <FlowPanel className="grid gap-5">
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() => {
            selectMode(null);
            setStep(0);
            setError("");
          }}
        >
          Pilih cara lain
        </Button>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {steps.map((label, index) => (
            <FlowStep
              key={label}
              number={index + 1}
              title={label}
              active={index === step}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {productTypeChoices.map((choice) => (
              <button
                key={choice.type}
                type="button"
                onClick={() => update({ type: choice.type })}
                className={`rounded-[1.2rem] p-4 text-left ring-1 transition ${
                  draft.type === choice.type
                    ? "bg-emerald-50 text-emerald-950 ring-emerald-200"
                    : "bg-stone-50 text-stone-800 ring-stone-200 hover:bg-stone-100"
                }`}
              >
                <span className="text-sm font-semibold">{choice.title}</span>
                <span className="mt-2 block text-xs leading-5 text-stone-500">
                  {choice.helper}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4">
            <TextField
              label="Nama instrumen"
              value={draft.name}
              onChange={(value) => update({ name: value })}
              placeholder="Contoh: Bank Central Asia"
            />
            <TextField
              label="Ticker atau kode opsional"
              value={draft.ticker}
              onChange={(value) => update({ ticker: value })}
              placeholder="BBCA.JK, FR0100, atau kosongkan"
            />
            <p className="rounded-[1rem] bg-stone-50 p-4 text-sm leading-6 text-stone-600 ring-1 ring-stone-200">
              Produk terpilih:{" "}
              <span className="font-semibold text-stone-950">
                {productTypeLabel(draft.type)}
              </span>
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Harga beli / modal per unit"
                value={draft.buyPrice}
                onChange={(value) => update({ buyPrice: value })}
                inputMode="decimal"
                placeholder="853062"
              />
              <TextField
                label="Jumlah unit"
                value={draft.quantity}
                onChange={(value) => update({ quantity: value })}
                inputMode="decimal"
                placeholder="1"
              />
              <TextField
                label="Harga kini opsional"
                value={draft.currentPrice}
                onChange={(value) => update({ currentPrice: value })}
                inputMode="decimal"
                placeholder="Kosongkan jika sama"
              />
              <TextField
                label="Tanggal beli"
                value={draft.buyDate}
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
                    draft.riskCategory === choice.value
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
            <TextAreaField
              label="Catatan opsional"
              value={draft.notes}
              onChange={(value) => update({ notes: value })}
              placeholder="Alasan beli, target, atau konteks pribadi."
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3">
            <SummaryRow label="Instrumen" value={draft.name || "-"} />
            <SummaryRow label="Produk" value={productTypeLabel(draft.type)} />
            <SummaryRow label="Ticker" value={draft.ticker || "Opsional"} />
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          disabled={step === 0}
        >
          Kembali
        </Button>
        {step === steps.length - 1 ? (
          <Button type="button" variant="primary" onClick={saveHolding}>
            Simpan holding
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={goNext}>
            Lanjut
          </Button>
        )}
      </StickyFlowActions>
    </FocusedFlowShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
        className="min-h-12 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-950 outline-none transition focus:border-emerald-300 focus:bg-white"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-800">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium leading-6 text-stone-950 outline-none transition focus:border-emerald-300 focus:bg-white"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-stone-50 p-4 ring-1 ring-stone-200">
      <span className="text-sm font-medium text-stone-500">{label}</span>
      <span className="min-w-0 text-right text-sm font-semibold text-stone-950">
        {value}
      </span>
    </div>
  );
}

const ADD_MODE_KEY = "arahdana.portoAdd.mode";

function readPersistedAddMode(): AddMode {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(ADD_MODE_KEY);
  return value === "manual" || value === "import" ? value : null;
}

function persistAddMode(mode: AddMode) {
  if (typeof window === "undefined") return;
  if (mode) {
    window.sessionStorage.setItem(ADD_MODE_KEY, mode);
  } else {
    window.sessionStorage.removeItem(ADD_MODE_KEY);
  }
}

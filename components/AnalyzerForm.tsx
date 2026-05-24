"use client";

import { useMemo, useState } from "react";
import type {
  AnalysisInput,
  InvestmentType,
  PricePoint,
  SavedAnalysisResult,
  TimeHorizon,
} from "@/lib/types/investment";
import { analyzeInvestment } from "@/lib/analysis/analyzeInvestment";
import {
  clampNumber,
  formatRupiah,
  nonNegativeNumber,
} from "@/lib/utils/format";
import { useAuth } from "@/components/AuthProvider";
import { InstrumentOptions } from "@/components/PortfolioTable";
import { PrivateValue } from "@/components/PrivateValue";
import {
  FlowPanel,
  FlowStep,
  StickyFlowActions,
} from "@/components/FocusedFlow";
import { Button, ButtonLink } from "@/components/ui";
import {
  findMarketSuggestions,
  normalizeMarketTicker,
} from "@/lib/market/tickerUniverse";
import { fetchPublicMarketData } from "@/lib/providers/marketClient";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { saveCloudAnalysisResult } from "@/lib/supabase/sync";
import {
  normalizeSafeTicker,
  validateCapital,
  validatePrices,
  validateRiskTolerance,
  validateTicker,
} from "@/lib/validation";
import {
  ANALYSIS_RESULT_STORAGE_KEY,
  type AnalysisResultPayload,
} from "@/lib/analysis/resultStorage";

type RangeOption = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max";
type IntervalOption = "5m" | "15m" | "1d" | "1wk";
type AnalysisMode = "market" | null;

export function AnalyzerForm() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AnalysisMode>(null);
  const [name, setName] = useState("Analisis BBCA");
  const [type, setType] = useState<InvestmentType>("stock");
  const [ticker, setTicker] = useState("BBCA:IDX");
  const [range, setRange] = useState<RangeOption>("1y");
  const [interval, setInterval] = useState<IntervalOption>("1d");
  const [capital, setCapital] = useState(10_000_000);
  const [riskTolerance, setRiskTolerance] = useState(15);
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("medium");
  const [apiPrices, setApiPrices] = useState<PricePoint[] | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [apiError, setApiError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const tickerSuggestions = useMemo(
    () => findMarketSuggestions(ticker, 6),
    [ticker],
  );

  const latestClose = apiPrices?.at(-1);

  async function loadMarketData() {
    setApiError("");
    setValidationMessage("");

    const validation = validateInputs({
      ticker,
      capital,
      riskTolerance,
    });

    if (validation) {
      setValidationMessage(validation);
      return null;
    }

    setIsFetching(true);

    try {
      const effectiveRange =
        interval.endsWith("m") && !["1d", "5d"].includes(range)
          ? "1d"
          : range;
      const marketData = await fetchPublicMarketData({
        ticker: normalizeMarketTicker(normalizeSafeTicker(ticker)),
        range: effectiveRange,
        interval,
        live: interval.endsWith("m"),
        source: "auto",
      });

      setApiPrices(marketData.prices);
      setLastFetchedAt(new Date().toISOString());
      return {
        prices: marketData.prices,
        label: marketData.exchangeName
          ? `Data pasar: ${marketData.exchangeName}`
          : "Data pasar publik (auto: Google -> fallback Yahoo)",
        isMock: false,
      };
    } catch (error) {
      setApiPrices(null);
      setApiError(
        `${error instanceof Error ? error.message : "Data pasar gagal dimuat."} Periksa ticker, rentang, atau koneksi lalu coba lagi.`,
      );
      return null;
    } finally {
      setIsFetching(false);
    }
  }

  async function fetchAndAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveStatus(null);

    const fetched = await loadMarketData();
    if (!fetched) return;

    const priceError = validatePrices(fetched.prices);
    if (priceError) {
      setValidationMessage(priceError);
      return;
    }

    const input: AnalysisInput = {
      name,
      type,
      ticker,
      capital: nonNegativeNumber(capital),
      riskTolerance: clampNumber(riskTolerance, 5, 30),
      timeHorizon,
      prices: fetched.prices,
    };
    const nextResult = analyzeInvestment(input);
    const saved: SavedAnalysisResult = {
      id: crypto.randomUUID(),
      name,
      type,
      ticker: normalizeSafeTicker(ticker),
      result: nextResult,
      priceSourceLabel: fetched.label,
      isMockData: false,
      createdAt: new Date().toISOString(),
    };
    const payload: AnalysisResultPayload = {
      id: saved.id,
      input,
      result: nextResult,
      prices: fetched.prices,
      dataSourceLabel: fetched.label,
      isMockData: false,
      savedSummary: saved,
    };

    const existing = localArahDanaStorage.readAnalysisResults() ?? [];
    localArahDanaStorage.writeAnalysisResults([saved, ...existing].slice(0, 50));
    writeAnalysisPayload(payload);

    if (user) {
      await saveCloudAnalysisResult(user, saved).catch(() => undefined);
    }

    window.location.assign(`/analysis/result?id=${encodeURIComponent(saved.id)}`);
  }

  function clearLiveData() {
    setApiPrices(null);
    setApiError("");
  }

  if (!mode) {
    return (
      <FlowPanel className="grid gap-3">
        <ButtonLink
          href="/goals/new"
          variant="secondary"
          className="min-h-24 justify-start rounded-[1.2rem] bg-white p-5 text-left ring-emerald-100 hover:bg-emerald-50 hover:ring-emerald-200"
        >
          <span className="grid gap-2">
            <span className="text-base font-semibold text-stone-950">
              DCA Planner
            </span>
            <span className="text-sm font-medium leading-6 text-stone-500">
              Buat target, setoran bulanan, profil risiko, dan rencana DCA yang lebih disiplin.
            </span>
          </span>
        </ButtonLink>
        <button
          type="button"
          onClick={() => setMode("market")}
          className="min-h-24 rounded-[1.2rem] bg-white p-5 text-left ring-1 ring-stone-200 transition hover:bg-stone-50 hover:ring-stone-300"
        >
          <span className="block text-base font-semibold text-stone-950">
            Analisis data pasar
          </span>
          <span className="mt-2 block text-sm font-medium leading-6 text-stone-500">
            Cari ticker, ambil harga pasar terbaru, lalu generate hasil analisis di halaman baru.
          </span>
        </button>
      </FlowPanel>
    );
  }

  return (
    <div className="grid gap-5">
      <FlowPanel className="grid gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => {
              setMode(null);
              setValidationMessage("");
              setApiError("");
            }}
          >
            Pilih fitur lain
          </Button>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Analisis data pasar
          </span>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <FlowStep number={1} title="Instrumen" active />
          <FlowStep number={2} title="Data" />
          <FlowStep number={3} title="Profil" />
          <FlowStep number={4} title="Hasil" />
        </div>

        <form id="analysis-setup-form" onSubmit={fetchAndAnalyze} className="grid gap-4">
          <StepLabel value="1" label="Instrumen" />
          <Field label="Nama instrumen">
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Jenis instrumen">
            <select
              className="input"
              value={type}
              onChange={(event) =>
                setType(event.target.value as InvestmentType)
              }
            >
              <InstrumentOptions />
            </select>
          </Field>
          <Field label="Ticker">
            <input
              className="input"
              value={ticker}
              onChange={(event) => {
                setTicker(event.target.value.toUpperCase());
                clearLiveData();
              }}
              placeholder="BBCA:IDX, TLKM:IDX, AAPL, BTC-USD, IDR=X, ^JKSE"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {tickerSuggestions.map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => {
                    setTicker(item.ticker);
                    setName(item.name);
                    setType(item.type);
                    clearLiveData();
                  }}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-white"
                >
                  {item.ticker} - {item.name}
                </button>
              ))}
            </div>
          </Field>

          <StepLabel value="2" label="Data harga" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Rentang">
              <select
                className="input"
                value={range}
                onChange={(event) => {
                  setRange(event.target.value as RangeOption);
                  clearLiveData();
                }}
              >
                <option value="1d">1d</option>
                <option value="5d">5d</option>
                <option value="1mo">1mo</option>
                <option value="3mo">3mo</option>
                <option value="6mo">6mo</option>
                <option value="1y">1y</option>
                <option value="5y">5y</option>
                <option value="max">All time</option>
              </select>
            </Field>
            <Field label="Interval">
              <select
                className="input"
                value={interval}
                onChange={(event) => {
                  setInterval(event.target.value as IntervalOption);
                  clearLiveData();
                }}
              >
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1d">1d</option>
                <option value="1wk">1wk</option>
              </select>
            </Field>
          </div>
          {lastFetchedAt ? (
            <StatusBox tone="success" title="Data terakhir">
              Update terakhir {formatDateTime(lastFetchedAt)}.{" "}
              {latestClose ? (
                <>
                  Close terbaru{" "}
                  <PrivateValue>{formatRupiah(latestClose.close)}</PrivateValue>.
                </>
              ) : null}
            </StatusBox>
          ) : null}

          <StepLabel value="3" label="Profil" />
          <Field label="Modal">
            <input
              className="input"
              type="number"
              min="0"
              value={capital}
              onChange={(event) =>
                setCapital(nonNegativeNumber(Number(event.target.value)))
              }
            />
          </Field>
          <Field label={`Toleransi risiko: ${riskTolerance}%`}>
            <input
              type="range"
              min="5"
              max="30"
              value={riskTolerance}
              onChange={(event) =>
                setRiskTolerance(clampNumber(Number(event.target.value), 5, 30))
              }
            />
          </Field>
          <Field label="Jangka waktu">
            <select
              className="input"
              value={timeHorizon}
              onChange={(event) =>
                setTimeHorizon(event.target.value as TimeHorizon)
              }
            >
              <option value="short">Jangka pendek</option>
              <option value="medium">Jangka menengah</option>
              <option value="long">Jangka panjang</option>
            </select>
          </Field>
        </form>

        {validationMessage ? (
          <StatusBox tone="error" title="Validasi">
            {validationMessage}
          </StatusBox>
        ) : null}

        {apiError ? (
          <StatusBox tone="error" title="Galat data pasar">
            {apiError}
          </StatusBox>
        ) : null}

        {saveStatus ? (
          <StatusBox tone={saveStatus.tone} title="Simpan hasil">
            {saveStatus.message}
          </StatusBox>
        ) : null}
      </FlowPanel>

      <StickyFlowActions>
        <Button
          type="submit"
          form="analysis-setup-form"
          variant="primary"
          disabled={isFetching}
        >
          {isFetching ? "Mengambil data..." : "Generate hasil"}
        </Button>
      </StickyFlowActions>
    </div>
  );
}

function validateInputs({
  ticker,
  capital,
  riskTolerance,
}: {
  ticker: string;
  capital: number;
  riskTolerance: number;
}) {
  if (!ticker.trim()) return "Ticker wajib diisi sebelum mengambil data pasar.";
  const tickerError = validateTicker(ticker);
  if (tickerError) return tickerError;
  const capitalError = validateCapital(capital);
  if (capitalError) return capitalError;
  const riskError = validateRiskTolerance(riskTolerance);
  if (riskError) return riskError;
  return "";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      {children}
    </label>
  );
}

function StepLabel({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
        {value}
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </p>
    </div>
  );
}

function StatusBox({
  tone,
  title,
  children,
}: {
  tone: "success" | "warning" | "error";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    success: "bg-emerald-50 text-emerald-950 ring-emerald-200",
    warning: "bg-amber-50 text-amber-950 ring-amber-200",
    error: "bg-rose-50 text-rose-950 ring-rose-200",
  };

  return (
    <div
      className={`mt-4 rounded-lg p-4 text-sm leading-6 ring-1 ${styles[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

function writeAnalysisPayload(payload: AnalysisResultPayload) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY);
    const existing = raw
      ? (JSON.parse(raw) as AnalysisResultPayload[])
      : [];
    const next = [
      payload,
      ...existing.filter((item) => item.id !== payload.id),
    ].slice(0, 20);
    window.localStorage.setItem(
      ANALYSIS_RESULT_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    window.localStorage.setItem(
      ANALYSIS_RESULT_STORAGE_KEY,
      JSON.stringify([payload]),
    );
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

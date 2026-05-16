"use client";

import { useMemo, useState } from "react";
import type {
  AnalysisInput,
  AnalysisResult,
  InvestmentType,
  PricePoint,
  SavedAnalysisResult,
  TimeHorizon,
} from "@/lib/types/investment";
import { analyzeInvestment } from "@/lib/analysis/analyzeInvestment";
import { parseManualPrices } from "@/lib/providers/manual";
import { samplePrices } from "@/lib/utils/sampleData";
import {
  clampNumber,
  formatRupiah,
  nonNegativeNumber,
} from "@/lib/utils/format";
import {
  AnalyzerResult,
  AnalyzerResultSkeleton,
} from "@/components/AnalyzerResult";
import { useAuth } from "@/components/AuthProvider";
import { InstrumentOptions } from "@/components/PortfolioTable";
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

type RangeOption = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max";
type IntervalOption = "5m" | "15m" | "1d" | "1wk";

export function AnalyzerForm() {
  const { user } = useAuth();
  const [name, setName] = useState("Analisis BBCA");
  const [type, setType] = useState<InvestmentType>("stock");
  const [ticker, setTicker] = useState("BBCA:IDX");
  const [range, setRange] = useState<RangeOption>("1y");
  const [interval, setInterval] = useState<IntervalOption>("1d");
  const [capital, setCapital] = useState(10_000_000);
  const [riskTolerance, setRiskTolerance] = useState(15);
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("medium");
  const [manualPrices, setManualPrices] = useState("");
  const [apiPrices, setApiPrices] = useState<PricePoint[] | null>(null);
  const [marketMeta, setMarketMeta] = useState<{
    ticker: string;
    currency: string | null;
    exchangeName: string | null;
    regularMarketPrice: number | null;
  } | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [apiError, setApiError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const tickerSuggestions = useMemo(
    () => findMarketSuggestions(ticker, 6),
    [ticker],
  );

  const manualParsedPrices = useMemo(
    () => parseManualPrices(manualPrices),
    [manualPrices],
  );
  const priceSource = useMemo(() => {
    if (apiPrices?.length) {
      return {
        label:
          marketMeta?.exchangeName
            ? `Data pasar: ${marketMeta.exchangeName}`
            : "Data pasar publik (auto: Google -> fallback Yahoo)",
        badge: "Data langsung",
        prices: apiPrices,
        isMock: false,
      };
    }

    if (manualParsedPrices.length > 0) {
      return {
        label: "Data manual dari input pengguna",
        badge: "Data manual",
        prices: manualParsedPrices,
        isMock: false,
      };
    }

    return {
      label: "Data contoh",
      badge: "Data contoh",
      prices: samplePrices,
      isMock: true,
    };
  }, [apiPrices, manualParsedPrices, marketMeta]);

  const analysisInput: AnalysisInput = useMemo(
    () => ({
      name,
      type,
      ticker,
      capital: nonNegativeNumber(capital),
      riskTolerance: clampNumber(riskTolerance, 5, 30),
      timeHorizon,
      prices: priceSource.prices,
    }),
    [
      capital,
      name,
      priceSource.prices,
      riskTolerance,
      ticker,
      timeHorizon,
      type,
    ],
  );

  const result: AnalysisResult = useMemo(() => {
    return analyzeInvestment(analysisInput);
  }, [analysisInput]);

  const latestClose = priceSource.prices.at(-1);

  async function fetchAndAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError("");
    setValidationMessage("");

    const validation = validateInputs({
      ticker,
      capital,
      riskTolerance,
    });

    if (validation) {
      setValidationMessage(validation);
      return;
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
      setMarketMeta({
        ticker: marketData.ticker ?? ticker.trim().toUpperCase(),
        currency: marketData.currency ?? null,
        exchangeName: marketData.exchangeName ?? null,
        regularMarketPrice: marketData.regularMarketPrice ?? null,
      });
    } catch (error) {
      setApiPrices(null);
      setMarketMeta(null);
      setApiError(
        `${error instanceof Error ? error.message : "Data pasar gagal dimuat."} Cadangan manual/contoh tetap tersedia.`,
      );
    } finally {
      setIsFetching(false);
    }
  }

  function clearLiveData() {
    setApiPrices(null);
    setMarketMeta(null);
    setApiError("");
  }

  async function saveAnalysisResult() {
    const priceError = validatePrices(priceSource.prices);
    if (priceError) {
      setSaveStatus({ tone: "error", message: priceError });
      return;
    }

    const saved: SavedAnalysisResult = {
      id: crypto.randomUUID(),
      name,
      type,
      ticker: normalizeSafeTicker(ticker),
      result,
      priceSourceLabel: priceSource.label,
      isMockData: priceSource.isMock,
      createdAt: new Date().toISOString(),
    };

    const existing = localArahDanaStorage.readAnalysisResults() ?? [];
    localArahDanaStorage.writeAnalysisResults([saved, ...existing].slice(0, 50));

    if (!user) {
      setSaveStatus({
        tone: "success",
        message: "Hasil analisis tersimpan lokal. Login untuk sinkronisasi antar perangkat.",
      });
      return;
    }

    try {
      await saveCloudAnalysisResult(user, saved);
      setSaveStatus({
        tone: "success",
        message: "Hasil analisis tersimpan lokal dan tersinkron ke Supabase.",
      });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message:
          error instanceof Error
            ? `Hasil tersimpan lokal, tetapi cloud sync gagal. ${error.message}`
            : "Hasil tersimpan lokal, tetapi cloud sync gagal.",
      });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:self-start">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-stone-950">
            Analisis cepat
          </h2>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              priceSource.isMock
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {priceSource.badge}
          </span>
        </div>

        <form onSubmit={fetchAndAnalyze} className="mt-4 grid gap-4">
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
                  {item.ticker} · {item.name}
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

          <button
            className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFetching}
          >
            {isFetching ? "Mengambil data..." : "Ambil & analisis"}
          </button>
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

        <details className="mt-4 rounded-[1.2rem] bg-stone-100 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-stone-950">
            Sumber data dan input manual
          </summary>
          <div className="mt-4 grid gap-4">
            <StatusBox
              tone={priceSource.isMock ? "warning" : "success"}
              title="Sumber harga aktif"
            >
              {priceSource.label}. Penutupan terbaru:{" "}
              {latestClose
                ? `${formatRupiah(latestClose.close)} (${latestClose.date})`
                : "Tidak ada data harga valid"}
              . Jumlah data: {priceSource.prices.length}.
              {marketMeta ? (
                <>
                  {" "}
                  {marketMeta.ticker} di{" "}
                  {marketMeta.exchangeName ?? "bursa tidak diketahui"}
                  {marketMeta.regularMarketPrice
                    ? `, harga pasar ${formatRupiah(marketMeta.regularMarketPrice)}`
                    : ""}
                  .
                </>
              ) : null}
            </StatusBox>
            <Field label="Harga historis manual opsional">
              <textarea
                className="input min-h-32"
                value={manualPrices}
                onChange={(event) => {
                  setManualPrices(event.target.value);
                  if (apiPrices) clearLiveData();
                }}
              />
            </Field>
          </div>
        </details>
      </section>
      {isFetching ? (
        <AnalyzerResultSkeleton />
      ) : (
        <div className="space-y-5">
          <AnalyzerResult
            input={analysisInput}
            result={result}
            prices={priceSource.prices}
            dataSourceLabel={priceSource.label}
            isMockData={priceSource.isMock}
          />
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-950">Simpan analisis</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Hasil disimpan ke localStorage. Jika login, hasil juga disimpan ke tabel analysis_results di Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={saveAnalysisResult}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                Simpan hasil
              </button>
            </div>
            {saveStatus ? (
              <p className={`mt-3 text-sm font-medium ${saveStatus.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {saveStatus.message}
              </p>
            ) : null}
          </section>
        </div>
      )}
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

"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/format";

type MarketApiResponse = {
  ticker?: string;
  currency?: string | null;
  exchangeName?: string | null;
  regularMarketPrice?: number | null;
  prices?: Array<{ date: string; close: number }>;
  message?: string;
  error?: string;
};

type BiRateApiResponse = {
  currency?: string;
  rates?: Array<{ date: string; buy: number; sell: number; middle: number }>;
  message?: string;
  error?: string;
};

export function ApiTestPanel() {
  const [ticker, setTicker] = useState("BBCA:IDX");
  const [marketResult, setMarketResult] = useState<{
    status?: number;
    data?: MarketApiResponse;
    error?: string;
  }>({});
  const [isMarketLoading, setIsMarketLoading] = useState(false);

  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-01-03");
  const [biResult, setBiResult] = useState<{
    status?: number;
    data?: BiRateApiResponse;
    error?: string;
  }>({});
  const [isBiLoading, setIsBiLoading] = useState(false);

  async function fetchMarketData(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMarketLoading(true);
    setMarketResult({});

    try {
      const response = await fetch(
        `/api/market?ticker=${encodeURIComponent(ticker)}&source=auto&range=1y&interval=1d`,
      );
      const data = (await response.json()) as MarketApiResponse;
      setMarketResult({
        status: response.status,
        data,
        error: response.ok
          ? undefined
          : (data.message ?? data.error ?? "Data pasar gagal dimuat."),
      });
    } catch (error) {
      setMarketResult({
        error:
          error instanceof Error ? error.message : "Data pasar gagal dimuat.",
      });
    } finally {
      setIsMarketLoading(false);
    }
  }

  async function fetchBiRates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBiLoading(true);
    setBiResult({});

    try {
      const params = new URLSearchParams({ currency, startDate, endDate });
      const response = await fetch(`/api/macro/bi-rate?${params.toString()}`);
      const data = (await response.json()) as BiRateApiResponse;
      setBiResult({
        status: response.status,
        data,
        error: response.ok
          ? undefined
          : (data.message ?? data.error ?? "Data kurs BI gagal dimuat."),
      });
    } catch (error) {
      setBiResult({
        error:
          error instanceof Error ? error.message : "Data kurs BI gagal dimuat.",
      });
    } finally {
      setIsBiLoading(false);
    }
  }

  const latestPrice = marketResult.data?.prices?.at(-1);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">
            Panel uji API
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Uji endpoint publik dari browser. Galat ditampilkan di sini tanpa
            membuat aplikasi berhenti.
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          Uji API langsung
        </span>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form
          onSubmit={fetchMarketData}
          className="rounded-lg border border-stone-200 p-4"
        >
          <h3 className="font-semibold text-stone-950">
            Data pasar Google Finance
          </h3>
          <label className="mt-4 grid gap-1 text-sm font-medium text-stone-700">
            Ticker
            <input
              className="input"
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              placeholder="BBCA.JK"
            />
          </label>
          <button
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isMarketLoading}
          >
            {isMarketLoading ? "Mengambil data..." : "Ambil data pasar"}
          </button>

          <ResultBox status={marketResult.status} error={marketResult.error}>
            {marketResult.data?.prices ? (
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Ticker:</span>{" "}
                  {marketResult.data.ticker}
                </p>
                <p>
                  <span className="font-medium">Bursa:</span>{" "}
                  {marketResult.data.exchangeName ?? "-"}
                </p>
                <p>
                  <span className="font-medium">Penutupan terbaru:</span>{" "}
                  {latestPrice
                    ? `${formatRupiah(latestPrice.close)} (${latestPrice.date})`
                    : "Tidak ada data penutupan"}
                </p>
                <p>
                  <span className="font-medium">Jumlah data:</span>{" "}
                  {marketResult.data.prices.length}
                </p>
                <p>
                  <span className="font-medium">Harga pasar reguler:</span>{" "}
                  {typeof marketResult.data.regularMarketPrice === "number"
                    ? `${formatRupiah(marketResult.data.regularMarketPrice)} ${
                        marketResult.data.currency ?? ""
                      }`
                    : "-"}
                </p>
              </div>
            ) : null}
          </ResultBox>
        </form>

        <form
          onSubmit={fetchBiRates}
          className="rounded-lg border border-stone-200 p-4"
        >
          <h3 className="font-semibold text-stone-950">
            Data kurs Bank Indonesia
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Mata uang
              <input
                className="input"
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value.toUpperCase())
                }
                placeholder="USD"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Tanggal mulai
              <input
                className="input"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Tanggal akhir
              <input
                className="input"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
          <button
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBiLoading}
          >
            {isBiLoading ? "Mengambil data..." : "Ambil kurs BI"}
          </button>

          <ResultBox status={biResult.status} error={biResult.error}>
            {biResult.data?.rates ? (
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Mata uang:</span>{" "}
                  {biResult.data.currency}
                </p>
                <p>
                  <span className="font-medium">Status respons:</span>{" "}
                  {biResult.status}
                </p>
                <p>
                  <span className="font-medium">Jumlah data:</span>{" "}
                  {biResult.data.rates.length}
                </p>
                {biResult.data.rates[0] ? (
                  <p>
                    <span className="font-medium">Kurs tengah pertama:</span>{" "}
                    {formatRupiah(biResult.data.rates[0].middle)} (
                    {biResult.data.rates[0].date})
                  </p>
                ) : (
                  <p>Tidak ada kurs untuk rentang tanggal ini.</p>
                )}
              </div>
            ) : null}
          </ResultBox>
        </form>
      </div>
    </section>
  );
}

function ResultBox({
  status,
  error,
  children,
}: {
  status?: number;
  error?: string;
  children: React.ReactNode;
}) {
  if (!status && !error) {
    return (
      <p className="mt-4 text-sm text-stone-500">
        Belum ada request yang dikirim.
      </p>
    );
  }

  return (
    <div
      className={`mt-4 rounded-lg p-4 text-sm leading-6 ${
        error ? "bg-rose-50 text-rose-950" : "bg-stone-100 text-stone-700"
      }`}
    >
      {status ? (
        <p className="mb-2 font-semibold">
          Status respons: <span>{status}</span>
        </p>
      ) : null}
      {error ? <p>{error}</p> : children}
    </div>
  );
}

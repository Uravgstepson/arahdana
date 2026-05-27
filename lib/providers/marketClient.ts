import type { DataSource, PricePoint } from "@/lib/types/investment";
import { fetchMarketQuote } from "@/lib/market/marketDataClient";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";

export type MarketApiResponse = {
  source: string;
  ticker: string;
  currency?: string | null;
  exchangeName?: string | null;
  regularMarketPrice?: number | null;
  prices: PricePoint[];
  message?: string;
  error?: string;
};

export async function fetchPublicMarketData({
  ticker,
  range = "1mo",
  interval = "1d",
  live = false,
  source = "auto",
}: {
  ticker: string;
  range?: string;
  interval?: string;
  live?: boolean;
  source?: "auto" | "google" | "yahoo";
}) {
  if (source === "auto") {
    const quote = await fetchMarketQuote(normalizeMarketTicker(ticker)).catch(
      () => null,
    );
    if (quote?.price) {
      const updatedDate = quote.updated_at
        ? new Date(quote.updated_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      return {
        source: quote.source,
        ticker: normalizeMarketTicker(ticker),
        currency: quote.currency,
        exchangeName: quote.market_status,
        regularMarketPrice: quote.price,
        prices: [{ date: updatedDate, close: quote.price }],
        message: quote.is_delayed ? "Data tertunda" : undefined,
      } satisfies MarketApiResponse;
    }

    throw new Error(
      "Harga otomatis belum tersedia. Gunakan input manual sampai quote cache provider aktif.",
    );
  }

  const params = new URLSearchParams({
    ticker: normalizeMarketTicker(ticker),
    source,
    range,
    interval,
    live: live ? "1" : "0",
  });
  const response = await fetch(`/api/market?${params.toString()}`);
  const payload = (await response.json()) as Partial<MarketApiResponse>;

  if (!response.ok) {
    throw new Error(
      payload.message || payload.error || "Data pasar tidak bisa diperbarui.",
    );
  }

  const prices = Array.isArray(payload.prices)
    ? payload.prices.filter(
        (price) => Number.isFinite(price.close) && price.close > 0,
      )
    : [];

  if (prices.length === 0) {
    throw new Error(
      "Data pasar tidak mengembalikan catatan harga yang bisa dipakai.",
    );
  }

  return {
    source: payload.source ?? "Market Data API",
    ticker: payload.ticker ?? ticker.trim().toUpperCase(),
    currency: payload.currency ?? null,
    exchangeName: payload.exchangeName ?? null,
    regularMarketPrice: payload.regularMarketPrice ?? null,
    prices,
  } satisfies MarketApiResponse;
}

export function getLatestClose(prices: PricePoint[]) {
  return prices.at(-1)?.close ?? null;
}

export function dataSourceLabel(source?: DataSource) {
  if (source === "live_public_market_data") return "Data pasar publik langsung";
  if (source === "manual_input") return "Input manual";
  if (source === "semi_auto_import") return "Impor semi-otomatis";
  if (source === "bibit_import") return "Impor Bibit";
  if (source === "savings_import") return "Impor tabungan";
  return "Data contoh";
}

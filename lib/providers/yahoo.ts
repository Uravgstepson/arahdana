import type { PricePoint } from "@/lib/types/investment";

export type YahooMarketData = {
  source: string;
  ticker: string;
  currency: string | null;
  exchangeName: string | null;
  regularMarketPrice: number | null;
  prices: PricePoint[];
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        regularMarketPrice?: number;
        symbol?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { code?: string; description?: string };
  };
};

type YahooQuote = {
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
  volume?: Array<number | null>;
};

export class MarketDataError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "MarketDataError";
    this.status = status;
  }
}

export async function fetchYahooChart(
  ticker: string,
  range: string,
  interval: string,
): Promise<YahooMarketData> {
  const safeTicker = ticker.trim().toUpperCase();
  if (!isValidTicker(safeTicker)) {
    throw new MarketDataError("Ticker tidak valid. Gunakan format seperti BBCA.JK atau ^JKSE.", 400);
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    safeTicker,
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

  const response = await fetch(url, {
    next: { revalidate: 900 },
    headers: { "User-Agent": "ArahDana/1.0" },
  });

  if (!response.ok) {
    const status = response.status === 404 ? 404 : 502;
    throw new MarketDataError(`Pengambilan data pasar gagal dengan HTTP ${response.status}.`, status);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const yahooError = payload.chart?.error;
  if (yahooError) {
    throw new MarketDataError(yahooError.description ?? "Ticker tidak ditemukan.", 404);
  }

  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result || !quote || !result.timestamp?.length) {
    throw new MarketDataError("Ticker tidak valid atau Yahoo tidak mengembalikan data harga.", 404);
  }

  const prices = normalizeYahooPrices(result.timestamp, quote);
  if (prices.length === 0) {
    throw new MarketDataError("Data harga kosong. Coba ticker, range, atau interval lain.", 404);
  }

  return {
    source: "Endpoint chart publik Yahoo Finance",
    ticker: result.meta?.symbol ?? safeTicker,
    currency: result.meta?.currency ?? null,
    exchangeName: result.meta?.fullExchangeName ?? result.meta?.exchangeName ?? null,
    regularMarketPrice: toNumber(result.meta?.regularMarketPrice) ?? prices.at(-1)?.close ?? null,
    prices,
  };
}

function normalizeYahooPrices(timestamps: number[], quote: YahooQuote) {
  const prices: PricePoint[] = [];

  timestamps.forEach((timestamp, index) => {
    const close = toNumber(quote.close?.[index]);
    if (close === null) return;

    prices.push({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: toNumber(quote.open?.[index]) ?? close,
      high: toNumber(quote.high?.[index]) ?? close,
      low: toNumber(quote.low?.[index]) ?? close,
      close,
      volume: toNumber(quote.volume?.[index]) ?? 0,
    });
  });

  return prices;
}

function isValidTicker(ticker: string) {
  return /^[A-Z0-9.^=-]{1,32}$/.test(ticker);
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

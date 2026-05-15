import type { PricePoint } from "@/lib/types/investment";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";

export type GoogleMarketData = {
  source: string;
  ticker: string;
  currency: string | null;
  exchangeName: string | null;
  regularMarketPrice: number | null;
  prices: PricePoint[];
};

type YahooQuote = {
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
  volume?: Array<number | null>;
};

type YahooChartResult = {
  timestamp?: number[];
  indicators?: {
    quote?: YahooQuote[];
  };
  meta?: {
    symbol?: string;
    currency?: string;
    fullExchangeName?: string;
    exchangeName?: string;
    regularMarketPrice?: number | null;
  };
};

type YahooChartPayload = {
  chart?: {
    error?: {
      description?: string;
    } | null;
    result?: YahooChartResult[] | null;
  };
};

type AlphaVantageDaily = {
  "1. open"?: string;
  "2. high"?: string;
  "3. low"?: string;
  "4. close"?: string;
  "5. volume"?: string;
};

type AlphaVantagePayload = {
  Note?: string;
  Error?: string;
  "Time Series (Daily)"?: Record<string, AlphaVantageDaily>;
};

export class MarketDataError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "MarketDataError";
    this.status = status;
  }
}

/**
 * Fetch market data - uses Yahoo Finance for Indonesian stocks (most reliable)
 * Falls back to Alpha Vantage for other tickers
 */
export async function fetchGoogleFinanceData(
  ticker: string,
  range: string,
  interval: string,
): Promise<GoogleMarketData> {
  const safeTicker = normalizeMarketTicker(ticker);
  if (!isValidTicker(safeTicker)) {
    throw new MarketDataError(
      "Ticker tidak valid. Gunakan format seperti BBCA, BBCA.JK, AAPL, BRK-B, BTC-USD, atau IDR=X.",
      400,
    );
  }

  try {
    return await fetchFromYahooFinance(safeTicker, range, interval);
  } catch (error) {
    return await fetchFromAlphaVantageFallback(safeTicker, range, interval, error);
  }
}

async function fetchFromAlphaVantageFallback(
  ticker: string,
  range: string,
  interval: string,
  originalError: unknown,
) {
  try {
    return await fetchFromAlphaVantage(ticker, range, interval);
  } catch {
    throw originalError instanceof MarketDataError
      ? originalError
      : new MarketDataError("Data pasar tidak tersedia untuk ticker ini.", 404);
  }
}

/**
 * Fetch from Yahoo Finance API (works best for Indonesian stocks)
 */
async function fetchFromYahooFinance(
  ticker: string,
  range: string,
  interval: string,
): Promise<GoogleMarketData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

  const response = await fetch(url, {
    next: { revalidate: interval.endsWith("m") ? 60 : 900 },
    headers: { "User-Agent": "ArahDana/1.0" },
  });

  if (!response.ok) {
    const status = response.status === 404 ? 404 : 502;
    throw new MarketDataError(
      `Pengambilan data dari Yahoo Finance gagal dengan HTTP ${response.status}.`,
      status,
    );
  }

  const payload = (await response.json()) as YahooChartPayload;
  const yahooError = payload.chart?.error;
  if (yahooError) {
    throw new MarketDataError(
      yahooError.description ?? "Ticker tidak ditemukan.",
      404,
    );
  }

  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result || !quote || !result.timestamp?.length) {
    throw new MarketDataError(
      "Ticker tidak valid atau Yahoo tidak mengembalikan data harga.",
      404,
    );
  }

  const prices = normalizeYahooPrices(result.timestamp, quote);
  if (prices.length === 0) {
    throw new MarketDataError(
      "Data harga kosong. Coba ticker, range, atau interval lain.",
      404,
    );
  }

  return {
    source: "Google Finance (Yahoo Finance Data)",
    ticker: result.meta?.symbol ?? ticker,
    currency: result.meta?.currency ?? null,
    exchangeName:
      result.meta?.fullExchangeName ?? result.meta?.exchangeName ?? null,
    regularMarketPrice:
      toNumber(result.meta?.regularMarketPrice) ?? prices.at(-1)?.close ?? null,
    prices,
  };
}

/**
 * Fetch from Alpha Vantage API (as fallback for non-Indonesian stocks)
 */
async function fetchFromAlphaVantage(
  ticker: string,
  range: string,
  interval: string,
): Promise<GoogleMarketData> {
  void interval;

  // Use demo key (limited) - this is a fallback only
  const apiKey = "demo";
  const outputSize = range === "1mo" ? "compact" : "full";

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
    ticker,
  )}&outputsize=${outputSize}&apikey=${apiKey}`;

  const response = await fetch(url, {
    next: { revalidate: 900 },
    headers: { "User-Agent": "ArahDana/1.0" },
  });

  if (!response.ok) {
    throw new MarketDataError(
      `Pengambilan data dari Alpha Vantage gagal dengan HTTP ${response.status}.`,
      502,
    );
  }

  const payload = (await response.json()) as AlphaVantagePayload;

  if (payload.Note || payload.Error) {
    throw new MarketDataError(
      payload.Note ||
        payload.Error ||
        "API limit tercapai atau ticker tidak ditemukan.",
      429,
    );
  }

  const timeSeries = payload["Time Series (Daily)"];
  if (
    !timeSeries ||
    typeof timeSeries !== "object" ||
    Object.keys(timeSeries).length === 0
  ) {
    throw new MarketDataError(
      "Ticker tidak valid atau Alpha Vantage tidak mengembalikan data harga.",
      404,
    );
  }

  const prices = normalizeAlphaVantagePrices(timeSeries);

  if (prices.length === 0) {
    throw new MarketDataError(
      "Data harga kosong. Coba ticker atau format lain.",
      404,
    );
  }

  const latestPrice = prices[prices.length - 1];

  return {
    source: "Google Finance (Alpha Vantage Data)",
    ticker: ticker,
    currency: "IDR",
    exchangeName: null,
    regularMarketPrice: latestPrice?.close ?? null,
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

function normalizeAlphaVantagePrices(
  timeSeries: Record<string, AlphaVantageDaily>,
) {
  const prices: PricePoint[] = [];

  // Sort dates in chronological order
  const sortedDates = Object.keys(timeSeries).sort();

  sortedDates.forEach((dateStr) => {
    const data = timeSeries[dateStr];
    const close = parseFloat(data["4. close"] ?? "");

    if (!Number.isFinite(close) || close <= 0) return;

    prices.push({
      date: dateStr,
      open: parseFloat(data["1. open"] ?? "") || close,
      high: parseFloat(data["2. high"] ?? "") || close,
      low: parseFloat(data["3. low"] ?? "") || close,
      close,
      volume: parseInt(data["5. volume"] ?? "", 10) || 0,
    });
  });

  return prices;
}

function isValidTicker(ticker: string) {
  return /^[A-Z0-9.^:=-]{1,48}$/.test(ticker);
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

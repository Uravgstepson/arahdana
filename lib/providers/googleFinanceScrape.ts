import type { PricePoint } from "@/lib/types/investment";
import { toYahooFinanceSymbol } from "@/lib/market/tickerSymbols";
import { fetchYahooChart, MarketDataError as YahooMarketDataError } from "@/lib/providers/yahoo";

export type GoogleScrapeMarketData = {
  source: string;
  ticker: string;
  currency: string | null;
  exchangeName: string | null;
  regularMarketPrice: number | null;
  prices: PricePoint[];
};

export class GoogleScrapeError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "GoogleScrapeError";
    this.status = status;
  }
}

/**
 * Best-effort Google Finance integration.
 *
 * Today we scrape quote metadata from Google Finance HTML (ticker format `BBCA:IDX`, `AAPL:NASDAQ`, dll),
 * then we use Yahoo chart as a reliable way to obtain OHLC series (converted symbol for IDX -> `.JK`).
 *
 * If the Google HTML structure changes, this function will throw so the route can fallback to Yahoo fully.
 */
export async function fetchGoogleFinanceScrape(
  ticker: string,
  range: string,
  interval: string,
): Promise<GoogleScrapeMarketData> {
  const googleSymbol = ticker.trim().toUpperCase();
  if (!googleSymbol) {
    throw new GoogleScrapeError("Ticker kosong.", 400);
  }

  const quoteMeta = await fetchGoogleQuoteMeta(googleSymbol);

  // Chart series: use Yahoo as a stable, non-authenticated source.
  // For IDX, convert `BBCA:IDX` -> `BBCA.JK`.
  const yahooSymbol = toYahooFinanceSymbol(googleSymbol);
  let chart;
  try {
    chart = await fetchYahooChart(yahooSymbol, range, interval);
  } catch (error) {
    // If Yahoo fails too, surface Yahoo error (more actionable for users).
    if (error instanceof YahooMarketDataError) {
      throw new GoogleScrapeError(error.message, error.status);
    }
    throw error;
  }

  return {
    source: "Google Finance (quote) + Yahoo Finance (chart)",
    ticker: quoteMeta.ticker ?? googleSymbol,
    currency: quoteMeta.currency ?? chart.currency ?? null,
    exchangeName: quoteMeta.exchangeName ?? chart.exchangeName ?? null,
    regularMarketPrice:
      quoteMeta.regularMarketPrice ?? chart.regularMarketPrice ?? null,
    prices: chart.prices,
  };
}

async function fetchGoogleQuoteMeta(symbol: string) {
  const url = `https://www.google.com/finance/quote/${encodeURIComponent(symbol)}?hl=en`;
  const response = await fetch(url, {
    // Keep it light; metadata changes infrequently.
    next: { revalidate: 900 },
    headers: {
      "User-Agent": "Mozilla/5.0 (ArahDana/1.0)",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    },
  });

  if (!response.ok) {
    const status = response.status === 404 ? 404 : 502;
    throw new GoogleScrapeError(
      `Google Finance gagal dimuat (HTTP ${response.status}).`,
      status,
    );
  }

  const html = await response.text();

  // We rely on ds:6 which, at the time of writing, contains quote metadata.
  const dataArray = extractAfInitDataArray(html, "ds:6");
  if (!dataArray) {
    throw new GoogleScrapeError(
      "Struktur data Google Finance berubah; metadata ticker tidak bisa diparse.",
      502,
    );
  }

  try {
    const parsed = JSON.parse(dataArray) as unknown;
    const quote = pickQuoteFromDs6(parsed);
    return quote;
  } catch {
    throw new GoogleScrapeError(
      "Gagal membaca metadata Google Finance untuk ticker ini.",
      502,
    );
  }
}

function extractAfInitDataArray(html: string, dsKey: string) {
  const marker = `key: '${dsKey}'`;
  const keyIndex = html.indexOf(marker);
  if (keyIndex < 0) return null;

  const dataIndex = html.indexOf("data:", keyIndex);
  if (dataIndex < 0) return null;

  const start = html.indexOf("[", dataIndex);
  if (start < 0) return null;

  const end = findMatchingBracket(html, start);
  if (end < 0) return null;

  return html.slice(start, end + 1);
}

function findMatchingBracket(source: string, startIndex: number) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function pickQuoteFromDs6(parsed: unknown): {
  ticker: string | null;
  currency: string | null;
  exchangeName: string | null;
  regularMarketPrice: number | null;
} {
  // ds:6 structure is a deeply nested array. We grab the parts we can find safely.
  if (!Array.isArray(parsed)) {
    return { ticker: null, currency: null, exchangeName: null, regularMarketPrice: null };
  }

  // Heuristic: find first string that looks like `BBCA:IDX`.
  let ticker: string | null = null;
  let currency: string | null = null;
  let regularMarketPrice: number | null = null;

  const stack: unknown[] = [parsed];
  while (stack.length) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
      continue;
    }
    if (typeof node === "string") {
      if (!ticker && /^[A-Z0-9.-]{1,24}:[A-Z0-9.-]{1,24}$/.test(node)) {
        ticker = node;
      }
      if (!currency && /^[A-Z]{3}$/.test(node)) {
        currency = node;
      }
    }
    if (typeof node === "number") {
      // Quote meta often contains repeated numeric fields; pick the first plausible price.
      if (!regularMarketPrice && Number.isFinite(node) && node > 0 && node < 1_000_000_000) {
        regularMarketPrice = node;
      }
    }
  }

  return {
    ticker,
    currency,
    exchangeName: null,
    regularMarketPrice,
  };
}


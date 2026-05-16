import { NextResponse } from "next/server";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";
import { toYahooFinanceSymbol } from "@/lib/market/tickerSymbols";
import { fetchGoogleFinanceScrape, GoogleScrapeError } from "@/lib/providers/googleFinanceScrape";
import { fetchYahooChart, MarketDataError as YahooMarketDataError } from "@/lib/providers/yahoo";
import { validateTicker } from "@/lib/validation";

export const revalidate = 900;

const allowedSources = new Set(["auto", "google", "yahoo"]);
const allowedRanges = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"]);
const allowedIntervals = new Set(["5m", "15m", "1d", "1wk"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTicker = searchParams.get("ticker") || "BBCA:IDX";
  const tickerValidation = validateTicker(rawTicker);
  if (tickerValidation) {
    return NextResponse.json(
      {
        source: "Market Data API",
        ticker: rawTicker,
        error: "Parameter ticker tidak valid.",
        message: tickerValidation,
      },
      { status: 400 },
    );
  }
  const ticker = normalizeMarketTicker(rawTicker);

  const source = (searchParams.get("source") || "auto").toLowerCase();
  const range = searchParams.get("range") || "1y";
  const interval = searchParams.get("interval") || "1d";
  const live = searchParams.get("live") === "1";

  if (!allowedSources.has(source)) {
    return NextResponse.json(
      {
        source: "Market Data API",
        ticker,
        error: "Parameter source tidak valid.",
        message: "Gunakan source=auto|google|yahoo.",
      },
      { status: 400 },
    );
  }

  if (!allowedRanges.has(range)) {
    return NextResponse.json(
      {
        source: "Market Data API",
        ticker,
        error: "Parameter range tidak valid.",
        message: "Range didukung: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max.",
      },
      { status: 400 },
    );
  }

  if (!allowedIntervals.has(interval)) {
    return NextResponse.json(
      {
        source: "Market Data API",
        ticker,
        error: "Parameter interval tidak valid.",
        message: "Interval didukung: 5m, 15m, 1d, 1wk.",
      },
      { status: 400 },
    );
  }

  // Prevent invalid combos (minute intervals only for short ranges).
  const effectiveRange =
    interval.endsWith("m") && !["1d", "5d"].includes(range) ? "1d" : range;

  try {
    if (source === "yahoo") {
      const yahooSymbol = toYahooFinanceSymbol(ticker);
      const marketData = await fetchYahooChart(yahooSymbol, effectiveRange, interval);
      return NextResponse.json(
        {
          ...marketData,
          source: "Yahoo Finance (chart)",
          ticker,
        },
        { headers: live ? { "Cache-Control": "no-store" } : undefined },
      );
    }

    if (source === "google") {
      const marketData = await fetchGoogleFinanceScrape(ticker, effectiveRange, interval);
      return NextResponse.json(marketData, {
        headers: live ? { "Cache-Control": "no-store" } : undefined,
      });
    }

    // auto: try Google scrape first, fallback to Yahoo.
    try {
      const marketData = await fetchGoogleFinanceScrape(ticker, effectiveRange, interval);
      return NextResponse.json(marketData, {
        headers: live ? { "Cache-Control": "no-store" } : undefined,
      });
    } catch {
      const yahooSymbol = toYahooFinanceSymbol(ticker);
      const marketData = await fetchYahooChart(yahooSymbol, effectiveRange, interval);
      return NextResponse.json(
        {
          ...marketData,
          source: `Fallback: Yahoo Finance (chart)`,
          ticker,
        },
        { headers: live ? { "Cache-Control": "no-store" } : undefined },
      );
    }
  } catch (error) {
    const status =
      error instanceof GoogleScrapeError
        ? error.status
        : error instanceof YahooMarketDataError
          ? error.status
          : 502;
    return NextResponse.json(
      {
        source: "Market Data API",
        ticker,
        error: error instanceof Error ? error.message : "Gagal mengambil data pasar",
        message:
          status === 400 || status === 404
            ? "Ticker tidak valid atau data harga tidak tersedia. Contoh: BBCA:IDX, TLKM:IDX, AAPL, BTC-USD, IDR=X."
            : status === 429
              ? "API limit tercapai. Coba lagi dalam beberapa saat."
              : "Data pasar sedang tidak tersedia. Coba lagi nanti atau gunakan input manual.",
      },
      {
        status,
        headers: live ? { "Cache-Control": "no-store" } : undefined,
      },
    );
  }
}

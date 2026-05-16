import { NextResponse } from "next/server";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";
import { toYahooFinanceSymbol } from "@/lib/market/tickerSymbols";
import { fetchYahooChart, MarketDataError } from "@/lib/providers/yahoo";
import { validateTicker } from "@/lib/validation";

export const revalidate = 900;

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
  const range = searchParams.get("range") || "1y";
  const interval = searchParams.get("interval") || "1d";
  const live = searchParams.get("live") === "1";

  try {
    const marketData = await fetchYahooChart(toYahooFinanceSymbol(ticker), range, interval);
    return NextResponse.json(
      {
        ...marketData,
        source: "Yahoo Finance (chart)",
        ticker,
      },
      {
      headers: live ? { "Cache-Control": "no-store" } : undefined,
      },
    );
  } catch (error) {
    const status = error instanceof MarketDataError ? error.status : 502;
    return NextResponse.json(
      {
        source: "Market Data API",
        ticker,
        error:
          error instanceof Error ? error.message : "Gagal mengambil data pasar",
        message:
          status === 400 || status === 404
            ? "Ticker tidak valid atau data harga tidak tersedia. Format: BBCA:IDX, AAPL, BTC-USD, atau ^JKSE untuk indeks."
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

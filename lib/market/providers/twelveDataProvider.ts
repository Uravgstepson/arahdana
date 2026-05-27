import type { MarketAssetRecord } from "@/lib/market/types";
import {
  delayedQuote,
  normalizeAssetType,
  providerAssetId,
  readNumber,
  type MarketProvider,
} from "@/lib/market/providers/shared";

const endpoint = "https://api.twelvedata.com";

export function createTwelveDataProvider(apiKey: string): MarketProvider {
  return {
    name: "twelve_data",
    async search({ query, limit = 8 }) {
      const url = new URL(`${endpoint}/symbol_search`);
      url.searchParams.set("symbol", query);
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url);
      const payload = (await response.json()) as {
        data?: Array<Record<string, string>>;
      };

      return (payload.data ?? []).slice(0, limit).map((item) => {
        const symbol = item.symbol ?? "";
        const exchange = item.exchange ?? item.exchange_timezone ?? null;
        return {
          id: providerAssetId("twelve_data", symbol, exchange),
          symbol,
          display_name: item.instrument_name ?? symbol,
          search_aliases: [query, item.exchange, item.country, item.type].filter(Boolean),
          type: normalizeAssetType(item.type),
          exchange,
          currency: item.currency ?? null,
          logo_url: null,
          provider: "twelve_data",
          last_updated: null,
        } satisfies MarketAssetRecord;
      });
    },
    async quote({ symbol, assetId }) {
      const url = new URL(`${endpoint}/quote`);
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url);
      const payload = (await response.json()) as Record<string, unknown>;
      const close = readNumber(payload.close ?? payload.price);
      if (close === null) return null;

      return delayedQuote({
        assetId: assetId ?? providerAssetId("twelve_data", symbol),
        price: close,
        change: readNumber(payload.change),
        changePercent: readNumber(payload.percent_change),
        currency: typeof payload.currency === "string" ? payload.currency : null,
        source: "Twelve Data",
        updatedAt:
          typeof payload.datetime === "string"
            ? new Date(payload.datetime).toISOString()
            : null,
      });
    },
  };
}

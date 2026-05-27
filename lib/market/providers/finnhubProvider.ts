import type { MarketAssetRecord } from "@/lib/market/types";
import {
  delayedQuote,
  normalizeAssetType,
  providerAssetId,
  readNumber,
  type MarketProvider,
} from "@/lib/market/providers/shared";

const endpoint = "https://finnhub.io/api/v1";

export function createFinnhubProvider(apiKey: string): MarketProvider {
  return {
    name: "finnhub",
    async search({ query, limit = 8 }) {
      const url = new URL(`${endpoint}/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("token", apiKey);

      const response = await fetch(url);
      const payload = (await response.json()) as {
        result?: Array<Record<string, string>>;
      };

      return (payload.result ?? []).slice(0, limit).map((item) => {
        const symbol = item.symbol ?? "";
        return {
          id: providerAssetId("finnhub", symbol),
          symbol,
          display_name: item.description ?? symbol,
          search_aliases: [query, item.description, item.type].filter(Boolean),
          type: normalizeAssetType(item.type),
          exchange: null,
          currency: null,
          logo_url: null,
          provider: "finnhub",
          last_updated: null,
        } satisfies MarketAssetRecord;
      });
    },
    async quote({ symbol, assetId }) {
      const url = new URL(`${endpoint}/quote`);
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("token", apiKey);

      const response = await fetch(url);
      const payload = (await response.json()) as Record<string, unknown>;
      const price = readNumber(payload.c);
      if (price === null || price <= 0) return null;

      return delayedQuote({
        assetId: assetId ?? providerAssetId("finnhub", symbol),
        price,
        change: readNumber(payload.d),
        changePercent: readNumber(payload.dp),
        source: "Finnhub",
        updatedAt:
          typeof payload.t === "number"
            ? new Date(payload.t * 1000).toISOString()
            : null,
      });
    },
  };
}

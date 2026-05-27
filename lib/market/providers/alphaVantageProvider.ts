import type { MarketAssetRecord } from "@/lib/market/types";
import {
  delayedQuote,
  normalizeAssetType,
  providerAssetId,
  readNumber,
  type MarketProvider,
} from "@/lib/market/providers/shared";

const endpoint = "https://www.alphavantage.co/query";

export function createAlphaVantageProvider(apiKey: string): MarketProvider {
  return {
    name: "alpha_vantage",
    async search({ query, limit = 8 }) {
      const url = new URL(endpoint);
      url.searchParams.set("function", "SYMBOL_SEARCH");
      url.searchParams.set("keywords", query);
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url);
      const payload = (await response.json()) as {
        bestMatches?: Array<Record<string, string>>;
      };

      return (payload.bestMatches ?? []).slice(0, limit).map((match) => {
        const symbol = match["1. symbol"] ?? "";
        const exchange = match["4. region"] ?? match["3. type"] ?? null;
        return {
          id: providerAssetId("alpha_vantage", symbol, exchange),
          symbol,
          display_name: match["2. name"] ?? symbol,
          search_aliases: [query, match["3. type"], match["4. region"]].filter(Boolean),
          type: normalizeAssetType(match["3. type"]),
          exchange,
          currency: match["8. currency"] ?? null,
          logo_url: null,
          provider: "alpha_vantage",
          last_updated: null,
        } satisfies MarketAssetRecord;
      });
    },
    async quote({ symbol, assetId }) {
      const url = new URL(endpoint);
      url.searchParams.set("function", "GLOBAL_QUOTE");
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url);
      const payload = (await response.json()) as {
        "Global Quote"?: Record<string, string>;
      };
      const quote = payload["Global Quote"];
      if (!quote) return null;

      return delayedQuote({
        assetId: assetId ?? providerAssetId("alpha_vantage", symbol),
        price: readNumber(quote["05. price"]),
        change: readNumber(quote["09. change"]),
        changePercent: readPercent(quote["10. change percent"]),
        currency: null,
        source: "Alpha Vantage",
        updatedAt: quote["07. latest trading day"]
          ? new Date(`${quote["07. latest trading day"]}T23:59:00Z`).toISOString()
          : null,
      });
    },
  };
}

function readPercent(value: string | undefined) {
  if (!value) return null;
  return readNumber(value.replace("%", ""));
}

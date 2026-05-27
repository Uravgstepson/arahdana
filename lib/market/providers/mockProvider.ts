import { marketAssets } from "@/lib/market/discovery";
import type { MarketAssetRecord } from "@/lib/market/types";
import {
  delayedQuote,
  normalizeAssetType,
  providerAssetId,
  type MarketProvider,
} from "@/lib/market/providers/shared";

export function createMockProvider(): MarketProvider {
  return {
    name: "mock",
    async search({ query, limit = 8 }) {
      const normalized = query.toLowerCase();
      return marketAssets
        .filter((asset) =>
          [asset.name, asset.ticker ?? "", ...asset.aliases]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
        .slice(0, limit)
        .map((asset) => ({
          id: providerAssetId("mock", asset.ticker ?? asset.id),
          symbol: asset.ticker ?? asset.id.toUpperCase(),
          display_name: asset.name,
          search_aliases: asset.aliases,
          type: normalizeAssetType(asset.category),
          exchange: asset.region,
          currency: asset.value.startsWith("Rp") ? "IDR" : null,
          logo_url: null,
          provider: "mock",
          last_updated: null,
        }) satisfies MarketAssetRecord);
    },
    async quote({ symbol, assetId }) {
      return delayedQuote({
        assetId: assetId ?? providerAssetId("mock", symbol),
        price: null,
        source: "Development mock",
      });
    },
  };
}

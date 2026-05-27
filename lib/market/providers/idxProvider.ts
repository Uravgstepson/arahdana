import type { MarketProvider } from "@/lib/market/providers/shared";

export function createIdxProvider(_apiKey: string): MarketProvider {
  void _apiKey;
  return {
    name: "idx",
    async search() {
      return [];
    },
    async quote() {
      return null;
    },
  };
}

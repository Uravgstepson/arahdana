import type { MarketProvider } from "@/lib/market/providers/shared";
import { createAlphaVantageProvider } from "@/lib/market/providers/alphaVantageProvider";
import { createFinnhubProvider } from "@/lib/market/providers/finnhubProvider";
import { createIdxProvider } from "@/lib/market/providers/idxProvider";
import { createMockProvider } from "@/lib/market/providers/mockProvider";
import { createTwelveDataProvider } from "@/lib/market/providers/twelveDataProvider";

export function createConfiguredMarketProvider() {
  const preferred = process.env.MARKET_PROVIDER?.trim();
  const providers = createAvailableProviders();

  if (preferred) {
    const match = providers.find((provider) => provider.name === preferred);
    if (match) return match;
  }

  return providers[0] ?? createMockProvider();
}

export function createAvailableProviders(): MarketProvider[] {
  const providers: MarketProvider[] = [];

  if (process.env.TWELVE_DATA_API_KEY) {
    providers.push(createTwelveDataProvider(process.env.TWELVE_DATA_API_KEY));
  }
  if (process.env.FINNHUB_API_KEY) {
    providers.push(createFinnhubProvider(process.env.FINNHUB_API_KEY));
  }
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    providers.push(createAlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY));
  }
  if (process.env.IDX_PROVIDER_API_KEY) {
    providers.push(createIdxProvider(process.env.IDX_PROVIDER_API_KEY));
  }
  if (process.env.NODE_ENV === "development") {
    providers.push(createMockProvider());
  }

  return providers;
}

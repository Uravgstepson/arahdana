import type {
  MarketAssetRecord,
  MarketAssetType,
  MarketQuoteRecord,
} from "@/lib/market/types";

export type MarketProviderName =
  | "alpha_vantage"
  | "twelve_data"
  | "finnhub"
  | "idx"
  | "mock";

export type ProviderSearchOptions = {
  query: string;
  limit?: number;
};

export type ProviderQuoteOptions = {
  symbol: string;
  assetId?: string;
  exchange?: string | null;
};

export type MarketProvider = {
  name: MarketProviderName;
  search(options: ProviderSearchOptions): Promise<MarketAssetRecord[]>;
  quote(options: ProviderQuoteOptions): Promise<MarketQuoteRecord | null>;
};

export function providerAssetId(provider: string, symbol: string, exchange?: string | null) {
  return `${provider}:${exchange ?? "global"}:${symbol}`.toLowerCase();
}

export function normalizeAssetType(value: string | null | undefined): MarketAssetType {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("crypto")) return "crypto";
  if (normalized.includes("forex") || normalized.includes("currency")) return "forex";
  if (normalized.includes("index")) return "index";
  if (normalized.includes("commodity")) return "commodity";
  if (normalized.includes("fund")) return "mutual_fund";
  if (normalized.includes("bond")) return "bond";
  if (normalized.includes("idx") || normalized.includes("indonesia")) return "idx_stock";
  return "global_stock";
}

export function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function delayedQuote(params: {
  assetId: string;
  price: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency?: string | null;
  source: string;
  updatedAt?: string | null;
}): MarketQuoteRecord {
  return {
    asset_id: params.assetId,
    price: params.price,
    change: params.change ?? null,
    change_percent: params.changePercent ?? null,
    currency: params.currency ?? null,
    market_status: "delayed",
    source: params.source,
    is_delayed: true,
    updated_at: params.updatedAt ?? new Date().toISOString(),
  };
}

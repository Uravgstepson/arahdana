export type MarketAssetType =
  | "idx_stock"
  | "global_stock"
  | "index"
  | "forex"
  | "commodity"
  | "crypto"
  | "bond"
  | "mutual_fund"
  | "money_market";

export type MarketStatus = "open" | "closed" | "delayed" | "unknown";

export type MarketAssetRecord = {
  id: string;
  symbol: string;
  display_name: string;
  search_aliases: string[];
  type: MarketAssetType;
  exchange: string | null;
  currency: string | null;
  logo_url: string | null;
  provider: string;
  last_updated: string | null;
};

export type MarketQuoteRecord = {
  asset_id: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  currency: string | null;
  market_status: MarketStatus;
  source: string;
  is_delayed: boolean;
  updated_at: string | null;
};

export type MarketSearchResult = {
  asset: MarketAssetRecord;
  quote: MarketQuoteRecord | null;
};

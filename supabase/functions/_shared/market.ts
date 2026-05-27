/* eslint-disable */
export type MarketAsset = {
  id: string;
  symbol: string;
  display_name: string;
  search_aliases: string[];
  type: string;
  exchange: string | null;
  currency: string | null;
  logo_url: string | null;
  provider: string;
  last_updated: string | null;
};

export type MarketQuote = {
  asset_id: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  currency: string | null;
  market_status: string;
  source: string;
  is_delayed: boolean;
  updated_at: string | null;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

export function chooseProvider() {
  const preferred = Deno.env.get("MARKET_PROVIDER")?.trim();
  const available = [
    Deno.env.get("TWELVE_DATA_API_KEY") ? "twelve_data" : "",
    Deno.env.get("FINNHUB_API_KEY") ? "finnhub" : "",
    Deno.env.get("ALPHA_VANTAGE_API_KEY") ? "alpha_vantage" : "",
    Deno.env.get("IDX_PROVIDER_API_KEY") ? "idx" : "",
  ].filter(Boolean);
  return available.includes(preferred ?? "") ? preferred! : available[0] ?? "mock";
}

export async function providerSearch(query: string, limit = 8) {
  const provider = chooseProvider();
  if (provider === "twelve_data") return twelveDataSearch(query, limit);
  if (provider === "finnhub") return finnhubSearch(query, limit);
  if (provider === "alpha_vantage") return alphaVantageSearch(query, limit);
  return mockSearch(query, limit);
}

export async function providerQuote(symbol: string, assetId?: string) {
  const provider = chooseProvider();
  if (provider === "twelve_data") return twelveDataQuote(symbol, assetId);
  if (provider === "finnhub") return finnhubQuote(symbol, assetId);
  if (provider === "alpha_vantage") return alphaVantageQuote(symbol, assetId);
  return delayedQuote(assetId ?? providerAssetId("mock", symbol), null, "Development mock");
}

export async function cachedSearch(query: string, limit = 8) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return [];

  const response = await fetch(
    `${supabaseUrl}/rest/v1/market_assets?or=(symbol.ilike.*${encodeURIComponent(query)}*,display_name.ilike.*${encodeURIComponent(query)}*)&is_active=eq.true&limit=${limit}`,
    {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!response.ok) return [];
  return (await response.json()) as MarketAsset[];
}

export async function readCachedQuote(assetId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/market_quotes?asset_id=eq.${encodeURIComponent(assetId)}&select=*&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as MarketQuote[];
  return rows[0] ?? null;
}

export async function upsertAsset(asset: MarketAsset) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return asset;

  const response = await fetch(`${supabaseUrl}/rest/v1/market_assets?on_conflict=provider,symbol,exchange`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      symbol: asset.symbol,
      display_name: asset.display_name,
      search_aliases: asset.search_aliases,
      type: asset.type,
      exchange: asset.exchange,
      currency: asset.currency,
      logo_url: asset.logo_url,
      provider: asset.provider,
      is_active: true,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) return asset;
  const rows = (await response.json()) as MarketAsset[];
  return rows[0] ?? asset;
}

export async function upsertQuote(quote: MarketQuote) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return quote;

  await fetch(`${supabaseUrl}/rest/v1/market_quotes?on_conflict=asset_id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      ...quote,
      updated_at: quote.updated_at ?? new Date().toISOString(),
    }),
  });

  if (quote.price !== null) {
    await fetch(`${supabaseUrl}/rest/v1/market_price_history`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        asset_id: quote.asset_id,
        price: quote.price,
        captured_at: quote.updated_at ?? new Date().toISOString(),
        source: quote.source,
      }),
    }).catch(() => undefined);
  }

  return quote;
}

async function twelveDataSearch(query: string, limit: number) {
  const apiKey = Deno.env.get("TWELVE_DATA_API_KEY")!;
  const url = new URL("https://api.twelvedata.com/symbol_search");
  url.searchParams.set("symbol", query);
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url);
  const payload = await response.json();
  return (payload.data ?? []).slice(0, limit).map((item: Record<string, string>) => ({
    id: providerAssetId("twelve_data", item.symbol, item.exchange),
    symbol: item.symbol,
    display_name: item.instrument_name ?? item.symbol,
    search_aliases: [query, item.exchange, item.country, item.type].filter(Boolean),
    type: normalizeType(item.type),
    exchange: item.exchange ?? null,
    currency: item.currency ?? null,
    logo_url: null,
    provider: "twelve_data",
    last_updated: null,
  }));
}

async function twelveDataQuote(symbol: string, assetId?: string) {
  const apiKey = Deno.env.get("TWELVE_DATA_API_KEY")!;
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url);
  const payload = await response.json();
  const price = readNumber(payload.close ?? payload.price);
  if (price === null) return null;
  return delayedQuote(assetId ?? providerAssetId("twelve_data", symbol), price, "Twelve Data", {
    change: readNumber(payload.change),
    changePercent: readNumber(payload.percent_change),
    currency: typeof payload.currency === "string" ? payload.currency : null,
    updatedAt: typeof payload.datetime === "string" ? new Date(payload.datetime).toISOString() : null,
  });
}

async function finnhubSearch(query: string, limit: number) {
  const apiKey = Deno.env.get("FINNHUB_API_KEY")!;
  const url = new URL("https://finnhub.io/api/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("token", apiKey);
  const response = await fetch(url);
  const payload = await response.json();
  return (payload.result ?? []).slice(0, limit).map((item: Record<string, string>) => ({
    id: providerAssetId("finnhub", item.symbol),
    symbol: item.symbol,
    display_name: item.description ?? item.symbol,
    search_aliases: [query, item.description, item.type].filter(Boolean),
    type: normalizeType(item.type),
    exchange: null,
    currency: null,
    logo_url: null,
    provider: "finnhub",
    last_updated: null,
  }));
}

async function finnhubQuote(symbol: string, assetId?: string) {
  const apiKey = Deno.env.get("FINNHUB_API_KEY")!;
  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", apiKey);
  const response = await fetch(url);
  const payload = await response.json();
  const price = readNumber(payload.c);
  if (price === null || price <= 0) return null;
  return delayedQuote(assetId ?? providerAssetId("finnhub", symbol), price, "Finnhub", {
    change: readNumber(payload.d),
    changePercent: readNumber(payload.dp),
    updatedAt: typeof payload.t === "number" ? new Date(payload.t * 1000).toISOString() : null,
  });
}

async function alphaVantageSearch(query: string, limit: number) {
  const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY")!;
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "SYMBOL_SEARCH");
  url.searchParams.set("keywords", query);
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url);
  const payload = await response.json();
  return (payload.bestMatches ?? []).slice(0, limit).map((item: Record<string, string>) => {
    const symbol = item["1. symbol"] ?? "";
    const exchange = item["4. region"] ?? null;
    return {
      id: providerAssetId("alpha_vantage", symbol, exchange),
      symbol,
      display_name: item["2. name"] ?? symbol,
      search_aliases: [query, item["3. type"], item["4. region"]].filter(Boolean),
      type: normalizeType(item["3. type"]),
      exchange,
      currency: item["8. currency"] ?? null,
      logo_url: null,
      provider: "alpha_vantage",
      last_updated: null,
    };
  });
}

async function alphaVantageQuote(symbol: string, assetId?: string) {
  const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY")!;
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url);
  const payload = await response.json();
  const quote = payload["Global Quote"];
  if (!quote) return null;
  return delayedQuote(assetId ?? providerAssetId("alpha_vantage", symbol), readNumber(quote["05. price"]), "Alpha Vantage", {
    change: readNumber(quote["09. change"]),
    changePercent: readNumber(String(quote["10. change percent"] ?? "").replace("%", "")),
    updatedAt: quote["07. latest trading day"] ? new Date(`${quote["07. latest trading day"]}T23:59:00Z`).toISOString() : null,
  });
}

function mockSearch(query: string, limit: number) {
  const seeds = [
    ["BBCA.JK", "Bank Central Asia", "idx_stock", "IDX", "IDR", "Bank BCA bca"],
    ["^JKSE", "IHSG", "index", "IDX", "IDR", "jkse indeks harga saham gabungan"],
    ["USD/IDR", "US Dollar / Rupiah", "forex", "FX", "IDR", "dolar dollar rupiah"],
    ["BTC/USD", "Bitcoin", "crypto", "Crypto", "USD", "btc bitcoin crypto"],
    ["XAU/USD", "Gold", "commodity", "Commodity", "USD", "emas gold xau"],
  ];
  const normalized = query.toLowerCase();
  return seeds
    .filter((item) => item.join(" ").toLowerCase().includes(normalized))
    .slice(0, limit)
    .map(([symbol, name, type, exchange, currency, aliases]) => ({
      id: providerAssetId("mock", symbol, exchange),
      symbol,
      display_name: name,
      search_aliases: aliases.split(" "),
      type,
      exchange,
      currency,
      logo_url: null,
      provider: "mock",
      last_updated: null,
    }));
}

function providerAssetId(provider: string, symbol: string, exchange = "global") {
  return `${provider}:${exchange}:${symbol}`.toLowerCase();
}

function normalizeType(value = "") {
  const normalized = value.toLowerCase();
  if (normalized.includes("crypto")) return "crypto";
  if (normalized.includes("forex") || normalized.includes("currency")) return "forex";
  if (normalized.includes("index")) return "index";
  if (normalized.includes("commodity")) return "commodity";
  if (normalized.includes("fund")) return "mutual_fund";
  if (normalized.includes("bond")) return "bond";
  if (normalized.includes("idx") || normalized.includes("indonesia")) return "idx_stock";
  return "global_stock";
}

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function delayedQuote(
  assetId: string,
  price: number | null,
  source: string,
  options: {
    change?: number | null;
    changePercent?: number | null;
    currency?: string | null;
    updatedAt?: string | null;
  } = {},
) {
  return {
    asset_id: assetId,
    price,
    change: options.change ?? null,
    change_percent: options.changePercent ?? null,
    currency: options.currency ?? null,
    market_status: "delayed",
    source,
    is_delayed: true,
    updated_at: options.updatedAt ?? new Date().toISOString(),
  };
}

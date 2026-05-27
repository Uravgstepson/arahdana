/* eslint-disable */
import {
  cachedSearch,
  corsHeaders,
  json,
  providerSearch,
  providerQuote,
  upsertAsset,
  upsertQuote,
} from "../_shared/market.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const requestedSymbols = Array.isArray(body.symbols)
    ? body.symbols.map((value) => String(value).trim().toUpperCase()).filter(Boolean)
    : [];
  const symbols = [...new Set(requestedSymbols)].slice(0, 24);

  if (symbols.length === 0) {
    const watchlistAssets = await cachedSearch("", 24);
    symbols.push(...watchlistAssets.map((asset) => asset.symbol));
  }

  const quotes = [];
  let failedCount = 0;

  for (const symbol of symbols) {
    const [asset] = await providerSearch(symbol, 1).catch(() => []);
    const savedAsset = asset ? await upsertAsset(asset) : null;
    const quote = await providerQuote(symbol, savedAsset?.id).catch(() => null);
    if (!quote) {
      failedCount += 1;
      continue;
    }
    quotes.push(await upsertQuote(quote));
  }

  return json({
    quotes,
    updated_count: quotes.length,
    failed_count: failedCount,
    is_delayed: true,
  });
});

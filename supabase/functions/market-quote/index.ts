/* eslint-disable */
import {
  corsHeaders,
  json,
  providerSearch,
  providerQuote,
  readCachedQuote,
  upsertAsset,
  upsertQuote,
} from "../_shared/market.ts";

const cacheTtlMs = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  const assetId = typeof body.asset_id === "string" ? body.asset_id : undefined;
  if (!symbol) return json({ error: "symbol is required" }, { status: 400 });

  if (assetId) {
    const cached = await readCachedQuote(assetId);
    if (cached?.updated_at && Date.now() - new Date(cached.updated_at).getTime() < cacheTtlMs) {
      return json({ quote: cached, cached: true });
    }
  }

  let resolvedAssetId = assetId;
  if (!resolvedAssetId) {
    const [asset] = await providerSearch(symbol, 1).catch(() => []);
    if (asset) {
      const savedAsset = await upsertAsset(asset);
      resolvedAssetId = savedAsset.id;
    }
  }

  const quote = await providerQuote(symbol, resolvedAssetId);
  if (!quote) {
    const cached = assetId ? await readCachedQuote(assetId) : null;
    return json({
      quote: cached,
      cached: Boolean(cached),
      message: cached ? "API limit/provider gagal. Memakai cache." : "Harga belum tersedia.",
    });
  }

  const saved = await upsertQuote(quote);
  return json({ quote: saved, cached: false });
});

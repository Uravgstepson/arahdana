/* eslint-disable */
import {
  cachedSearch,
  corsHeaders,
  json,
  providerSearch,
  readCachedQuote,
  upsertAsset,
} from "../_shared/market.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const query = String(body.query ?? "").trim();
  const limit = Math.min(Math.max(Number(body.limit ?? 8), 1), 12);
  if (!query) return json({ results: [] });

  const cached = await cachedSearch(query, limit);
  const providerAssets = cached.length > 0 ? [] : await providerSearch(query, limit);
  const assets = cached.length > 0 ? cached : await Promise.all(providerAssets.map(upsertAsset));
  const results = await Promise.all(
    assets.slice(0, limit).map(async (asset) => ({
      asset,
      quote: await readCachedQuote(asset.id),
    })),
  );

  return json({
    provider: assets[0]?.provider ?? null,
    results,
    delayed: true,
  });
});

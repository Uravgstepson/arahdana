/* eslint-disable */
import { corsHeaders, json, providerQuote, providerSearch, upsertAsset } from "../_shared/market.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const symbols = Array.isArray(body.symbols)
    ? body.symbols.map((value) => String(value).trim().toUpperCase()).filter(Boolean).slice(0, 8)
    : ["^JKSE", "BTC/USD", "USD/IDR"];

  const quotes = (
    await Promise.all(
      symbols.map(async (symbol) => {
        const [asset] = await providerSearch(symbol, 1).catch(() => []);
        const savedAsset = asset ? await upsertAsset(asset) : null;
        return providerQuote(symbol, savedAsset?.id).catch(() => null);
      }),
    )
  ).filter(Boolean);

  const insights = quotes.slice(0, 4).map((quote) => {
    const change = quote!.change_percent ?? 0;
    const direction = change > 0 ? "menguat" : change < 0 ? "melemah" : "stabil";
    const volatility = Math.abs(change) >= 2 ? " dan cukup volatil" : "";
    return `${quote!.asset_id.split(":").at(-1)?.toUpperCase() ?? "Aset"} bergerak ${direction}${volatility} dibanding pembaruan terakhir.`;
  });

  if (insights.length === 0) {
    insights.push("Harga pasar belum tersedia. ArahDana tetap menampilkan cache terakhir bila ada.");
  }

  return json({
    insights,
    disclaimer: "Insight ini bersifat informatif, bukan rekomendasi investasi.",
  });
});

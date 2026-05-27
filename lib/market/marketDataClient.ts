"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { MarketQuoteRecord, MarketSearchResult } from "@/lib/market/types";

export async function searchMarketData(query: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");

  const { data, error } = await supabase.functions.invoke("market-search", {
    body: { query },
  });
  if (error) throw error;
  const payload = data as { results?: MarketSearchResult[] };
  return payload.results ?? [];
}

export async function fetchMarketQuote(symbol: string, assetId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");

  const { data, error } = await supabase.functions.invoke("market-quote", {
    body: { symbol, asset_id: assetId },
  });
  if (error) throw error;
  const payload = data as { quote?: MarketQuoteRecord | null };
  return payload.quote ?? null;
}

export async function refreshMarketQuotes(symbols: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");

  const { data, error } = await supabase.functions.invoke("market-batch-refresh", {
    body: { symbols },
  });
  if (error) throw error;
  return data as {
    quotes?: MarketQuoteRecord[];
    updated_count?: number;
    failed_count?: number;
  };
}

export async function fetchMarketInsight(symbols: string[] = []) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");

  const { data, error } = await supabase.functions.invoke("market-insight", {
    body: { symbols },
  });
  if (error) throw error;
  const payload = data as { insights?: string[]; disclaimer?: string };
  return {
    insights: payload.insights ?? [],
    disclaimer:
      payload.disclaimer ??
      "Insight ini bersifat informatif, bukan rekomendasi investasi.",
  };
}

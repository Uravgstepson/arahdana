"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { FlowPanel, FocusedFlowShell } from "@/components/FocusedFlow";
import { InvestmentLogo } from "@/components/InvestmentLogo";
import { Button, ButtonLink } from "@/components/ui";
import {
  popularMarketAssetIds,
  getMarketAssetById,
  searchMarketAssets,
  type MarketAsset,
} from "@/lib/market/discovery";
import { searchMarketData } from "@/lib/market/marketDataClient";
import type { MarketSearchResult } from "@/lib/market/types";
import { trackAppEvent } from "@/lib/monitoring/events";
import { cn, formatRupiah } from "@/lib/utils/format";

export default function MarketSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [remoteResults, setRemoteResults] = useState<MarketSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchNote, setSearchNote] = useState("");
  const suggestions = useMemo(() => searchMarketAssets(query, 8), [query]);
  const popularAssets = useMemo(
    () =>
      popularMarketAssetIds
        .map((id) => getMarketAssetById(id))
        .filter((asset): asset is MarketAsset => Boolean(asset)),
    [],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) {
      trackAppEvent("market_search_used", {
        page: "/market/search",
        count: suggestions.length,
      });
    }
    const asset = suggestions[0];
    if (asset) setSelectedAsset(asset);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      void searchMarketData(trimmed)
        .then((results) => {
          if (cancelled) return;
          setRemoteResults(results);
          setSearchNote(
            results.length > 0
              ? "Hasil memakai cache/provider market. Data tertunda jika provider menandainya tertunda."
              : "",
          );
        })
        .catch(() => {
          if (!cancelled) {
            setRemoteResults([]);
            setSearchNote("Provider market belum tersedia. Menampilkan saran lokal tanpa harga realtime.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <FocusedFlowShell
      eyebrow="Market Search"
      title="Cari instrumen dengan bahasa biasa"
      description="Search dipindahkan ke ruang discovery khusus untuk hasil, insight, dan tindakan lanjutan seperti pantau atau bandingkan."
      backHref="/market"
    >
      <FlowPanel className="grid gap-4">
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim().length < 2) {
                setRemoteResults([]);
                setSearchNote("");
              }
            }}
            placeholder="Cari BBCA, Bank BCA, IHSG, emas, dolar..."
            className="min-h-12 min-w-0 flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-300 focus:bg-white"
          />
          <Button type="submit" variant="primary">
            Cari
          </Button>
        </form>

        {searchNote ? (
          <p className="rounded-[1rem] bg-amber-50 p-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
            {searchNote}
          </p>
        ) : null}

        <div className="grid gap-2">
          {remoteResults.length > 0 ? (
            remoteResults.map((result) => (
              <RemoteResultButton
                key={result.asset.id}
                result={result}
              />
            ))
          ) : null}
          {isSearching ? (
            <p className="rounded-[1rem] bg-stone-50 p-4 text-sm font-semibold text-stone-500 ring-1 ring-stone-200">
              Mencari data market...
            </p>
          ) : null}
          {remoteResults.length === 0 ? (query ? suggestions : popularAssets).map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelectedAsset(asset)}
              className="flex min-h-14 items-center justify-between gap-3 rounded-[1rem] bg-stone-50 px-4 text-left ring-1 ring-stone-200 transition hover:bg-stone-100"
            >
              <span className="flex min-w-0 items-center gap-3">
                <InvestmentLogo
                  name={asset.name}
                  ticker={asset.ticker}
                  className="h-10 w-10"
                  fallbackInitials={initials(asset.name)}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-stone-950">
                    {asset.name}
                  </span>
                  <span className="mt-1 block truncate text-xs font-medium text-stone-500">
                    {asset.categoryLabel} | {asset.region}
                  </span>
                </span>
              </span>
              <span className={cn("shrink-0 text-xs font-bold", directionText(asset))}>
                Harga belum tersedia
              </span>
            </button>
          )) : null}
        </div>
      </FlowPanel>

      {selectedAsset ? (
        <FlowPanel className="grid gap-4">
          <div className="flex items-start gap-3">
            <InvestmentLogo
              name={selectedAsset.name}
              ticker={selectedAsset.ticker}
              className="h-14 w-14 rounded-[1.1rem]"
              fallbackInitials={initials(selectedAsset.name)}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Result
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">
                {selectedAsset.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {selectedAsset.overview}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Harga" value="Harga belum tersedia" />
            <Metric label="Perubahan" value="Data tertunda" />
            <Metric label="Kategori" value={selectedAsset.categoryLabel} />
          </div>
          <p className="rounded-[1rem] bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 ring-1 ring-emerald-100">
            Quote cache akan ditampilkan setelah data provider tersedia.
            Insight ini bersifat informatif, bukan rekomendasi investasi.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonLink
              href={`/market/watchlist/add?asset=${encodeURIComponent(selectedAsset.id)}`}
              variant="primary"
            >
              Tambah ke Pantau
            </ButtonLink>
            <ButtonLink href="/market/compare" variant="secondary">
              Bandingkan
            </ButtonLink>
          </div>
        </FlowPanel>
      ) : null}
    </FocusedFlowShell>
  );
}

function RemoteResultButton({ result }: { result: MarketSearchResult }) {
  const quote = result.quote;
  return (
    <div className="grid gap-3 rounded-[1rem] bg-stone-50 px-4 py-3 ring-1 ring-stone-200 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-stone-950">
          {result.asset.display_name}
        </span>
        <span className="mt-1 block truncate text-xs font-medium text-stone-500">
          {result.asset.symbol} | {result.asset.type} |{" "}
          {result.asset.exchange ?? "Global"}
        </span>
      </span>
      <span className="shrink-0 text-right text-xs font-bold text-stone-600">
        {quote?.price ? formatQuote(quote.price, quote.currency) : "Harga belum tersedia"}
        <span className="mt-1 block font-semibold text-amber-700">
          {quote?.is_delayed ? "Data tertunda" : updatedLabel(quote?.updated_at)}
        </span>
      </span>
      <ButtonLink
        href={`/market/watchlist/add?asset=${encodeURIComponent(result.asset.symbol)}`}
        variant="secondary"
      >
        Tambah
      </ButtonLink>
    </div>
  );
}

function formatQuote(price: number, currency?: string | null) {
  if (currency === "IDR") return formatRupiah(price);
  return `${currency ?? ""} ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(price)}`.trim();
}

function updatedLabel(value?: string | null) {
  if (!value) return "Belum ada cache";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Baru diperbarui";
  if (minutes < 60) return `Diperbarui ${minutes} menit lalu`;
  return `Diperbarui ${Math.round(minutes / 60)} jam lalu`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-stone-50 p-4 ring-1 ring-stone-200">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-stone-950">{value}</p>
    </div>
  );
}

function directionText(asset: MarketAsset) {
  if (asset.direction === "up") return "text-emerald-700";
  if (asset.direction === "down") return "text-rose-700";
  return "text-stone-500";
}

function initials(value: string) {
  const words = value
    .replace(/\.JK$/iu, "")
    .split(/\s+/u)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

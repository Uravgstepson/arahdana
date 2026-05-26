"use client";

import { type FormEvent, useMemo, useState } from "react";
import { FlowPanel, FocusedFlowShell } from "@/components/FocusedFlow";
import { InvestmentLogo } from "@/components/InvestmentLogo";
import { Button, ButtonLink } from "@/components/ui";
import {
  popularMarketAssetIds,
  getMarketAssetById,
  searchMarketAssets,
  type MarketAsset,
} from "@/lib/market/discovery";
import { cn } from "@/lib/utils/format";

export default function MarketSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
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
    const asset = suggestions[0];
    if (asset) setSelectedAsset(asset);
  }

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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari BBCA, Bank BCA, IHSG, emas, dolar..."
            className="min-h-12 min-w-0 flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-300 focus:bg-white"
          />
          <Button type="submit" variant="primary">
            Cari
          </Button>
        </form>

        <div className="grid gap-2">
          {(query ? suggestions : popularAssets).map((asset) => (
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
                {asset.change}
              </span>
            </button>
          ))}
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
            <Metric label="Harga" value={selectedAsset.value} />
            <Metric label="Perubahan" value={selectedAsset.change} />
            <Metric label="Kategori" value={selectedAsset.categoryLabel} />
          </div>
          <p className="rounded-[1rem] bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 ring-1 ring-emerald-100">
            {selectedAsset.insight}
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

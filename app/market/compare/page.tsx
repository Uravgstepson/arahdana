"use client";

import { useMemo, useState } from "react";
import { FlowPanel, FocusedFlowShell } from "@/components/FocusedFlow";
import { ButtonLink } from "@/components/ui";
import {
  popularMarketAssetIds,
  getMarketAssetById,
  searchMarketAssets,
  type MarketAsset,
} from "@/lib/market/discovery";

export default function MarketComparePage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketAsset[]>(() =>
    popularMarketAssetIds
      .slice(0, 2)
      .map((id) => getMarketAssetById(id))
      .filter((asset): asset is MarketAsset => Boolean(asset)),
  );
  const suggestions = useMemo(() => searchMarketAssets(query, 6), [query]);

  function toggleAsset(asset: MarketAsset) {
    setSelected((current) => {
      if (current.some((item) => item.id === asset.id)) {
        return current.filter((item) => item.id !== asset.id);
      }
      return [...current, asset].slice(-4);
    });
  }

  return (
    <FocusedFlowShell
      eyebrow="Market Compare"
      title="Bandingkan instrumen"
      description="Compare dibuat sebagai workspace terpisah supaya market browsing tidak berubah menjadi dashboard padat."
      backHref="/market"
    >
      <FlowPanel className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Cari instrumen untuk dibandingkan
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="BBCA, IHSG, Bitcoin, Gold..."
            className="min-h-12 rounded-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold outline-none focus:border-emerald-300 focus:bg-white"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions.map((asset) => {
            const active = selected.some((item) => item.id === asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggleAsset(asset)}
                className={`rounded-[1rem] p-4 text-left ring-1 ${
                  active
                    ? "bg-emerald-50 text-emerald-950 ring-emerald-200"
                    : "bg-stone-50 text-stone-800 ring-stone-200"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {asset.name}
                </span>
                <span className="mt-1 block text-xs text-stone-500">
                  {asset.categoryLabel} | {asset.change}
                </span>
              </button>
            );
          })}
        </div>
      </FlowPanel>

      <FlowPanel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">
              Snapshot compare
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Maksimal 4 instrumen agar tetap mudah dipindai di mobile.
            </p>
          </div>
          <ButtonLink href="/market/search" variant="secondary">
            Search
          </ButtonLink>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {selected.map((asset) => (
            <div
              key={asset.id}
              className="rounded-[1.2rem] bg-stone-50 p-4 ring-1 ring-stone-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-stone-950">
                    {asset.name}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    {asset.categoryLabel}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-stone-950">
                  {asset.value}
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold text-emerald-700">
                {asset.change}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                {asset.insight}
              </p>
            </div>
          ))}
        </div>
      </FlowPanel>
    </FocusedFlowShell>
  );
}

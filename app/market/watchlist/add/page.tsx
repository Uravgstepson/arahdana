"use client";

import { useState } from "react";
import {
  FlowPanel,
  FlowStep,
  FocusedFlowShell,
  StickyFlowActions,
} from "@/components/FocusedFlow";
import { Button, ButtonLink } from "@/components/ui";
import {
  getMarketAssetById,
  searchMarketAssets,
  type MarketAsset,
} from "@/lib/market/discovery";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { InvestmentType, WatchlistItem } from "@/lib/types/investment";

export default function AddWatchlistPage() {
  const [asset, setAsset] = useState<MarketAsset | null>(() => {
    if (typeof window === "undefined") return null;
    const id = new URLSearchParams(window.location.search).get("asset");
    return id ? getMarketAssetById(id) : null;
  });
  const [query, setQuery] = useState(asset?.name ?? "");
  const [targetBuyZone, setTargetBuyZone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const suggestions = searchMarketAssets(query, 5);

  function saveWatchlist() {
    if (!asset && !query.trim()) return;
    const nextItem: WatchlistItem = {
      id: crypto.randomUUID(),
      name: asset?.name ?? query.trim(),
      type: assetToInvestmentType(asset),
      targetBuyZone: targetBuyZone.trim() || "Pantau manual",
      notes: notes.trim(),
      status: "watching",
      dataSource: "manual_input",
    };
    const current = localArahDanaStorage.readWatchlist() ?? [];
    localArahDanaStorage.writeWatchlist([nextItem, ...current]);
    setIsSaved(true);
  }

  if (isSaved) {
    return (
      <FocusedFlowShell
        eyebrow="Pantau"
        title="Watchlist Added"
        description={`${asset?.name ?? query} sekarang masuk daftar Pantau.`}
        backHref="/market"
      >
        <FlowPanel className="grid gap-3">
          <ButtonLink href="/market" variant="primary">
            Kembali ke Market
          </ButtonLink>
          <ButtonLink href="/watchlist" variant="secondary">
            Buka Pantau
          </ButtonLink>
        </FlowPanel>
      </FocusedFlowShell>
    );
  }

  return (
    <FocusedFlowShell
      eyebrow="Tambah Pantau"
      title="Tambahkan instrumen ke watchlist"
      description="Pencarian dan target pantau punya flow sendiri agar Market tetap menjadi layar discovery yang ringan."
      backHref="/market"
    >
      <FlowPanel className="grid gap-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FlowStep number={1} title="Pilih" active={!asset} />
          <FlowStep number={2} title="Target" active={Boolean(asset)} />
        </div>

        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Cari instrumen
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setAsset(null);
            }}
            placeholder="BBCA, IHSG, emas, dolar..."
            className="min-h-12 rounded-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold outline-none focus:border-emerald-300 focus:bg-white"
          />
        </label>

        {!asset ? (
          <div className="grid gap-2">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAsset(item);
                  setQuery(item.name);
                }}
                className="rounded-[1rem] bg-stone-50 p-4 text-left ring-1 ring-stone-200"
              >
                <span className="block text-sm font-semibold text-stone-950">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs text-stone-500">
                  {item.categoryLabel} | {item.region}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="rounded-[1rem] bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 ring-1 ring-emerald-100">
              {asset.name} dipilih. Tambahkan target agar mudah dievaluasi.
            </p>
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Target / zona beli
              <input
                value={targetBuyZone}
                onChange={(event) => setTargetBuyZone(event.target.value)}
                placeholder="Contoh: Rp 9.000 - Rp 9.300"
                className="min-h-12 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 text-sm font-medium outline-none focus:border-emerald-300 focus:bg-white"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Catatan
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Alasan pantau atau konteks market."
                className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-300 focus:bg-white"
              />
            </label>
          </div>
        )}
      </FlowPanel>

      <StickyFlowActions>
        <ButtonLink href="/market" variant="secondary">
          Batal
        </ButtonLink>
        <Button type="button" variant="primary" onClick={saveWatchlist}>
          Simpan pantauan
        </Button>
      </StickyFlowActions>
    </FocusedFlowShell>
  );
}

function assetToInvestmentType(asset: MarketAsset | null): InvestmentType {
  if (!asset) return "stock";
  if (asset.category === "crypto") return "stock";
  if (asset.category === "bond") return "bond";
  if (asset.category === "stock") return "stock";
  return "money_market_fund";
}

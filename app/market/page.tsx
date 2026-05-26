"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { InvestmentLogo } from "@/components/InvestmentLogo";
import type { WatchlistItem } from "@/lib/types/investment";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { cn } from "@/lib/utils/format";
import {
  getMarketAssetById,
  popularMarketAssetIds,
  searchMarketAssets,
  type MarketAsset,
} from "@/lib/market/discovery";

const RECENT_MARKET_SEARCHES_KEY = "arahdana.market.recentSearches";

const marketProductSegments = [
  {
    eyebrow: "Dana kolektif",
    title: "Reksa Dana",
    description: "Pasar uang, obligasi, campuran, dan saham untuk rencana bertahap.",
    href: "/market-prices?category=money_market_fund",
    tone: "emerald",
    icon: "sprout",
  },
  {
    eyebrow: "Kupon negara",
    title: "SBN Retail",
    description: "Instrumen negara ritel untuk alokasi defensif dan pendapatan tetap.",
    href: "/market-prices?category=sbn_retail",
    tone: "gold",
    icon: "flag",
  },
  {
    eyebrow: "Obligasi negara",
    title: "Obligasi FR",
    description: "Pantau seri FR dan arah yield untuk konteks portofolio obligasi.",
    href: "/market-prices?category=fr_bond",
    tone: "teal",
    icon: "bond",
  },
  {
    eyebrow: "IDX market",
    title: "Saham",
    description: "Saham Indonesia populer dengan pergerakan harga terbaru.",
    href: "/market-prices?category=idx_stock",
    tone: "dark",
    icon: "candle",
  },
];

export default function MarketPage() {
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);
  const [watchlist] = useState<WatchlistItem[]>(
    () => localArahDanaStorage.readWatchlist() ?? [],
  );

  const suggestions = useMemo(() => searchMarketAssets(query, 6), [query]);
  const popularAssets = useMemo(
    () =>
      popularMarketAssetIds
        .map((id) => getMarketAssetById(id))
        .filter((asset): asset is MarketAsset => Boolean(asset)),
    [],
  );

  function chooseAsset(asset: MarketAsset) {
    setSelectedAsset(asset);
    setQuery(asset.name);
    setIsSearchOpen(false);
    const nextRecent = saveRecentSearch(asset.name);
    setRecentSearches(nextRecent);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const match = suggestions[0];
    if (match) chooseAsset(match);
  }

  return (
    <div className="space-y-5">
      <section className="premium-gradient-surface overflow-visible rounded-[1.75rem] p-4 text-white shadow-[0_18px_44px_rgba(6,78,59,0.16)] sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(18rem,1fr)] sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100/78">
              Market
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Cari pasar
            </h1>
          </div>

          <form onSubmit={submitSearch} className="relative">
            <div className="flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-3 ring-1 ring-white/12 backdrop-blur-xl focus-within:ring-emerald-200/40">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-emerald-100">
                S
              </span>
              <input
                value={query}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() =>
                  window.setTimeout(() => setIsSearchOpen(false), 140)
                }
                onChange={(event) => {
                  setQuery(event.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Cari saham, indeks, emas, dolar, crypto..."
                className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-white/42 focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedAsset(null);
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-white/68"
                  aria-label="Bersihkan pencarian"
                >
                  x
                </button>
              ) : null}
            </div>

            {isSearchOpen ? (
              <div className="absolute inset-x-0 top-[calc(100%+0.55rem)] z-20 overflow-hidden rounded-[1.25rem] border border-white/10 bg-stone-950/94 p-2 shadow-[0_20px_56px_rgba(15,23,42,0.3)] backdrop-blur-2xl">
                {query ? (
                  <SearchSuggestionList
                    suggestions={suggestions}
                    onChoose={chooseAsset}
                  />
                ) : (
                  <div className="grid gap-3 p-1">
                    {recentSearches.length > 0 ? (
                      <DropdownShortcutRow
                        label="Recent"
                        items={recentSearches.map((item) => ({
                          key: item,
                          label: item,
                          asset: searchMarketAssets(item, 1)[0],
                        }))}
                        onChoose={chooseAsset}
                      />
                    ) : null}
                    <DropdownShortcutRow
                      label="Popular"
                      items={popularAssets.map((asset) => ({
                        key: asset.id,
                        label: asset.name,
                        asset,
                      }))}
                      onChoose={chooseAsset}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </form>
        </div>
      </section>

      {selectedAsset ? <SearchResult asset={selectedAsset} onChoose={chooseAsset} /> : null}

      <PantauSection watchlist={watchlist} />
      <MarketOverviewSection />
      <MarketInsightSection />
    </div>
  );
}

function SearchSuggestionList({
  suggestions,
  onChoose,
}: {
  suggestions: MarketAsset[];
  onChoose: (asset: MarketAsset) => void;
}) {
  return (
    <div className="grid gap-1">
      {suggestions.map((asset) => (
        <button
          key={asset.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChoose(asset)}
          className="flex min-h-12 items-center justify-between gap-3 rounded-[0.95rem] px-3 text-left text-white transition-colors hover:bg-white/8"
        >
          <span className="flex min-w-0 items-center gap-3">
            <InvestmentLogo
              name={asset.name}
              ticker={asset.ticker}
              className="h-10 w-10 ring-white/10"
              fallbackInitials={initials(asset.name)}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {asset.name}
              </span>
              <span className="mt-0.5 block truncate text-xs font-medium text-white/45">
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
  );
}

function DropdownShortcutRow({
  label,
  items,
  onChoose,
}: {
  label: string;
  items: Array<{ key: string; label: string; asset?: MarketAsset }>;
  onChoose: (asset: MarketAsset) => void;
}) {
  return (
    <div>
      <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/38">
        {label}
      </p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={!item.asset}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => item.asset && onChoose(item.asset)}
            className="shrink-0 rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/72 ring-1 ring-white/10 transition-colors hover:bg-white/12 disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchResult({
  asset,
  onChoose,
}: {
  asset: MarketAsset;
  onChoose: (asset: MarketAsset) => void;
}) {
  const related = asset.relatedIds
    .map((id) => getMarketAssetById(id))
    .filter((item): item is MarketAsset => Boolean(item));

  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <InvestmentLogo
            name={asset.name}
            ticker={asset.ticker}
            className="h-14 w-14 rounded-[1.1rem]"
            fallbackInitials={initials(asset.name)}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                {asset.name}
              </h2>
              {asset.ticker ? <MarketTag>{asset.ticker}</MarketTag> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">{asset.overview}</p>
            <p className="mt-4 rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900 ring-1 ring-emerald-100">
              {asset.insight}
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-[1.25rem] bg-stone-50 p-4 ring-1 ring-stone-200 sm:min-w-44">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Price
          </p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">{asset.value}</p>
          <p className={cn("mt-1 text-sm font-semibold", directionText(asset))}>
            {asset.change}
          </p>
          <Sparkline trend={asset.trend} direction={asset.direction} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
        {related.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChoose(item)}
            className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-white"
          >
            {item.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function PantauSection({ watchlist }: { watchlist: WatchlistItem[] }) {
  const fallback = [
    { name: "BBCA", ticker: "BBCA", price: "Rp 9.400", target: "Rp 10.200", status: "Dipantau" },
    { name: "IHSG", ticker: "IHSG", price: "6.950", target: "Arah pasar", status: "Aman" },
    { name: "Bitcoin", ticker: "BTC", price: "Rp 1.08 M", target: "Volatilitas", status: "Volatil" },
  ];
  const items =
    watchlist.length > 0
      ? watchlist.slice(0, 4).map((item) => {
          const asset = searchMarketAssets(item.name, 1)[0];
          return {
            name: item.name,
            ticker: asset?.ticker,
            price: asset?.value ?? "Manual",
            target: item.targetBuyZone || "Target belum diisi",
            status: watchlistStatusLabel(item.status),
          };
        })
      : fallback;

  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        eyebrow="Pantau"
        title="Watchlist ringkas"
        action={<Link href="/market/watchlist/add" className="text-sm font-semibold text-emerald-700">Tambah</Link>}
      />
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={`${item.name}-${item.target}`}
            className="flex min-h-16 items-center justify-between gap-3 rounded-[1.15rem] bg-stone-50/80 px-4 py-3 ring-1 ring-stone-200/80"
          >
            <div className="flex min-w-0 items-center gap-3">
              <InvestmentLogo
                name={item.name}
                ticker={item.ticker}
                className="h-10 w-10"
                fallbackInitials={initials(item.name)}
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-950">{item.name}</p>
                <p className="mt-1 truncate text-xs font-medium text-stone-500">
                  Target: {item.target}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold text-stone-950">{item.price}</p>
              <span className={cn("mt-1 inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold", statusClass(item.status))}>
                {item.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MarketOverviewSection() {
  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        eyebrow="Produk"
        title="Produk Investasi"
        action={
          <Link href="/market-prices" className="text-sm font-semibold text-emerald-700">
            Lihat semua
          </Link>
        }
      />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {marketProductSegments.map((segment) => (
          <Link
            key={segment.title}
            href={segment.href}
            className={cn(
              "group relative min-h-[8.4rem] overflow-hidden rounded-[1.2rem] p-4 text-left ring-1 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]",
              productSegmentClass(segment.tone),
            )}
          >
            <span
              className={cn(
                "absolute inset-x-0 top-0 h-1",
                productAccentClass(segment.tone),
              )}
              aria-hidden="true"
            />
            <span className="relative z-10 flex min-h-full flex-col justify-between gap-4">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[0.66rem] font-bold uppercase tracking-[0.12em] text-emerald-700/80">
                    {segment.eyebrow}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-stone-950">
                    {segment.title}
                  </span>
                </span>
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] ring-1", productIconClass(segment.tone))}>
                  <ProductSegmentIcon icon={segment.icon} />
                </span>
              </span>
              <span>
                <span className="line-clamp-2 block text-xs font-medium leading-5 text-stone-500">
                  {segment.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-stone-950">
                  Buka data
                  <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    &gt;
                  </span>
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MarketInsightSection() {
  const insights = [
    "IHSG melemah 1.2% hari ini, tetapi tekanan masih terkendali.",
    "Emas menguat akibat permintaan defensif dan pelemahan selera risiko.",
    "Sektor perbankan masih dominan minggu ini.",
    "Pasar obligasi relatif stabil dengan pergerakan yield terbatas.",
  ];

  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        eyebrow="Market Insight"
        title="Ringkasan cepat"
        action={<Link href="/market-insight" className="text-sm font-semibold text-emerald-700">Buka insight</Link>}
      />
      <div className="mt-4 grid gap-3">
        {insights.map((insight) => (
          <p
            key={insight}
            className="rounded-[1.1rem] bg-stone-50/80 p-4 text-sm font-medium leading-6 text-stone-700 ring-1 ring-stone-200/80"
          >
            {insight}
          </p>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MarketTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.68rem] font-bold text-stone-600 ring-1 ring-stone-200">
      {children}
    </span>
  );
}

function Sparkline({
  trend,
  direction,
  compact = false,
}: {
  trend: number[];
  direction: MarketAsset["direction"];
  compact?: boolean;
}) {
  const points = sparklinePoints(trend, compact ? 92 : 132, compact ? 38 : 48);
  const stroke =
    direction === "up" ? "#059669" : direction === "down" ? "#be123c" : "#64748b";

  return (
    <svg
      className={cn("shrink-0", compact ? "h-10 w-24" : "mt-3 h-12 w-full")}
      viewBox={`0 0 ${compact ? 92 : 132} ${compact ? 38 : 48}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function sparklinePoints(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - 6 - ((value - min) / range) * (height - 12);
      return `${Math.round(x)},${Math.round(y)}`;
    })
    .join(" ");
}

function productSegmentClass(tone: string) {
  if (tone === "dark") {
    return "bg-[linear-gradient(145deg,#ffffff,#f6faf8)] ring-emerald-100 hover:bg-emerald-50/60";
  }
  return "bg-[linear-gradient(145deg,#ffffff,#f8fafc)] ring-stone-200 hover:ring-emerald-200 hover:bg-emerald-50/45";
}

function productAccentClass(tone: string) {
  if (tone === "emerald") return "bg-emerald-500";
  if (tone === "gold") return "bg-amber-400";
  if (tone === "teal") return "bg-teal-500";
  return "bg-stone-950";
}

function productIconClass(tone: string) {
  if (tone === "emerald") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (tone === "gold") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (tone === "teal") return "bg-teal-50 text-teal-700 ring-teal-100";
  return "bg-stone-950 text-emerald-200 ring-stone-800";
}

function ProductSegmentIcon({ icon }: { icon: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      {icon === "sprout" ? (
        <>
          <path {...common} d="M12 20v-8" />
          <path {...common} d="M12 12c-4.5 0-7-2.5-7-7 4.5 0 7 2.5 7 7Z" />
          <path {...common} d="M12 12c4.5 0 7-2.5 7-7-4.5 0-7 2.5-7 7Z" />
        </>
      ) : null}
      {icon === "flag" ? (
        <>
          <path {...common} d="M6 20V5" />
          <path {...common} d="M6 6c4-2 8 2 12 0v9c-4 2-8-2-12 0" />
        </>
      ) : null}
      {icon === "bond" ? (
        <>
          <path {...common} d="M12 4 5 8v8l7 4 7-4V8l-7-4Z" />
          <path {...common} d="M8 10v5" />
          <path {...common} d="M12 8v9" />
          <path {...common} d="M16 10v5" />
        </>
      ) : null}
      {icon === "candle" ? (
        <>
          <path {...common} d="M7 5v14" />
          <path {...common} d="M17 5v14" />
          <path {...common} d="M5 9h4v6H5z" />
          <path {...common} d="M15 7h4v8h-4z" />
        </>
      ) : null}
    </svg>
  );
}

function readRecentSearches() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(RECENT_MARKET_SEARCHES_KEY);
    const parsed = value ? (JSON.parse(value) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(value: string) {
  const next = [value, ...readRecentSearches().filter((item) => item !== value)].slice(0, 5);
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(RECENT_MARKET_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

function directionText(asset: MarketAsset) {
  if (asset.direction === "up") return "text-emerald-700";
  if (asset.direction === "down") return "text-rose-700";
  return "text-stone-500";
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("volatil") || normalized.includes("hindari")) {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  }
  if (normalized.includes("dipantau") || normalized.includes("menunggu")) {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  }
  return "bg-stone-100 text-stone-700 ring-1 ring-stone-200";
}

function watchlistStatusLabel(status: WatchlistItem["status"]) {
  if (status === "watching") return "Dipantau";
  if (status === "waiting") return "Menunggu";
  if (status === "avoid") return "Hindari";
  return "Sudah dibeli";
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

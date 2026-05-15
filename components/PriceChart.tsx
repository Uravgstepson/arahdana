"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/types/investment";
import { formatRupiah } from "@/lib/utils/format";
import { useIsClient } from "@/components/useIsClient";

type ChartPoint = {
  date: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
};

export function PriceChart({
  prices,
  isMockData,
  sourceLabel,
}: {
  prices: PricePoint[];
  isMockData: boolean;
  sourceLabel: string;
}) {
  const isMounted = useIsClient();
  const chartData = useMemo(() => buildPriceChartData(prices), [prices]);
  const hasLimitedHistory = chartData.length > 0 && chartData.length < 20;
  const showSma20 = chartData.length >= 20;
  const showSma50 = chartData.length >= 50;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Grafik harga</h2>
          <p className="mt-1 text-sm text-stone-500">
            Close price dengan moving average untuk membaca kekuatan tren.
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            isMockData
              ? "bg-amber-50 text-amber-800 ring-amber-200"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {isMockData ? "Mock" : "Live/manual"} - {sourceLabel}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          Belum ada data harga valid untuk digambar.
        </div>
      ) : (
        <div className="mt-5 h-72 w-full">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#e7edf3" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  minTickGap={28}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={formatShortDate}
                />
                <YAxis
                  width={78}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(value) => compactRupiah(Number(value))}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<PriceTooltip />} />
                <Line
                  type="monotone"
                  dataKey="close"
                  name="Close"
                  stroke="#087f5b"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                {showSma20 ? (
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    name="SMA 20"
                    stroke="#2563eb"
                    strokeWidth={1.8}
                    dot={false}
                    connectNulls={false}
                  />
                ) : null}
                {showSma50 ? (
                  <Line
                    type="monotone"
                    dataKey="sma50"
                    name="SMA 50"
                    stroke="#a855f7"
                    strokeWidth={1.8}
                    dot={false}
                    connectNulls={false}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      )}

      {hasLimitedHistory ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-900 ring-1 ring-amber-100">
          Data historis terbatas, hasil analisis kurang kuat.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-stone-500">
        <LegendItem color="#087f5b" label="Close" />
        {showSma20 ? <LegendItem color="#2563eb" label="SMA 20" /> : null}
        {showSma50 ? <LegendItem color="#a855f7" label="SMA 50" /> : null}
      </div>
    </section>
  );
}

function buildPriceChartData(prices: PricePoint[]): ChartPoint[] {
  const cleanPrices = prices.filter((price) => Number.isFinite(price.close) && price.close > 0);

  return cleanPrices.map((price, index) => ({
    date: price.date,
    close: price.close,
    sma20: index >= 19 ? rollingAverage(cleanPrices, index, 20) : null,
    sma50: index >= 49 ? rollingAverage(cleanPrices, index, 50) : null,
  }));
}

function rollingAverage(prices: PricePoint[], endIndex: number, period: number) {
  const window = prices.slice(endIndex - period + 1, endIndex + 1);
  return window.reduce((sum, price) => sum + price.close, 0) / window.length;
}

function PriceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white/95 p-3 text-sm shadow-sm">
      <p className="font-semibold text-stone-950">{label}</p>
      <div className="mt-2 grid gap-1">
        {payload
          .filter((item) => item.value !== null && Number.isFinite(Number(item.value)))
          .map((item) => (
            <p key={item.name} className="flex items-center justify-between gap-4 text-stone-600">
              <span>{item.name}</span>
              <span className="font-semibold text-stone-950">{formatRupiah(Number(item.value))}</span>
            </p>
          ))}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ChartSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-lg bg-stone-100" />;
}

function compactRupiah(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 1_000_000)} jt`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return value.toLocaleString("id-ID");
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(date);
}

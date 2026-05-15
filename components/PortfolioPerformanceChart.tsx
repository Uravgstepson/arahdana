"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PortfolioItem } from "@/lib/types/investment";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";
import { formatRupiah } from "@/lib/utils/format";
import { MeasuredChartFrame } from "@/components/MeasuredChartFrame";

type PerformancePoint = {
  name: string;
  invested: number;
  current: number;
  profit: number;
};

export function PortfolioPerformanceChart({
  items,
  aprMoneyMarketFund,
}: {
  items: PortfolioItem[];
  aprMoneyMarketFund: number;
}) {
  const chartData = useMemo(
    () => buildPerformanceData(items, aprMoneyMarketFund),
    [aprMoneyMarketFund, items],
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-stone-950">Performa portofolio</h2>
        <p className="mt-1 text-sm text-stone-500">Perbandingan modal, nilai kini, dan P/L per kepemilikan terbesar.</p>
      </div>

      {chartData.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          Tambahkan kepemilikan untuk melihat performa portofolio.
        </div>
      ) : (
        <MeasuredChartFrame className="mt-5 h-72 w-full">
          {({ width, height }) => (
              <ComposedChart width={width} height={height} data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#e7edf3" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} minTickGap={20} />
                <YAxis width={78} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={compactRupiah} />
                <Tooltip content={<PerformanceTooltip />} />
                <Bar dataKey="invested" name="Modal" fill="#94a3b8" radius={[7, 7, 0, 0]} />
                <Bar dataKey="current" name="Nilai kini" fill="#087f5b" radius={[7, 7, 0, 0]} />
                <Line type="monotone" dataKey="profit" name="P/L" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
          )}
        </MeasuredChartFrame>
      )}
    </section>
  );
}

function buildPerformanceData(items: PortfolioItem[], aprMoneyMarketFund: number): PerformancePoint[] {
  return items
    .map((item) => {
      const invested = item.buyPrice * item.quantity;
      const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
      const current = currentPriceUsed * item.quantity;
      return {
        name: item.ticker || item.name,
        invested,
        current,
        profit: current - invested,
      };
    })
    .filter((item) => item.invested > 0 || item.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 8);
}

function PerformanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white/95 p-3 text-sm shadow-sm">
      <p className="font-semibold text-stone-950">{label}</p>
      <div className="mt-2 grid gap-1">
        {payload.map((item) => (
          <p key={item.name} className="flex items-center justify-between gap-4 text-stone-600">
            <span>{item.name}</span>
            <span className="font-semibold text-stone-950">{formatRupiah(item.value)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function compactRupiah(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)} M`;
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 1_000_000)} jt`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return value.toLocaleString("id-ID");
}

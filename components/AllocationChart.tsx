"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/utils/format";
import { usePerformanceMode } from "@/lib/utils/performanceMode";
import { MeasuredChartFrame } from "@/components/MeasuredChartFrame";
import { PrivateValue } from "@/components/PrivateValue";

export type AllocationDatum = {
  key: string;
  label: string;
  value: number;
  percent?: number;
};

const COLORS = ["#087f5b", "#2563eb", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6", "#64748b"];

export function AllocationChart({
  title = "Alokasi",
  description,
  data,
  emptyMessage = "Belum ada data alokasi.",
  compact = false,
}: {
  title?: string;
  description?: string;
  data: AllocationDatum[];
  emptyMessage?: string;
  compact?: boolean;
}) {
  const performanceProfile = usePerformanceMode();
  const chartData = useMemo(() => normalizeData(data), [data]);

  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
      </div>

      {chartData.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          {emptyMessage}
        </div>
      ) : (
        <div className={compact ? "mt-5 grid gap-4 sm:grid-cols-[13rem_1fr]" : "mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(260px,1fr)]"}>
          <MeasuredChartFrame className={compact ? "h-48 min-w-0" : "h-64 min-w-0"}>
            {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Pie data={chartData} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="86%" paddingAngle={3} isAnimationActive={false}>
                    {chartData.map((item, index) => (
                      <Cell key={item.key} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  {performanceProfile.simplifyTooltips ? null : (
                    <Tooltip content={<AllocationTooltip />} />
                  )}
                </PieChart>
            )}
          </MeasuredChartFrame>
          <div className="grid content-center gap-2">
            {chartData.map((item, index) => (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-stone-100 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate text-sm font-semibold text-stone-950">{item.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-950">{item.percent}%</p>
                  <p className="text-xs text-stone-500"><PrivateValue>{formatRupiah(item.value)}</PrivateValue></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function normalizeData(data: AllocationDatum[]) {
  const clean = data.filter((item) => Number.isFinite(item.value) && item.value > 0);
  const total = clean.reduce((sum, item) => sum + item.value, 0);

  return clean.map((item) => ({
    ...item,
    percent: item.percent ?? (total > 0 ? Math.round((item.value / total) * 100) : 0),
  }));
}

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AllocationDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-stone-200 bg-white/95 p-3 text-sm shadow-sm">
      <p className="font-semibold text-stone-950">{item.label}</p>
      <p className="mt-1 text-stone-600"><PrivateValue>{formatRupiah(item.value)}</PrivateValue></p>
      <p className="text-xs font-semibold text-emerald-700">{item.percent}% portofolio</p>
    </div>
  );
}

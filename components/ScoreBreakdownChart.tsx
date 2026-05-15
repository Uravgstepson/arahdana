"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalysisResult } from "@/lib/types/investment";
import { MeasuredChartFrame } from "@/components/MeasuredChartFrame";

type ScorePoint = {
  label: string;
  score: number;
};

export function ScoreBreakdownChart({ result }: { result: AnalysisResult }) {
  const chartData = useMemo(() => buildScoreBreakdown(result), [result]);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-stone-950">Breakdown skor</h2>
        <p className="mt-1 text-sm text-stone-500">Komponen utama yang membentuk sinyal BUY / WAIT / AVOID.</p>
      </div>
      <MeasuredChartFrame className="mt-5 h-72 w-full">
        {({ width, height }) => (
            <BarChart width={width} height={height} data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 18, bottom: 4 }}>
              <CartesianGrid stroke="#e7edf3" strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={132} tick={{ fill: "#334155", fontSize: 12 }} />
              <Tooltip content={<ScoreTooltip />} />
              <Bar dataKey="score" name="Skor" fill="#087f5b" radius={[0, 7, 7, 0]} />
            </BarChart>
        )}
      </MeasuredChartFrame>
    </section>
  );
}

function buildScoreBreakdown(result: AnalysisResult): ScorePoint[] {
  return [
    { label: "Trend", score: result.trend.score },
    { label: "Volatilitas", score: clamp(100 - result.volatility * 1.35, 0, 100) },
    { label: "Drawdown", score: clamp(100 - result.maxDrawdown * 2, 0, 100) },
    { label: "Momentum", score: scoreMomentum(result.momentum) },
    { label: "Keyakinan alokasi", score: result.confidence },
  ].map((item) => ({ ...item, score: Math.round(item.score) }));
}

function ScoreTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white/95 p-3 text-sm shadow-sm">
      <p className="font-semibold text-stone-950">{label}</p>
      <p className="mt-1 text-stone-600">{payload[0].value}/100</p>
    </div>
  );
}

function scoreMomentum(momentum: number) {
  if (momentum >= 2 && momentum <= 10) return 86;
  if (momentum > 10 && momentum <= 15) return 66;
  if (momentum > 15) return 35;
  if (momentum >= -2) return 62;
  if (momentum >= -8) return 42;
  return 24;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

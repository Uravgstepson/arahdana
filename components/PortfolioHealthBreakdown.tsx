"use client";

import { useMemo, useState } from "react";
import type { PortfolioItem } from "@/lib/types/investment";
import { calculatePortfolioHealthScore } from "@/lib/portfolio/healthScore";
import { cn } from "@/lib/utils/format";

type PortfolioValuationSettings = {
  aprMoneyMarketFund?: number;
  now?: Date;
  riskTolerance?: number;
};

type PortfolioHealthBreakdownProps = {
  portfolio: PortfolioItem[];
  riskTolerance?: number;
  aprMoneyMarketFund?: number;
};

export function PortfolioHealthBreakdown({
  portfolio,
  riskTolerance = 15,
  aprMoneyMarketFund = 0.05,
}: PortfolioHealthBreakdownProps) {
  const [showDetails, setShowDetails] = useState(false);
  const healthScore = useMemo(() => {
    const settings: PortfolioValuationSettings = { aprMoneyMarketFund, riskTolerance };
    return calculatePortfolioHealthScore(portfolio, settings);
  }, [portfolio, riskTolerance, aprMoneyMarketFund]);
  const tone = toneForScore(healthScore.totalScore);
  const factors = [
    {
      label: "Diversifikasi",
      score: healthScore.diversificationScore,
      helper: "Jumlah holding dan sebaran tipe aset.",
    },
    {
      label: "Eksposur risiko",
      score: healthScore.riskScore,
      helper: "Kesesuaian risiko dengan toleransi kamu.",
    },
    {
      label: "Konsentrasi",
      score: healthScore.concentrationScore,
      helper: "Mendeteksi posisi yang terlalu dominan.",
    },
  ];

  if (portfolio.length === 0) {
    return (
      <section className="ui-card rounded-[1.5rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
          Portfolio health
        </p>
        <h3 className="mt-2 text-lg font-semibold text-stone-950">Belum ada data</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
          Add holdings first. ArahDana will summarize diversification, risk exposure,
          and concentration after there is portfolio data to review.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="ui-card overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm">
        <div className="premium-gradient-surface grid gap-6 p-5 text-white sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <ScoreGauge score={healthScore.totalScore} tone={tone} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100/80">
              Detailed portfolio health
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h3 className="text-3xl font-semibold tracking-tight text-white">
                {healthScore.grade}
              </h3>
              <span className={cn("mb-1 rounded-full px-3 py-1 text-xs font-semibold ring-1", tone.darkPill)}>
                {tone.label}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
              {healthScore.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <HealthChip label="Allocation" value={healthScore.allocationScore} />
              <HealthChip label="Performance" value={healthScore.performanceScore} />
              <HealthChip label="Tolerance" value={`${riskTolerance}%`} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {factors.map((factor) => (
          <FactorPanel
            key={factor.label}
            label={factor.label}
            score={factor.score}
            helper={factor.helper}
            tone={tone}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ui-card rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <SectionTitle eyebrow="Action plan" title="Recommended Actions" />
          <div className="mt-4 space-y-3">
            {healthScore.recommendedActions.slice(0, 2).map((action, index) => (
              <div key={action} className="flex gap-3 rounded-[1rem] bg-stone-50/80 p-3 ring-1 ring-stone-200/70">
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold", tone.pill)}>
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-stone-700">{action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-card rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <SectionTitle eyebrow="Risk notes" title="Signals to Watch" />
          <div className="mt-4 space-y-3">
            {(healthScore.weaknesses.length > 0 ? healthScore.weaknesses : healthScore.warnings)
              .slice(0, 3)
              .map((warning) => (
                <p key={warning} className="rounded-[1rem] bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
                  {warning}
                </p>
              ))}
            {healthScore.weaknesses.length === 0 && healthScore.warnings.length === 0 ? (
              <p className="rounded-[1rem] bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-100">
                No major portfolio health warnings right now.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="ui-card rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-lg font-semibold text-stone-950">Breakdown Details</span>
            <span className="mt-1 block text-sm text-stone-500">
              Allocation and performance are included in the total score.
            </span>
          </span>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-stone-100 px-3 text-xs font-semibold text-stone-600 ring-1 ring-stone-200/80">
            {showDetails ? "Hide" : "Expand"}
            <span aria-hidden="true" className={cn("text-sm leading-none transition-transform", showDetails ? "rotate-180" : "")}>
              v
            </span>
          </span>
        </button>

        {showDetails ? (
          <div className="mt-5 space-y-4 border-t border-stone-100 pt-5">
            <ScoreBar label="Allocation balance" score={healthScore.allocationScore} tone={tone} />
            <ScoreBar label="Performance" score={healthScore.performanceScore} tone={tone} />
            <ScoreBar label="Diversification" score={healthScore.diversificationScore} tone={tone} />
            <ScoreBar label="Risk exposure" score={healthScore.riskScore} tone={tone} />
            <ScoreBar label="Concentration" score={healthScore.concentrationScore} tone={tone} />
            <div className="grid gap-3 pt-2 sm:grid-cols-5">
              {[
                ["85-100", "Excellent"],
                ["70-84", "Healthy"],
                ["55-69", "Attention"],
                ["40-54", "Risky"],
                ["0-39", "Critical"],
              ].map(([range, label]) => (
                <div key={range} className="rounded-[1rem] bg-stone-50/80 p-3 text-center ring-1 ring-stone-200/70">
                  <p className="text-xs font-bold text-stone-950">{range}</p>
                  <p className="mt-1 text-xs text-stone-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function HealthChip({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/80 ring-1 ring-white/12">
      <span className="text-white/45">{label}</span>
      <span className="text-white">{value}</span>
    </span>
  );
}

function ScoreGauge({
  score,
  tone,
}: {
  score: number;
  tone: ReturnType<typeof toneForScore>;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={tone.gauge}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-semibold tracking-tight text-white">{score}</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/48">
            /100
          </p>
        </div>
      </div>
    </div>
  );
}

function FactorPanel({
  label,
  score,
  helper,
  tone,
}: {
  label: string;
  score: number;
  helper: string;
  tone: ReturnType<typeof toneForScore>;
}) {
  return (
    <div className="ui-card rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-950">{label}</h3>
          <p className="mt-1 text-sm leading-5 text-stone-500">{helper}</p>
        </div>
        <span className="text-xl font-semibold text-stone-950">{score}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full", barColor(score, tone))} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-stone-950">{title}</h3>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  tone,
}: {
  label: string;
  score: number;
  tone: ReturnType<typeof toneForScore>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="font-semibold text-stone-950">{score}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full", barColor(score, tone))} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function toneForScore(score: number) {
  if (score >= 70) {
    return {
      label: "Stable",
      gauge: "text-emerald-300",
      bar: "bg-emerald-500",
      pill: "bg-emerald-100 text-emerald-800",
      darkPill: "bg-emerald-300/16 text-emerald-100 ring-emerald-200/20",
    };
  }
  if (score >= 55) {
    return {
      label: "Review",
      gauge: "text-amber-300",
      bar: "bg-amber-400",
      pill: "bg-amber-100 text-amber-800",
      darkPill: "bg-amber-300/16 text-amber-100 ring-amber-200/20",
    };
  }
  return {
    label: "High attention",
    gauge: "text-rose-300",
    bar: "bg-rose-500",
    pill: "bg-rose-100 text-rose-800",
    darkPill: "bg-rose-300/16 text-rose-100 ring-rose-200/20",
  };
}

function barColor(score: number, fallback: ReturnType<typeof toneForScore>) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-400";
  if (score < 40) return "bg-rose-500";
  return fallback.bar;
}

"use client";

import { useMemo, useState } from "react";
import type { PortfolioItem } from "@/lib/types/investment";
import { calculatePortfolioHealthScore } from "@/lib/portfolio/healthScore";

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

  if (portfolio.length === 0) {
    return (
      <section className="rounded-[1.6rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Portfolio Health</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
          Add holdings first. ArahDana will summarize diversification, risk exposure,
          and concentration after there is portfolio data to review.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[1.8rem] border border-stone-200 bg-white shadow-sm">
        <div className={`h-1.5 ${tone.accent}`} />
        <div className="grid gap-6 p-5 lg:grid-cols-[auto_1fr] lg:items-center lg:p-6">
          <ScoreGauge score={healthScore.totalScore} tone={tone} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Detailed portfolio health
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h3 className="text-3xl font-semibold tracking-tight text-stone-950">
                {healthScore.grade}
              </h3>
              <span className={`mb-1 rounded-full px-3 py-1 text-xs font-semibold ${tone.pill}`}>
                {tone.label}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              {healthScore.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FactorPanel
          label="Diversification"
          score={healthScore.diversificationScore}
          helper="Checks holding count and asset-type spread."
        />
        <FactorPanel
          label="Risk exposure"
          score={healthScore.riskScore}
          helper="Compares risk categories with your tolerance."
        />
        <FactorPanel
          label="Concentration"
          score={healthScore.concentrationScore}
          helper="Looks for outsized single positions."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-950">Recommended Actions</h3>
          <div className="mt-4 space-y-3">
            {healthScore.recommendedActions.slice(0, 2).map((action, index) => (
              <div key={action} className="flex gap-3 rounded-[1rem] bg-stone-50 p-3">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${tone.pill}`}>
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-stone-700">{action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-950">Signals to Watch</h3>
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

      <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-lg font-semibold text-stone-950">Breakdown Details</span>
            <span className="mt-1 block text-sm text-stone-500">
              Allocation and performance are included in the total score.
            </span>
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            {showDetails ? "Hide" : "Expand"}
          </span>
        </button>

        {showDetails ? (
          <div className="mt-5 space-y-4 border-t border-stone-100 pt-5">
            <ScoreBar label="Allocation balance" score={healthScore.allocationScore} />
            <ScoreBar label="Performance" score={healthScore.performanceScore} />
            <ScoreBar label="Diversification" score={healthScore.diversificationScore} />
            <ScoreBar label="Risk exposure" score={healthScore.riskScore} />
            <ScoreBar label="Concentration" score={healthScore.concentrationScore} />
            <div className="grid gap-3 pt-2 sm:grid-cols-5">
              {[
                ["85-100", "Excellent"],
                ["70-84", "Healthy"],
                ["55-69", "Attention"],
                ["40-54", "Risky"],
                ["0-39", "Critical"],
              ].map(([range, label]) => (
                <div key={range} className="rounded-[1rem] bg-stone-50 p-3 text-center ring-1 ring-stone-100">
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

function ScoreGauge({
  score,
  tone,
}: {
  score: number;
  tone: ReturnType<typeof toneForScore>;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e7e5e4" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          strokeLinecap="round"
          className={tone.text}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-semibold tracking-tight text-stone-950">{score}</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-stone-400">
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
}: {
  label: string;
  score: number;
  helper: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-950">{label}</h3>
          <p className="mt-1 text-sm leading-5 text-stone-500">{helper}</p>
        </div>
        <span className="text-xl font-semibold text-stone-950">{score}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="font-semibold text-stone-950">{score}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function toneForScore(score: number) {
  if (score >= 70) {
    return {
      label: "Stable",
      accent: "bg-emerald-500",
      text: "text-emerald-500",
      pill: "bg-emerald-100 text-emerald-800",
    };
  }
  if (score >= 55) {
    return {
      label: "Review",
      accent: "bg-amber-400",
      text: "text-amber-500",
      pill: "bg-amber-100 text-amber-800",
    };
  }
  return {
    label: "High attention",
    accent: "bg-rose-500",
    text: "text-rose-500",
    pill: "bg-rose-100 text-rose-800",
  };
}

function barColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-400";
  return "bg-rose-500";
}

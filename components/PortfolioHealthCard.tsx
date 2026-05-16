"use client";

import { useMemo, useState } from "react";
import type { PortfolioItem } from "@/lib/types/investment";
import { calculatePortfolioHealthScore } from "@/lib/portfolio/healthScore";

type PortfolioValuationSettings = {
  aprMoneyMarketFund?: number;
  now?: Date;
  riskTolerance?: number;
};

type PortfolioHealthCardProps = {
  portfolio: PortfolioItem[];
  riskTolerance?: number;
  aprMoneyMarketFund?: number;
};

export function PortfolioHealthCard({
  portfolio,
  riskTolerance = 15,
  aprMoneyMarketFund = 0.05,
}: PortfolioHealthCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const healthScore = useMemo(() => {
    const settings: PortfolioValuationSettings = { aprMoneyMarketFund, riskTolerance };
    return calculatePortfolioHealthScore(portfolio, settings);
  }, [portfolio, riskTolerance, aprMoneyMarketFund]);
  const tone = toneForScore(healthScore.totalScore);
  const actions = healthScore.recommendedActions.slice(0, 2);

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white shadow-sm">
      <div className={`h-1.5 ${tone.accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Portfolio health
            </p>
            <h3 className="mt-2 text-xl font-semibold text-stone-950">
              {healthScore.grade}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
              {healthScore.summary}
            </p>
          </div>
          <ScoreGauge score={healthScore.totalScore} tone={tone} size="compact" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniFactor label="Diversification" score={healthScore.diversificationScore} />
          <MiniFactor label="Risk exposure" score={healthScore.riskScore} />
          <MiniFactor label="Concentration" score={healthScore.concentrationScore} />
        </div>

        {actions.length > 0 ? (
          <div className="mt-5 rounded-[1.1rem] bg-stone-50 p-4 ring-1 ring-stone-100">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Next steps
            </p>
            <ol className="mt-3 space-y-2">
              {actions.map((action, index) => (
                <li key={action} className="flex gap-3 text-sm leading-6 text-stone-700">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold ${tone.pill}`}>
                    {index + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          {isExpanded ? "Hide breakdown" : "Show breakdown"}
        </button>

        {isExpanded ? (
          <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            <FactorRow label="Allocation balance" score={healthScore.allocationScore} />
            <FactorRow label="Performance" score={healthScore.performanceScore} />
            {healthScore.warnings.slice(0, 2).map((warning) => (
              <p key={warning} className="rounded-[1rem] bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ScoreGauge({
  score,
  tone,
  size = "large",
}: {
  score: number;
  tone: ReturnType<typeof toneForScore>;
  size?: "compact" | "large";
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const dimension = size === "compact" ? "h-24 w-24" : "h-32 w-32";

  return (
    <div className={`relative shrink-0 ${dimension}`}>
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
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={tone.text}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-stone-950">{score}</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-stone-400">
            /100
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniFactor({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-[1rem] bg-stone-50 p-3 ring-1 ring-stone-100">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-stone-500">{label}</span>
        <span className="text-sm font-semibold text-stone-950">{score}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function FactorRow({ label, score }: { label: string; score: number }) {
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
      accent: "bg-emerald-500",
      text: "text-emerald-500",
      pill: "bg-emerald-100 text-emerald-800",
    };
  }
  if (score >= 55) {
    return {
      accent: "bg-amber-400",
      text: "text-amber-500",
      pill: "bg-amber-100 text-amber-800",
    };
  }
  return {
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

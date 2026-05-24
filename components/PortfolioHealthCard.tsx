"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { PortfolioItem } from "@/lib/types/investment";
import { calculatePortfolioHealthScore } from "@/lib/portfolio/healthScore";
import { cn } from "@/lib/utils/format";

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
  const healthScore = useMemo(() => {
    const settings: PortfolioValuationSettings = {
      aprMoneyMarketFund,
      riskTolerance,
    };
    return calculatePortfolioHealthScore(portfolio, settings);
  }, [portfolio, riskTolerance, aprMoneyMarketFund]);
  const tone = toneForScore(healthScore.totalScore);

  return (
    <section className="premium-gradient-surface overflow-hidden rounded-[1.55rem] p-5 text-white shadow-sm ring-1 ring-white/10 sm:p-6">
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100/80">
              Portfolio health
            </p>
            <Link
              href="/review"
              className="inline-flex min-h-7 items-center rounded-full bg-white/10 px-3 text-xs font-semibold leading-none text-white ring-1 ring-white/12 hover:bg-white/15"
            >
              Review
            </Link>
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {healthScore.grade}
          </h3>
          <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-white/68">
            {healthScore.summary}
          </p>
        </div>
        <ScoreGauge score={healthScore.totalScore} tone={tone} size="compact" />
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
  const dimension = size === "compact" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-32 w-32";
  const scoreText = size === "compact" ? "text-3xl" : "text-4xl";

  return (
    <div className={`relative shrink-0 ${dimension}`}>
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
          <p className={cn(scoreText, "font-semibold tracking-tight text-white")}>{score}</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/48">
            /100
          </p>
        </div>
      </div>
    </div>
  );
}

function toneForScore(score: number) {
  if (score >= 70) {
    return {
      gauge: "text-emerald-300",
    };
  }
  if (score >= 55) {
    return {
      gauge: "text-amber-300",
    };
  }
  return {
    gauge: "text-rose-300",
  };
}

"use client";

import type { PortfolioItem } from "@/lib/types/investment";
import {
  calculatePortfolioHealthScore,
  type HealthScoreResult,
} from "@/lib/portfolio/healthScore";
import { useMemo } from "react";

type PortfolioValuationSettings = {
  aprMoneyMarketFund?: number;
  now?: Date;
  riskTolerance?: number;
};

interface PortfolioHealthCardProps {
  portfolio: PortfolioItem[];
  riskTolerance?: number;
  aprMoneyMarketFund?: number;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "Excellent":
      return "from-green-500 to-emerald-600";
    case "Healthy":
      return "from-blue-500 to-cyan-600";
    case "Needs Attention":
      return "from-yellow-500 to-orange-600";
    case "Risky":
      return "from-orange-500 to-red-600";
    case "Critical":
      return "from-red-600 to-rose-700";
    default:
      return "from-gray-500 to-gray-600";
  }
}

function getScoreTextColor(grade: string): string {
  switch (grade) {
    case "Excellent":
      return "text-green-600";
    case "Healthy":
      return "text-blue-600";
    case "Needs Attention":
      return "text-yellow-600";
    case "Risky":
      return "text-orange-600";
    case "Critical":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

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

  const gradientClass = getGradeColor(healthScore.grade);
  const textColorClass = getScoreTextColor(healthScore.grade);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold opacity-90">
              Portfolio Health
            </h3>
            <p className="text-xs opacity-75 mt-1">Overall assessment</p>
          </div>
          {/* Circular score */}
          <div className="relative w-24 h-24">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="6"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - healthScore.totalScore / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {healthScore.totalScore}
                </div>
                <div className="text-xs opacity-90">/100</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grade and summary */}
      <div className="p-6 space-y-4">
        <div>
          <div className={`text-lg font-bold ${textColorClass} mb-2`}>
            {healthScore.grade}
          </div>
          <p className="text-sm text-gray-700">{healthScore.summary}</p>
        </div>

        {/* Score breakdown grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="text-center py-2">
            <div className="text-xs text-gray-600 mb-1">Diversification</div>
            <div className="text-lg font-semibold text-gray-900">
              {healthScore.diversificationScore}
            </div>
          </div>
          <div className="text-center py-2">
            <div className="text-xs text-gray-600 mb-1">Allocation</div>
            <div className="text-lg font-semibold text-gray-900">
              {healthScore.allocationScore}
            </div>
          </div>
          <div className="text-center py-2">
            <div className="text-xs text-gray-600 mb-1">Risk</div>
            <div className="text-lg font-semibold text-gray-900">
              {healthScore.riskScore}
            </div>
          </div>
          <div className="text-center py-2">
            <div className="text-xs text-gray-600 mb-1">Performance</div>
            <div className="text-lg font-semibold text-gray-900">
              {healthScore.performanceScore}
            </div>
          </div>
        </div>

        {/* Top recommendations */}
        {healthScore.recommendedActions.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h4 className="text-xs font-semibold text-blue-900 mb-2">
              Recommended Actions
            </h4>
            <ul className="space-y-1">
              {healthScore.recommendedActions.slice(0, 2).map((action, idx) => (
                <li
                  key={idx}
                  className="text-xs text-blue-800 flex items-start gap-2"
                >
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {healthScore.warnings.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <h4 className="text-xs font-semibold text-yellow-900 mb-2">
              Alerts
            </h4>
            <ul className="space-y-1">
              {healthScore.warnings.slice(0, 2).map((warning, idx) => (
                <li key={idx} className="text-xs text-yellow-800">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

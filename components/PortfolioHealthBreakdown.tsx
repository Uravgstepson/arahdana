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

interface PortfolioHealthBreakdownProps {
  portfolio: PortfolioItem[];
  riskTolerance?: number;
  aprMoneyMarketFund?: number;
}

function ScoreBar({
  label,
  score,
  maxScore = 100,
}: {
  label: string;
  score: number;
  maxScore?: number;
}) {
  const percentage = (score / maxScore) * 100;
  let color = "bg-red-500";
  if (percentage >= 85) color = "bg-green-500";
  else if (percentage >= 70) color = "bg-blue-500";
  else if (percentage >= 55) color = "bg-yellow-500";
  else if (percentage >= 40) color = "bg-orange-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">
          {Math.round(score)}/100
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function PortfolioHealthBreakdown({
  portfolio,
  riskTolerance = 15,
  aprMoneyMarketFund = 0.05,
}: PortfolioHealthBreakdownProps) {
  const healthScore = useMemo(() => {
    const settings: PortfolioValuationSettings = {
      aprMoneyMarketFund,
      riskTolerance,
    };
    return calculatePortfolioHealthScore(portfolio, settings);
  }, [portfolio, riskTolerance, aprMoneyMarketFund]);

  if (portfolio.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Health Score Breakdown
        </h3>
        <p className="text-sm text-gray-600 text-center py-8">
          Add investments to your portfolio to see the health score breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Overall Health Score
          </h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {healthScore.totalScore}
            </div>
            <div className="text-sm font-semibold text-gray-600">
              {healthScore.grade}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-700">{healthScore.summary}</p>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Component Scores
        </h3>
        <div className="space-y-4">
          <ScoreBar
            label="Diversification"
            score={healthScore.diversificationScore}
          />
          <ScoreBar
            label="Allocation Balance"
            score={healthScore.allocationScore}
          />
          <ScoreBar label="Risk Exposure" score={healthScore.riskScore} />
          <ScoreBar label="Performance" score={healthScore.performanceScore} />
          <ScoreBar
            label="Concentration Risk"
            score={healthScore.concentrationScore}
          />
        </div>
      </div>

      {/* Strengths */}
      {healthScore.strengths.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 border-l-4 border-l-green-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-green-600">✓</span> Strengths
          </h3>
          <ul className="space-y-2">
            {healthScore.strengths.map((strength, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-700 flex items-start gap-3"
              >
                <span className="text-green-600 font-bold mt-0.5">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {healthScore.weaknesses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 border-l-4 border-l-orange-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-orange-600">⚠</span> Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {healthScore.weaknesses.map((weakness, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-700 flex items-start gap-3"
              >
                <span className="text-orange-600 font-bold mt-0.5">•</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {healthScore.recommendedActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 border-l-4 border-l-blue-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-blue-600">→</span> Recommended Actions
          </h3>
          <ul className="space-y-2">
            {healthScore.recommendedActions.map((action, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-700 flex items-start gap-3"
              >
                <span className="text-blue-600 font-bold mt-0.5">
                  {idx + 1}.
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings/Alerts */}
      {healthScore.warnings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 border-l-4 border-l-red-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-red-600">!</span> Alerts
          </h3>
          <ul className="space-y-2">
            {healthScore.warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Score Grade Legend */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Score Grading Scale
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="text-center">
            <div className="text-xs font-bold text-green-700 bg-green-50 rounded px-2 py-1 mb-1">
              85-100
            </div>
            <div className="text-xs text-gray-600">Excellent</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-blue-700 bg-blue-50 rounded px-2 py-1 mb-1">
              70-84
            </div>
            <div className="text-xs text-gray-600">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-yellow-700 bg-yellow-50 rounded px-2 py-1 mb-1">
              55-69
            </div>
            <div className="text-xs text-gray-600">Attention</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-orange-700 bg-orange-50 rounded px-2 py-1 mb-1">
              40-54
            </div>
            <div className="text-xs text-gray-600">Risky</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-red-700 bg-red-50 rounded px-2 py-1 mb-1">
              0-39
            </div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
        </div>
      </div>
    </div>
  );
}

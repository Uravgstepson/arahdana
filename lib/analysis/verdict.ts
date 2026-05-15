import type { Verdict } from "@/lib/types/investment";

export function decideVerdict(params: {
  trendScore: number;
  volatilityScore: number;
  drawdownScore: number;
  momentumScore: number;
  riskTolerance: number;
}) {
  const { trendScore, volatilityScore, drawdownScore, momentumScore, riskTolerance } = params;
  const tooVolatile = volatilityScore > riskTolerance * 2.8;
  const severeDrawdown = drawdownScore > riskTolerance * 2.2;
  const weakTrend = trendScore < 42;
  const overextended = momentumScore > 82;

  let verdict: Verdict = "WAIT";
  if (!tooVolatile && !severeDrawdown && !weakTrend && !overextended && momentumScore >= 35) {
    verdict = "BUY";
  }

  if (tooVolatile || severeDrawdown || (weakTrend && momentumScore < 35) || overextended) {
    verdict = "AVOID";
  }

  const confidence = Math.round(
    Math.max(
      25,
      Math.min(
        92,
        trendScore * 0.35 +
          (100 - Math.min(volatilityScore, 100)) * 0.2 +
          (100 - Math.min(drawdownScore, 100)) * 0.2 +
          (100 - Math.abs(momentumScore - 55)) * 0.25,
      ),
    ),
  );

  return { verdict, confidence };
}

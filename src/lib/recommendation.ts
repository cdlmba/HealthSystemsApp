import { WeeklySummary, WeeklyRecommendation, WellnessPlan } from '../types';

export function calculateRecommendation(
  weekSummary: Omit<WeeklySummary, 'recommendation'>,
  plan: WellnessPlan
): WeeklyRecommendation {
  const currentRate = weekSummary.avgWeight - (plan.bodyWeightLbs || weekSummary.avgWeight);
  const targetRate = plan.weeklyRateTarget || 0;
  const phase = plan.phase || 'maintain';

  let lever: 'calories' | 'steps' | 'hold' = 'hold';
  let direction: 'increase' | 'decrease' | 'maintain' = 'maintain';
  let amount = 0;
  let rationale = "On track with protocol targets.";

  if (phase === 'cut') {
    if (currentRate > targetRate + 0.2) {
      // Not losing fast enough
      lever = 'calories';
      direction = 'decrease';
      amount = 150;
      rationale = `Weight trend (${currentRate.toFixed(1)} lbs) is slower than target (${targetRate.toFixed(1)} lbs). Dropping base calories to drive deficit.`;
      
      // If calories are already too low (e.g. < 1500), swap to steps
      if ((plan.currentWeekCalorieTarget || plan.targetCalories) <= 1500) {
        lever = 'steps';
        direction = 'increase';
        amount = 1500;
        rationale = `Weight trend is slower than target. Calories are already at lower limit, so increasing daily steps by ${amount} instead.`;
      }
    } else if (currentRate < targetRate - 0.5) {
      // Losing too fast
      lever = 'calories';
      direction = 'increase';
      amount = 150;
      rationale = `Weight trend (${currentRate.toFixed(1)} lbs) is faster than target (${targetRate.toFixed(1)} lbs). Adding calories to prevent muscle loss.`;
    }
  } else if (phase === 'bulk') {
    if (currentRate < targetRate - 0.2) {
      // Not gaining fast enough
      lever = 'calories';
      direction = 'increase';
      amount = 150;
      rationale = `Weight trend (${currentRate.toFixed(1)} lbs) is slower than target (${targetRate.toFixed(1)} lbs). Increasing base calories to fuel growth.`;
    } else if (currentRate > targetRate + 0.5) {
      // Gaining too fast (fat spillover risk)
      lever = 'calories';
      direction = 'decrease';
      amount = 150;
      rationale = `Weight trend (${currentRate.toFixed(1)} lbs) is faster than target (${targetRate.toFixed(1)} lbs). Pulling back calories to minimize fat accumulation.`;
    }
  }

  // Guardrail check: Lean-first methodology
  if (phase === 'bulk' && (plan.estimatedBodyFat || 15) >= 15) {
    lever = 'calories';
    direction = 'decrease';
    amount = 250;
    rationale = `[GUARDRAIL] Estimated Body Fat is >= 15%. Dean methodology recommends cutting back to < 12% before bulking. Recommend immediate calorie drop.`;
  }

  return {
    lever,
    direction,
    amount,
    rationale,
    generatedAt: new Date().toISOString()
  };
}

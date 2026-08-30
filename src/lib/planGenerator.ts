import { WellnessPlan } from '../types';

export function generatePlan(
  gender: 'male' | 'female',
  age: number,
  weightLbs: number,
  bodyFatPercentage: number,
  activityLevel: 'sedentary' | 'light' | 'active' | 'very_active',
  phase: 'cut' | 'maintain' | 'bulk'
): Partial<WellnessPlan> {
  // BMR calculation using Katch-McArdle (requires body fat %)
  // Lean Body Mass (LBM) in kg
  const weightKg = weightLbs / 2.20462;
  const lbmKg = weightKg * (1 - bodyFatPercentage / 100);
  
  const bmr = 370 + (21.6 * lbmKg);

  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    active: 1.55,
    very_active: 1.725
  };

  const tdee = bmr * multipliers[activityLevel];

  // Adjust for phase
  let targetCalories = tdee;
  let weeklyRateTarget = 0;
  
  if (phase === 'cut') {
    // Aggressive but safe deficit (~1% BW/week)
    targetCalories = tdee - 500;
    weeklyRateTarget = -1.0;
  } else if (phase === 'bulk') {
    // Lean bulk surplus
    targetCalories = tdee + 300;
    weeklyRateTarget = 0.5;
  }

  targetCalories = Math.max(1200, Math.round(targetCalories / 50) * 50);

  // Macros:
  // Protein: 1g / lb of body weight
  const targetProtein = Math.round(weightLbs);
  
  // Fat: 0.3g - 0.4g / lb
  const targetFat = Math.round(weightLbs * 0.35);

  // Net Carbs: remaining calories
  const fatCals = targetFat * 9;
  const proteinCals = targetProtein * 4;
  const remainingCals = targetCalories - (fatCals + proteinCals);
  const targetNetCarbs = Math.max(0, Math.round(remainingCals / 4));

  return {
    phase,
    weeklyRateTarget,
    estimatedBodyFat: bodyFatPercentage,
    bodyWeightLbs: weightLbs,
    targetCalories,
    targetProtein,
    targetFat,
    targetNetCarbs,
    targetGymDaysPerWeek: 4,
    zone2DaysPerWeek: 2,
    restTimerSeconds: 120,
    currentWeekCalorieTarget: targetCalories,
    currentWeekStepTarget: 8000,
    targetSteps: 8000,
    targetBedtime: '22:30',
    targetWakeTime: '06:00',
    workoutSplit: {
      Mon: 'Upper Body',
      Tue: 'Rest',
      Wed: 'Lower Body',
      Thu: 'Rest',
      Fri: 'Upper Body',
      Sat: 'Lower Body',
      Sun: 'Rest'
    }
  };
}

export interface HealthLog {
  id?: string;
  date: string; // ISO string format
  userId: string;
  
  // Health Metrics
  weight?: number;
  sleepQuality?: number; // 1-10
  wakeups?: number;
  energyCrashes?: number; // 0-3
  chairStandEase?: number; // 1-10

  // Sleep Schedule
  bedtime?: string; // "HH:mm" format e.g. "22:30"
  wakeTime?: string; // "HH:mm" format e.g. "06:00"
  sleepDuration?: number; // auto-calculated hours

  // Health Habits
  gymCompleted?: boolean;
  fastedGymEnergy?: number; // 1-10
  workoutNotes?: string; // notes on the workout for the day
  eatingWindowAdherence?: boolean;
  eggMeal?: boolean;
  lunchProtein?: boolean;
  dinnerTime?: boolean;
  postMealWalks?: number;

  // Activity
  stepCount?: number; // daily steps (manual entry)
  activeMinutes?: number; // active minutes per day

  // MarginReset Focus Metrics
  writingOutput?: number; // word count or minutes
  finances801010?: boolean; // 80/10/10 rule adherence
  spiritualRhythm?: boolean; // daily spiritual habits / meditation
  dailyCalls?: number; // relational / client check-ins
  
  // Other
  dailyProtein?: number;
  hydration?: number; // glasses
  mobility?: boolean; // sit-to-stands or simple mobility drills
  notes?: string;
}

export interface WeeklyData {
  avgWeight: number;
  avgSleep: number;
  totalGym: number;
  eatingWindowPercent: number;
  avgChairStand: number;
  writingTotal: number;
  financesPercent: number;
  spiritualPercent: number;
  avgDailyCalls: number;
  logs: HealthLog[];
}

// ── Food / Nutrition Types ──────────────────────────────────────────────────

export interface MealEntry {
  id: string; // uuid
  name: string;
  brand?: string;
  fdcId?: number; // USDA FoodData Central ID
  calories: number;
  protein: number; // grams
  fat: number; // grams
  totalCarbs: number; // grams
  fiber: number; // grams
  netCarbs: number; // totalCarbs - fiber
  servingQty: number;
  servingUnit: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt: string; // ISO string
}

export interface MacroTotals {
  calories: number;
  protein: number;
  fat: number;
  netCarbs: number;
}

export interface DailyFoodLog {
  id?: string;
  date: string; // yyyy-MM-dd
  userId: string;
  meals: MealEntry[];
  totals: MacroTotals;
}

// ── Wellness Plan Config ────────────────────────────────────────────────────

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface WellnessPlan {
  id?: string;
  userId: string;
  updatedAt: string;

  // Sleep
  targetBedtime: string; // "HH:mm"
  targetWakeTime: string; // "HH:mm"

  // Workout split
  workoutSplit: Record<DayOfWeek, string>; // e.g. { Mon: "Upper Body", Tue: "Rest", ... }
  targetGymDaysPerWeek: number;

  // Nutrition targets
  targetCalories: number;
  targetProtein: number; // g
  targetFat: number; // g
  targetNetCarbs: number; // g

  // Eating window
  eatingWindowStart: string; // "HH:mm"
  eatingWindowEnd: string; // "HH:mm"

  // Activity
  targetSteps: number;
  targetActiveMinutes: number;

  // Notes
  notes: string;
}

// ── USDA Search Types ───────────────────────────────────────────────────────

export interface USDAFoodItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

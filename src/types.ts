export interface DailyLog {
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

  // Dean Tracker Fields
  caloriesLogged?: number;
  proteinLogged?: number;
  fatLogged?: number;
  carbsLogged?: number;
  stressLevel?: number; // 1-5
  waterOz?: number; // ounces
  morningWeight?: number; // alias to weight
  workoutSessionId?: string; // FK to workoutSessions
  workoutSessionName?: string;
  zone2Minutes?: number; // cardio minutes
  zone2Cardio?: number;
  steps?: number;
}

export type HealthLog = DailyLog;

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
  logs: DailyLog[];
}

export interface WeeklyRecommendation {
  lever: 'calories' | 'steps' | 'hold';
  direction: 'increase' | 'decrease' | 'maintain';
  amount: number;
  rationale: string;
  generatedAt: string;
}

export interface WeeklySummary {
  id?: string;
  userId: string;
  weekStart: string; // yyyy-MM-dd
  avgWeight: number;
  avgCalories: number;
  avgProtein: number;
  avgSteps: number;
  trainingSessions: number;
  zone2Sessions: number;
  avgSleepHours: number;
  avgStressLevel: number;
  recommendation: WeeklyRecommendation;
  acceptedAt?: string;
  acceptedLever?: string;
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

  // Dean Tracker Fields
  phase?: 'cut' | 'bulk' | 'maintain';
  weeklyRateTarget?: number; // % body weight/week
  heightInches: number;
  estimatedBodyFat: number;
  bodyWeightLbs: number;
  targetWeightLbs?: number;
  age?: number;
  gender?: 'male' | 'female';
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  deficit?: number;

  trainingDaysPerWeek?: number; // alias to targetGymDaysPerWeek
  zone2DaysPerWeek?: number;
  restTimerSeconds?: number;
  currentWeekCalorieTarget?: number;
  currentWeekStepTarget?: number;
  lastAdjustedAt?: string; // ISO
  lastRecommendation?: WeeklyRecommendation;
}

// ── Workout Types ──────────────────────────────────────────────────────────

export interface WorkoutSet {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number; // Reps In Reserve 0-4
  isWarmup?: boolean;
}

export interface WorkoutSession {
  id?: string;
  userId: string;
  date: string; // yyyy-MM-dd
  templateName: string;
  notes?: string;
  durationMinutes?: number;
  sets: WorkoutSet[];
  completedAt: string; // ISO
}

export interface Exercise {
  id?: string;
  userId: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio';
  defaultRepRange: [number, number];
  targetRIR: number;
  lastLoad?: number;
  lastReps?: number;
  notes?: string;
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

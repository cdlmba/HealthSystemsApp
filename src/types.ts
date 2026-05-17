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
  
  // Health Habits
  gymCompleted?: boolean;
  fastedGymEnergy?: number; // 1-10
  eatingWindowAdherence?: boolean;
  eggMeal?: boolean;
  lunchProtein?: boolean;
  dinnerTime?: boolean;
  postMealWalks?: number;
  
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


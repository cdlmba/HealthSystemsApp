import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HealthLog, DailyFoodLog, WellnessPlan } from '../types';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Checkbox } from './ui/checkbox';
import { UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react';
import MealLogModal from './MealLogModal';

const METRIC_GROUPS = [
  {
    category: 'Sleep & Recovery',
    metrics: [
      { id: 'sleepQuality', label: 'Sleep Quality (1-10)', type: 'number', aggregation: 'avg', target: '8+' },
      { id: 'bedtime', label: 'Bedtime', type: 'time', aggregation: 'none', target: 'Protocol' },
      { id: 'wakeTime', label: 'Wake Time', type: 'time', aggregation: 'none', target: 'Protocol' },
      { id: 'wakeups', label: '# of Wake-ups', type: 'number', aggregation: 'avg', target: '< 2' },
      { id: 'energyCrashes', label: 'Energy Crashes (0-3)', type: 'number', aggregation: 'avg', target: '0' },
    ]
  },
  {
    category: 'Exercise & Mobility',
    metrics: [
      { id: 'gymCompleted', label: 'Gym Session Completed', type: 'boolean', aggregation: 'sum', target: '3-4/wk' },
      { id: 'fastedGymEnergy', label: 'Fasted Gym Energy (1-10)', type: 'number', aggregation: 'avg', target: '7+' },
      { id: 'chairStandEase', label: 'Chair Stand Ease (1-10)', type: 'number', aggregation: 'avg', target: '8+' },
      { id: 'mobility', label: 'Mobility / Sit-to-Stands', type: 'boolean', aggregation: 'sum', target: 'Daily' },
    ]
  },
  {
    category: 'General Activity',
    metrics: [
      { id: 'stepCount', label: 'Daily Steps', type: 'number', aggregation: 'avg', target: '8,000+' },
      { id: 'activeMinutes', label: 'Active Minutes', type: 'number', aggregation: 'avg', target: '30+ min' },
      { id: 'postMealWalks', label: 'Post-Meal Walks', type: 'number', aggregation: 'sum', target: '3/day' },
    ]
  },
  {
    category: 'Nutrition & Eating',
    metrics: [
      { id: 'eatingWindowAdherence', label: '14/10 Eating Window', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'eggMeal', label: '9:30 AM Eggs Meal', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'lunchProtein', label: 'Lunch Protein-First', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'dinnerTime', label: 'Dinner by 7:30 PM', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'dailyProtein', label: 'Protein Estimate (g)', type: 'number', aggregation: 'avg', target: '150g+' },
      { id: 'hydration', label: 'Hydration (glasses)', type: 'number', aggregation: 'avg', target: '8+' },
      { id: '__food_calories', label: 'Calories (Meal Log)', type: 'food', aggregation: 'avg', target: 'vs Plan' },
      { id: '__food_protein', label: 'Protein (Meal Log, g)', type: 'food', aggregation: 'avg', target: 'vs Plan' },
      { id: '__food_fat', label: 'Fat (Meal Log, g)', type: 'food', aggregation: 'avg', target: 'vs Plan' },
      { id: '__food_netCarbs', label: 'Net Carbs (Meal Log, g)', type: 'food', aggregation: 'avg', target: 'vs Plan' },
    ]
  },
  {
    category: 'MarginReset Focus',
    metrics: [
      { id: 'writingOutput', label: 'Writing Output (words)', type: 'number', aggregation: 'sum', target: '500w/day' },
      { id: 'finances801010', label: '80/10/10 Financial Rule', type: 'boolean', aggregation: 'sum', target: 'Weekly' },
      { id: 'spiritualRhythm', label: 'Spiritual Rhythm', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'dailyCalls', label: 'Relational Calls', type: 'number', aggregation: 'sum', target: '1+ calls' }
    ]
  },
  {
    category: 'Body Metrics',
    metrics: [
      { id: 'weight', label: 'Morning Weight (lbs)', type: 'number', aggregation: 'avg', target: 'Monitor' },
    ]
  },
];

const generateSeedLogs = (userId: string, weekStart: Date): HealthLog[] => {
  const seedNotes = [
    "Fasted cardio felt explosive. Hit 620 words on the Reset manuscript. Clean 14-hour fast.",
    "Slight energy dip at 3 PM. Handled calls with coaching leads.",
    "Epic gym session. 780 words on Edge Strategy. Fully aligned.",
    "Poor sleep, late business dinner broke eating window. Zero margin today.",
    "Recovered sleep deficit. Hit leg day and client check-ins.",
    "Weekend family margin. Spiritual rhythm is deep.",
    "Weekly systems audit complete. Prepping for next sprint."
  ];

  return Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i);
    const dateStr = format(day, 'yyyy-MM-dd');
    const isThursday = i === 3;
    const isWeekend = i >= 5;
    const isGymDay = i === 0 || i === 2 || i === 4;

    return {
      date: dateStr,
      userId,
      weight: Number((isThursday ? 185.4 : 184.1 + (i * -0.15) + Math.random() * 0.4).toFixed(1)),
      sleepQuality: isThursday ? 6 : isWeekend ? 9 : 8,
      bedtime: isThursday ? '23:45' : '22:30',
      wakeTime: isThursday ? '06:30' : '06:00',
      wakeups: isThursday ? 3 : 1,
      energyCrashes: isThursday ? 2 : 0,
      chairStandEase: isThursday ? 6 : 8,
      gymCompleted: isGymDay,
      fastedGymEnergy: isGymDay ? 8 : undefined,
      eatingWindowAdherence: !isThursday,
      eggMeal: true,
      lunchProtein: !isThursday,
      dinnerTime: !isThursday,
      postMealWalks: isThursday ? 1 : 3,
      stepCount: isThursday ? 4200 : isWeekend ? 9500 : 7800,
      activeMinutes: isThursday ? 15 : isWeekend ? 45 : 35,
      writingOutput: isThursday ? 0 : isWeekend ? 200 : 500 + (i * 40),
      finances801010: !isThursday,
      spiritualRhythm: !isThursday,
      dailyCalls: isThursday ? 0 : isWeekend ? 1 : 2,
      dailyProtein: isThursday ? 110 : 160,
      hydration: isThursday ? 6 : 9,
      mobility: !isThursday,
      notes: seedNotes[i]
    };
  });
};

const generateSeedFoodLogs = (userId: string, weekStart: Date): DailyFoodLog[] =>
  Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i);
    const isThursday = i === 3;
    const isWeekend = i >= 5;
    const base = isThursday ? 0.7 : isWeekend ? 0.9 : 1;
    return {
      date: format(day, 'yyyy-MM-dd'),
      userId,
      meals: [],
      totals: {
        calories: Math.round(1950 * base),
        protein: Math.round(158 * base),
        fat: Math.round(79 * base),
        netCarbs: Math.round(46 * base),
      },
    };
  });

export default function HealthTrackingTable({ user }: { user: any }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<DailyFoodLog[]>([]);
  const [plan, setPlan] = useState<Partial<WellnessPlan>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [mealModalDate, setMealModalDate] = useState<Date | null>(null);

  // Load wellness plan for targets + workout split
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(`twin_focus_wellness_plan_${user.uid}`);
    if (raw) setPlan(JSON.parse(raw));
    const interval = setInterval(() => {
      const r = localStorage.getItem(`twin_focus_wellness_plan_${user.uid}`);
      if (r) setPlan(JSON.parse(r));
    }, 2000);
    return () => clearInterval(interval);
  }, [user]);

  // Load health logs
  useEffect(() => {
    if (!user) return;
    if (user.isMock) {
      const storageKey = `twin_focus_logs_v2_${user.uid}`;
      const savedLogs = localStorage.getItem(storageKey);
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      } else {
        const seedLogs = generateSeedLogs(user.uid, currentWeekStart);
        localStorage.setItem(storageKey, JSON.stringify(seedLogs));
        setLogs(seedLogs);
      }
      return;
    }
    const q = query(collection(db, 'healthLogs'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HealthLog)));
    });
    return () => unsubscribe();
  }, [user, currentWeekStart]);

  // Load food logs
  useEffect(() => {
    if (!user) return;
    if (user.isMock) {
      const key = `twin_focus_food_logs_${user.uid}`;
      const loadFood = () => {
        const raw = localStorage.getItem(key);
        if (raw) {
          setFoodLogs(JSON.parse(raw));
        } else {
          const seed = generateSeedFoodLogs(user.uid, currentWeekStart);
          localStorage.setItem(key, JSON.stringify(seed));
          setFoodLogs(seed);
        }
      };
      loadFood();
      const interval = setInterval(loadFood, 1500);
      return () => clearInterval(interval);
    }
    const q = query(collection(db, 'foodLogs'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      setFoodLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyFoodLog)));
    });
    return () => unsub();
  }, [user, currentWeekStart]);

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const getLogForDay = (date: Date) =>
    logs.find(log => isSameDay(parseISO(log.date), date));

  const getFoodLogForDay = (date: Date) =>
    foodLogs.find(l => l.date === format(date, 'yyyy-MM-dd'));

  const updateLog = async (date: Date, field: string, value: any) => {
    if (!user) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLog = getLogForDay(date);
    const docId = existingLog?.id || `${user.uid}_${dateStr}`;
    const updatedData = { ...existingLog, [field]: value, date: dateStr, userId: user.uid };

    if (user.isMock) {
      const storageKey = `twin_focus_logs_v2_${user.uid}`;
      const savedLogs = localStorage.getItem(storageKey);
      let list: HealthLog[] = savedLogs ? JSON.parse(savedLogs) : [];
      const idx = list.findIndex(l => l.date === dateStr);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updatedData };
      } else {
        list.push(updatedData);
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
      setLogs(list);
      return;
    }
    await setDoc(doc(db, 'healthLogs', docId), updatedData, { merge: true });
  };

  const saveFoodLog = (foodLog: DailyFoodLog) => {
    if (!user) return;
    const key = `twin_focus_food_logs_${user.uid}`;
    const raw = localStorage.getItem(key);
    let list: DailyFoodLog[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(l => l.date === foodLog.date);
    if (idx >= 0) {
      list[idx] = foodLog;
    } else {
      list.push(foodLog);
    }
    localStorage.setItem(key, JSON.stringify(list));
    setFoodLogs(list);
    if (!user.isMock) {
      const docId = `${user.uid}_${foodLog.date}`;
      setDoc(doc(db, 'foodLogs', docId), foodLog, { merge: true });
    }
  };

  const calculateAggregation = (metricId: string, aggregation: string) => {
    if (metricId.startsWith('__food_')) return '—';
    const weekLogs = days.map(d => getLogForDay(d)).filter(Boolean) as HealthLog[];
    if (!weekLogs.length) return '—';
    const values = weekLogs.map(log => (log as any)[metricId]).filter(v => v !== undefined && v !== null);
    if (!values.length) return '—';
    if (aggregation === 'avg') {
      const sum = values.reduce((a, b) => a + Number(b), 0);
      return (sum / values.length).toFixed(1);
    } else if (aggregation === 'sum') {
      return values.reduce((a, b) => a + (typeof b === 'boolean' ? (b ? 1 : 0) : Number(b)), 0);
    }
    return '—';
  };

  const getFoodAggregation = (subKey: 'calories' | 'protein' | 'fat' | 'netCarbs') => {
    const vals = days.map(d => getFoodLogForDay(d)?.totals[subKey] || 0).filter(v => v > 0);
    if (!vals.length) return '—';
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  // Map day index (0=Mon) to DayOfWeek key
  const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

  return (
    <div className="geometric-card flex flex-col h-full shadow-lg border-slate-200">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold text-slate-600 min-w-[160px] text-center">
            {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Telemetry Log</span>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-[260px_repeat(7,1fr)_100px] grid-header border-b border-slate-200 sticky top-0 z-10">
        <div className="p-3 border-r border-slate-200 flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider">Protocol Metric</div>
        {days.map((day, idx) => {
          const dayKey = DAY_KEYS[idx];
          const plannedWorkout = plan.workoutSplit?.[dayKey];
          return (
            <div key={day.toISOString()} className={`p-2 text-center border-r border-slate-200 ${idx === 6 ? 'text-rose-700 bg-rose-50/50' : ''}`}>
              <span className="font-bold text-xs block">{format(day, 'EEE')}</span>
              <div className="text-[9px] font-medium opacity-60 mt-0.5">{format(day, 'MMM d')}</div>
              {plannedWorkout && (
                <div className="mt-1 text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-rose-100/60 text-rose-700 truncate leading-tight">
                  {plannedWorkout}
                </div>
              )}
            </div>
          );
        })}
        <div className="p-3 text-center bg-emerald-100/70 text-emerald-950 font-bold flex items-center justify-center text-xs">Wk Avg</div>
      </div>

      {/* Metric Rows */}
      <div className="flex-1 flex flex-col divide-y divide-slate-100 text-sm overflow-y-auto">
        {METRIC_GROUPS.map((group) => (
          <React.Fragment key={group.category}>
            <div className="bg-slate-50 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-slate-600 border-y border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-100 to-slate-50">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-emerald-600 rounded-full" />
                {group.category}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 normal-case">Measure → Adjust → Improve</span>
            </div>

            {group.metrics.map((metric) => (
              <div key={metric.id} className="grid grid-cols-[260px_repeat(7,1fr)_100px] items-stretch min-h-[44px] hover:bg-slate-50/30 transition-colors">
                <div className="px-4 py-2 font-medium text-slate-600 flex flex-col justify-center border-r border-slate-100">
                  <span className="text-slate-800 font-semibold text-xs leading-tight">{metric.label}</span>
                  <span className="text-[9px] font-normal text-slate-400 mt-0.5">Target: {metric.target}</span>
                </div>

                {days.map((day, dayIdx) => {
                  const log = getLogForDay(day);
                  const foodLog = getFoodLogForDay(day);
                  const val = log ? (log as any)[metric.id] : undefined;

                  // Food metric cells
                  if (metric.type === 'food') {
                    const subKey = metric.id.replace('__food_', '') as 'calories' | 'protein' | 'fat' | 'netCarbs';
                    const foodVal = foodLog?.totals[subKey];
                    const isModalDay = mealModalDate && isSameDay(mealModalDate, day);
                    return (
                      <div key={day.toISOString()} className="flex flex-col items-center justify-center border-r border-slate-100 gap-0.5 py-1 px-1">
                        {foodVal !== undefined && foodVal > 0 ? (
                          <span className="text-xs font-bold text-slate-700">{foodVal}</span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                        {subKey === 'calories' && (
                          <button
                            onClick={() => setMealModalDate(day)}
                            className="text-[8px] font-bold uppercase tracking-wide text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5 transition-colors"
                          >
                            <UtensilsCrossed className="w-2.5 h-2.5" /> Log
                          </button>
                        )}
                      </div>
                    );
                  }

                  // Time input cells
                  if (metric.type === 'time') {
                    return (
                      <div key={day.toISOString()} className="flex justify-center items-center border-r border-slate-100">
                        <input
                          type="time"
                          value={val || ''}
                          className="w-full h-full text-center text-[11px] font-mono bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-slate-600 px-1"
                          onChange={e => updateLog(day, metric.id, e.target.value || null)}
                        />
                      </div>
                    );
                  }

                  // Boolean cells
                  if (metric.type === 'boolean') {
                    return (
                      <div key={day.toISOString()} className="flex justify-center items-center border-r border-slate-100">
                        <Checkbox
                          checked={val || false}
                          onCheckedChange={checked => updateLog(day, metric.id, checked)}
                          className={`h-5 w-5 transition-all ${val ? 'bg-emerald-600 border-emerald-700 shadow-sm shadow-emerald-500/20' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'}`}
                        />
                      </div>
                    );
                  }

                  // Number cells
                  return (
                    <div key={day.toISOString()} className="flex justify-center items-center border-r border-slate-100">
                      <input
                        type="number"
                        value={val !== undefined && val !== null ? val : ''}
                        placeholder="–"
                        className={`w-full h-full text-center transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs ${
                          (metric.id.includes('Quality') || metric.id.includes('Ease') || metric.id.includes('Energy'))
                            ? val >= 8 ? 'bg-emerald-50/60 text-emerald-700 font-semibold'
                              : val <= 4 && val !== null && val !== undefined ? 'bg-amber-50 text-amber-700'
                              : 'bg-transparent text-slate-600'
                            : 'bg-transparent text-slate-600'
                        }`}
                        onChange={e => updateLog(day, metric.id, e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </div>
                  );
                })}

                {/* Weekly aggregate */}
                <div className="text-center font-bold bg-slate-50/50 flex items-center justify-center text-slate-700 border-l border-slate-100 text-xs">
                  {metric.type === 'food'
                    ? getFoodAggregation(metric.id.replace('__food_', '') as any)
                    : metric.aggregation === 'none'
                    ? '—'
                    : calculateAggregation(metric.id, metric.aggregation)}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Daily Notes Section */}
      <div className="h-44 bg-slate-50/50 border-t border-slate-200 flex flex-col divide-y divide-slate-200 shrink-0">
        <div className="px-4 py-2 bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between items-center">
          <span>Daily Performance Notes & System Exceptions</span>
          <span className="text-[9px] font-normal normal-case italic text-slate-400">Add context to metric spikes or crashes</span>
        </div>
        <div className="flex-1 grid grid-cols-[260px_repeat(7,1fr)_100px] divide-x divide-slate-100">
          <div className="p-3 bg-slate-100/10 flex items-center text-[10px] text-slate-400 italic font-medium leading-relaxed">
            Record energy peaks, workout highlights, writing milestones, or focus deviations.
          </div>
          {days.map(day => {
            const log = getLogForDay(day);
            return (
              <div key={day.toISOString()} className="h-full">
                <textarea
                  placeholder="Exceptions..."
                  value={log?.notes || ''}
                  className="w-full h-full p-2.5 text-[11px] text-slate-500 leading-tight italic bg-transparent resize-none focus:outline-none focus:bg-white transition-colors"
                  onChange={e => updateLog(day, 'notes', e.target.value)}
                />
              </div>
            );
          })}
          <div className="bg-slate-100/10" />
        </div>
      </div>

      {/* Meal Log Modal */}
      {mealModalDate && (
        <MealLogModal
          open={!!mealModalDate}
          onOpenChange={open => !open && setMealModalDate(null)}
          date={mealModalDate}
          existingLog={getFoodLogForDay(mealModalDate) || null}
          onSave={saveFoodLog}
          userId={user.uid}
          targets={{
            calories: plan.targetCalories || 2000,
            protein: plan.targetProtein || 160,
            fat: plan.targetFat || 80,
            netCarbs: plan.targetNetCarbs || 50,
          }}
        />
      )}
    </div>
  );
}

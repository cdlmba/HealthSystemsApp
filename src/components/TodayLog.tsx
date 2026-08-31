import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HealthLog, DailyFoodLog, WellnessPlan } from '../types';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Checkbox } from './ui/checkbox';
import { UtensilsCrossed, ChevronLeft, ChevronRight, LayoutGrid, Calendar1, Flame, Droplets, Beef, Wheat } from 'lucide-react';
import MealLogModal from './MealLogModal';
import { motion, AnimatePresence } from 'motion/react';

const METRIC_GROUPS = [
  {
    category: 'Body',
    metrics: [
      { id: 'morningWeight', label: 'Morning Weight (lbs)', type: 'number', aggregation: 'avg', target: 'Monitor' },
    ]
  },
  {
    category: 'Nutrition',
    metrics: [
      { id: '__food_calories', label: 'Calories', type: 'food', aggregation: 'avg', target: 'vs Plan' },
      { id: '__food_protein', label: 'Protein (g)', type: 'food', aggregation: 'avg', target: 'vs Plan' },
      { id: '__food_fat', label: 'Fat (g)', type: 'food', aggregation: 'avg', target: 'vs Plan' },
      { id: '__food_netCarbs', label: 'Net Carbs (g)', type: 'food', aggregation: 'avg', target: 'vs Plan' },
      { id: 'waterOz', label: 'Water (oz)', type: 'number', aggregation: 'avg', target: '80+' },
    ]
  },
  {
    category: 'Activity',
    metrics: [
      { id: 'stepCount', label: 'Daily Steps', type: 'number', aggregation: 'avg', target: '8,000+' },
      { id: 'zone2Minutes', label: 'Zone 2 Cardio (min)', type: 'number', aggregation: 'sum', target: '30+' },
    ]
  },
  {
    category: 'Recovery',
    metrics: [
      { id: 'sleepQuality', label: 'Sleep Quality (1-10)', type: 'number', aggregation: 'avg', target: '8+' },
      { id: 'bedtime', label: 'Bedtime', type: 'time', aggregation: 'none', target: 'Protocol' },
      { id: 'wakeTime', label: 'Wake Time', type: 'time', aggregation: 'none', target: 'Protocol' },
      { id: 'stressLevel', label: 'Stress Level (1-5)', type: 'number', aggregation: 'avg', target: '< 3' },
    ]
  },
  {
    category: 'Training',
    metrics: [
      { id: 'gymCompleted', label: 'Workout Completed', type: 'boolean', aggregation: 'sum', target: '3-4/wk' },
      { id: 'workoutSessionId', label: 'Session Logged', type: 'boolean', aggregation: 'sum', target: 'Tracked' },
    ]
  }
];

export default function TodayLog({ user, plan }: { user: any, plan: any }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<DailyFoodLog[]>([]);
  // Week view vs Day view state
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [mealModalDate, setMealModalDate] = useState<Date | null>(null);

  // Load health logs
  useEffect(() => {
    if (!user) return;
    if (user.isMock) {
      const storageKey = `dean_tracker_logs_v2_${user.uid}`;
      const savedLogs = localStorage.getItem(storageKey);
      if (savedLogs) setLogs(JSON.parse(savedLogs));
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
      const key = `dean_tracker_food_logs_${user.uid}`;
      const loadFood = () => {
        const raw = localStorage.getItem(key);
        if (raw) setFoodLogs(JSON.parse(raw));
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
    const updatedData = { 
      notes: null,
      ...existingLog, 
      [field]: value, 
      date: dateStr, 
      userId: user.uid 
    };

    if (user.isMock) {
      const storageKey = `dean_tracker_logs_v2_${user.uid}`;
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
    const key = `dean_tracker_food_logs_${user.uid}`;
    const raw = localStorage.getItem(key);
    let list: DailyFoodLog[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(l => l.date === foodLog.date);
    if (idx >= 0) list[idx] = foodLog;
    else list.push(foodLog);
    
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

  const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

  // Render Day View
  const renderDayView = () => {
    const log = getLogForDay(selectedDate);
    const foodLog = getFoodLogForDay(selectedDate);
    const dayKey = DAY_KEYS[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1];
    const plannedWorkout = plan.workoutSplit?.[dayKey];

    return (
      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* Date Strip */}
        <div className="flex items-center justify-between overflow-x-auto pb-2 -mx-4 px-4 sticky top-0 z-20 bg-[var(--tsd-bg)] border-b border-[var(--tsd-surface-dim)] pt-2">
          {days.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`day-chip ${isSameDay(day, new Date()) ? 'today-chip' : ''} ${isSameDay(day, selectedDate) ? 'selected-chip' : ''}`}
            >
              <span className="uppercase text-[9px]">{format(day, 'EEE')}</span>
              <span className="text-sm font-black">{format(day, 'd')}</span>
            </button>
          ))}
        </div>

        {/* Highlight if there's a workout planned */}
        {plannedWorkout && plannedWorkout !== 'Rest' && (
          <div className="bg-[rgba(74,222,128,0.1)] border border-[var(--tsd-forest)] rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--tsd-forest)]">Today's Workout</span>
            <span className="text-sm font-black text-[var(--tsd-forest)]">{plannedWorkout}</span>
          </div>
        )}

        {/* Metric Cards */}
        {METRIC_GROUPS.map((group) => (
          <div key={group.category} className="metric-card">
            <div className="section-header">
              <div className="section-header-dot" />
              {group.category}
            </div>

            <div className="flex flex-col gap-3 mt-1">
              {group.metrics.map(metric => {
                const val = log ? (log as any)[metric.id] : undefined;
                
                // Nutrition (Food logs)
                if (metric.type === 'food') {
                  if (metric.id === '__food_calories') {
                    // special card for food log button
                    const macros = foodLog?.totals || { calories: 0, protein: 0, fat: 0, netCarbs: 0 };
                    return (
                      <div key={metric.id} className="bg-[var(--tsd-surface)] rounded-xl border border-[var(--tsd-surface-dim)] p-4 flex flex-col gap-3 mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold uppercase tracking-widest text-[var(--tsd-text-dim)]">Meals</span>
                          <span className="text-xl font-black">{macros.calories} <span className="text-xs font-bold text-[var(--tsd-text-dim)]">kcal</span></span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center bg-[var(--tsd-bg)] p-2 rounded-lg border border-[var(--tsd-surface-dim)]">
                            <span className="block text-sm font-black text-[var(--tsd-forest)]">{macros.protein}g</span>
                            <span className="block text-[9px] font-bold uppercase text-[var(--tsd-text-dim)]">Protein</span>
                          </div>
                          <div className="text-center bg-[var(--tsd-bg)] p-2 rounded-lg border border-[var(--tsd-surface-dim)]">
                            <span className="block text-sm font-black text-[var(--tsd-gold)]">{macros.fat}g</span>
                            <span className="block text-[9px] font-bold uppercase text-[var(--tsd-text-dim)]">Fat</span>
                          </div>
                          <div className="text-center bg-[var(--tsd-bg)] p-2 rounded-lg border border-[var(--tsd-surface-dim)]">
                            <span className="block text-sm font-black text-[var(--tsd-gold-light)]">{macros.netCarbs}g</span>
                            <span className="block text-[9px] font-bold uppercase text-[var(--tsd-text-dim)]">Carbs</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setMealModalDate(selectedDate)}
                          className="mt-2 w-full flex items-center justify-center gap-2 bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)] h-12 rounded-xl font-bold uppercase tracking-widest text-sm"
                        >
                          <UtensilsCrossed className="w-4 h-4" /> Log Food
                        </button>
                      </div>
                    );
                  }
                  return null; // hide the other food metrics since they are grouped above
                }

                // Boolean toggle
                if (metric.type === 'boolean') {
                  return (
                    <button
                      key={metric.id}
                      onClick={() => updateLog(selectedDate, metric.id, !val)}
                      className={`bool-btn ${val ? 'bool-on' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${val ? 'bg-[var(--tsd-forest)] border-[var(--tsd-forest)] text-[var(--tsd-forest-text)]' : 'border-[var(--tsd-text-dim)]'}`}>
                        {val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      {metric.label}
                    </button>
                  );
                }

                // Time input
                if (metric.type === 'time') {
                  return (
                    <div key={metric.id} className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[var(--tsd-text)]">{metric.label}</label>
                      <input
                        type="time"
                        value={val || ''}
                        onChange={e => updateLog(selectedDate, metric.id, e.target.value || null)}
                        className="gym-input"
                      />
                    </div>
                  );
                }

                if (metric.id === 'stressLevel' || metric.id === 'sleepQuality') {
                  const maxVal = metric.id === 'stressLevel' ? 5 : 10;
                  const options = Array.from({ length: maxVal }, (_, i) => i + 1);
                  return (
                    <div key={metric.id} className="flex flex-col gap-2 mt-1">
                      <label className="text-xs font-bold text-[var(--tsd-text)]">{metric.label}</label>
                      <div className="flex gap-2 items-center overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                        {options.map(opt => (
                          <button
                            key={opt}
                            className={`rir-btn shrink-0 w-12 h-12 snap-center ${val === opt ? 'selected' : ''}`}
                            onClick={() => updateLog(selectedDate, metric.id, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                        <input
                          type="number"
                          inputMode="decimal"
                          className="rir-btn shrink-0 w-16 h-12 text-center bg-[var(--tsd-surface-2)] text-sm font-bold snap-center"
                          placeholder="+"
                          value={(val !== undefined && val !== null && !options.includes(val)) ? val : ''}
                          onChange={e => updateLog(selectedDate, metric.id, e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </div>
                    </div>
                  );
                }

                // Default Number Input
                return (
                  <div key={metric.id} className="flex flex-col gap-1.5 mt-1">
                    <label className="text-xs font-bold text-[var(--tsd-text)]">{metric.label}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={val !== undefined && val !== null ? val : ''}
                      onChange={e => updateLog(selectedDate, metric.id, e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="—"
                      className="gym-input"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Notes */}
        <div className="metric-card mb-4">
          <div className="section-header">
            <div className="section-header-dot" />
            Daily Notes
          </div>
          <textarea
            placeholder="Record exceptions, high energy, crashes..."
            value={log?.notes || ''}
            onChange={e => updateLog(selectedDate, 'notes', e.target.value)}
            className="w-full min-h-[100px] p-3 rounded-xl bg-[var(--tsd-surface)] border-2 border-[var(--tsd-surface-dim)] focus:border-[var(--tsd-forest)] focus:outline-none resize-y text-sm font-medium transition-colors"
          />
        </div>
      </div>
    );
  };

  // Render Week View (Desktop style spreadsheet)
  const renderWeekView = () => {
    return (
      <div className="tsd-card flex flex-col shadow-lg overflow-x-auto min-w-[800px] animate-in fade-in">
        {/* Grid Header */}
        <div className="grid grid-cols-[200px_repeat(7,1fr)_80px] grid-header border-b border-[var(--tsd-surface-dim)]">
          <div className="p-3 border-r border-[var(--tsd-surface-dim)] flex items-center text-xs font-bold uppercase tracking-wider">Metric</div>
          {days.map((day, idx) => {
            const dayKey = DAY_KEYS[idx];
            const plannedWorkout = plan.workoutSplit?.[dayKey];
            return (
              <div key={day.toISOString()} className={`p-2 text-center border-r border-[var(--tsd-surface-dim)] ${idx === 6 ? 'bg-[rgba(248,113,113,0.05)] text-[var(--tsd-danger)]' : ''}`}>
                <span className="font-bold text-xs block">{format(day, 'EEE')}</span>
                <div className="text-[9px] font-medium opacity-60 mt-0.5">{format(day, 'MMM d')}</div>
                {plannedWorkout && (
                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-[var(--tsd-surface-dim)] truncate leading-tight mx-auto max-w-[80%]">
                    {plannedWorkout}
                  </div>
                )}
              </div>
            );
          })}
          <div className="p-3 text-center bg-[rgba(74,222,128,0.1)] text-[var(--tsd-forest)] font-bold flex items-center justify-center text-[10px] uppercase">Wk Avg</div>
        </div>

        {/* Metric Rows */}
        <div className="flex-1 flex flex-col divide-y divide-[var(--tsd-surface-dim)] text-sm">
          {METRIC_GROUPS.map((group) => (
            <React.Fragment key={group.category}>
              <div className="bg-[var(--tsd-surface)] px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-[var(--tsd-forest)] border-y border-[var(--tsd-surface-dim)]">
                {group.category}
              </div>

              {group.metrics.map((metric) => (
                <div key={metric.id} className="grid grid-cols-[200px_repeat(7,1fr)_80px] items-stretch min-h-[44px] hover:bg-[var(--tsd-surface-dim)] transition-colors">
                  <div className="px-4 py-2 font-medium flex flex-col justify-center border-r border-[var(--tsd-surface-dim)] text-xs">
                    {metric.label}
                  </div>

                  {days.map((day) => {
                    const log = getLogForDay(day);
                    const foodLog = getFoodLogForDay(day);
                    const val = log ? (log as any)[metric.id] : undefined;

                    if (metric.type === 'food') {
                      const subKey = metric.id.replace('__food_', '') as 'calories' | 'protein' | 'fat' | 'netCarbs';
                      const foodVal = foodLog?.totals[subKey];
                      return (
                        <div key={day.toISOString()} className="flex flex-col items-center justify-center border-r border-[var(--tsd-surface-dim)] gap-0.5 py-1 px-1">
                          {foodVal !== undefined && foodVal > 0 ? (
                            <span className="text-xs font-bold text-[var(--tsd-text)]">{foodVal}</span>
                          ) : (
                            <span className="text-[10px] opacity-30">—</span>
                          )}
                        </div>
                      );
                    }

                    if (metric.type === 'boolean') {
                      return (
                        <div key={day.toISOString()} className="flex justify-center items-center border-r border-[var(--tsd-surface-dim)]">
                          <Checkbox checked={val || false} onCheckedChange={checked => updateLog(day, metric.id, checked)} className="h-4 w-4" />
                        </div>
                      );
                    }

                    if (metric.type === 'time') {
                      return (
                        <div key={day.toISOString()} className="flex justify-center items-center border-r border-[var(--tsd-surface-dim)]">
                          <input
                            type="time"
                            value={val || ''}
                            onChange={e => updateLog(day, metric.id, e.target.value || null)}
                            className="w-full text-center text-[10px] bg-transparent focus:outline-none"
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={day.toISOString()} className="flex justify-center items-center border-r border-[var(--tsd-surface-dim)]">
                        <input
                          type="number"
                          value={val !== undefined && val !== null ? val : ''}
                          onChange={e => updateLog(day, metric.id, e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="–"
                          className="w-full text-center text-xs bg-transparent focus:outline-none"
                        />
                      </div>
                    );
                  })}

                  <div className="text-center font-bold bg-[var(--tsd-surface)] flex items-center justify-center text-xs border-l border-[var(--tsd-surface-dim)]">
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
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Top Header - View Toggle & Week Nav */}
      <div className="flex items-center justify-between pb-4 mb-2">
        <div className="flex bg-[var(--tsd-surface-dim)] p-1 rounded-xl">
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center justify-center px-4 h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'day' ? 'bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)] shadow' : 'text-[var(--tsd-text-dim)]'}`}
          >
            <Calendar1 className="w-3.5 h-3.5 mr-1.5" /> Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center justify-center px-4 h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'week' ? 'bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)] shadow' : 'text-[var(--tsd-text-dim)]'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Week
          </button>
        </div>

        {viewMode === 'week' && (
          <div className="flex items-center gap-2 bg-[var(--tsd-surface-2)] p-1 rounded-xl border border-[var(--tsd-surface-dim)]">
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--tsd-surface-dim)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[10px] font-bold px-2">{format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'd')}</span>
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--tsd-surface-dim)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'day' ? renderDayView() : renderWeekView()}
      </AnimatePresence>

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

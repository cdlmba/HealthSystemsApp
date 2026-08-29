import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyFoodLog, WellnessPlan } from '../types';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine, LineChart, Line
} from 'recharts';
import { Flame, Beef, Droplets, Wheat, TrendingUp, ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { Progress } from './ui/progress';

const MACRO_CONFIG = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#f97316', targetKey: 'targetCalories', icon: Flame },
  { key: 'protein', label: 'Protein', unit: 'g', color: '#3b82f6', targetKey: 'targetProtein', icon: Beef },
  { key: 'fat', label: 'Fat', unit: 'g', color: '#f59e0b', targetKey: 'targetFat', icon: Droplets },
  { key: 'netCarbs', label: 'Net Carbs', unit: 'g', color: '#10b981', targetKey: 'targetNetCarbs', icon: Wheat },
] as const;

const SEED_FOOD_LOGS = (userId: string, weekStart: Date): DailyFoodLog[] =>
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
        calories: Math.round(1900 * base + (Math.random() - 0.5) * 200),
        protein: Math.round(155 * base + (Math.random() - 0.5) * 20),
        fat: Math.round(78 * base + (Math.random() - 0.5) * 15),
        netCarbs: Math.round(45 * base + (Math.random() - 0.5) * 10),
      },
    };
  });

export default function NutritionDashboard({ user }: { user: any }) {
  const [logs, setLogs] = useState<DailyFoodLog[]>([]);
  const [plan, setPlan] = useState<Partial<WellnessPlan>>({});
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  // Load wellness plan for targets
  useEffect(() => {
    if (!user) return;
    if (user.isMock) {
      const raw = localStorage.getItem(`twin_focus_wellness_plan_${user.uid}`);
      if (raw) setPlan(JSON.parse(raw));
      return;
    }
    const load = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'wellnessPlans', user.uid));
        if (snap.exists()) setPlan(snap.data() as WellnessPlan);
      } catch {}
    };
    load();
  }, [user]);

  // Load food logs
  useEffect(() => {
    if (!user) return;

    if (user.isMock) {
      const key = `twin_focus_food_logs_${user.uid}`;
      const loadLogs = () => {
        const raw = localStorage.getItem(key);
        if (raw) {
          setLogs(JSON.parse(raw));
        } else {
          const seed = SEED_FOOD_LOGS(user.uid, weekStart);
          localStorage.setItem(key, JSON.stringify(seed));
          setLogs(seed);
        }
      };
      loadLogs();
      const interval = setInterval(loadLogs, 1500);
      return () => clearInterval(interval);
    }

    const q = query(collection(db, 'foodLogs'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyFoodLog)));
    });
    return () => unsub();
  }, [user, weekOffset]);

  const weekLogs = logs.filter(l => {
    const d = parseISO(l.date);
    return d >= weekStart && d <= weekEnd;
  });

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i);
    const log = weekLogs.find(l => l.date === format(day, 'yyyy-MM-dd'));
    return {
      name: format(day, 'EEE'),
      Calories: log?.totals.calories || 0,
      Protein: log?.totals.protein || 0,
      Fat: log?.totals.fat || 0,
      'Net Carbs': log?.totals.netCarbs || 0,
    };
  });

  const getAvg = (key: keyof DailyFoodLog['totals']) => {
    const vals = weekLogs.filter(l => l.totals[key] > 0).map(l => l.totals[key]);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const getDaysOnTarget = (key: keyof DailyFoodLog['totals'], targetKey: keyof WellnessPlan) => {
    const target = (plan as any)[targetKey] as number | undefined;
    if (!target) return null;
    const days = weekLogs.filter(l => {
      const val = l.totals[key];
      return val >= target * 0.85 && val <= target * 1.15;
    }).length;
    return { days, total: weekLogs.length };
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1">
            <UtensilsCrossed className="w-3 h-3" /> Nutrition Analytics
          </div>
          <h2 className="text-lg font-bold tracking-tight">Macro Performance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Weekly breakdown vs. your Wellness Plan targets</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-300 min-w-[160px] text-center">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset(v => Math.min(v + 1, 0))}
            disabled={weekOffset === 0}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MACRO_CONFIG.map(({ key, label, unit, color, targetKey, icon: Icon }) => {
          const avg = getAvg(key as any);
          const target = (plan as any)[targetKey] as number | undefined;
          const pct = target ? Math.min(Math.round((avg / target) * 100), 150) : null;
          const onTarget = getDaysOnTarget(key as any, targetKey as any);
          return (
            <div key={key} className="geometric-card p-5 flex flex-col gap-3 hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                <div className="p-1.5 rounded" style={{ background: `${color}18`, color }}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 tracking-tight">{avg || '—'}</span>
                  <span className="text-xs text-slate-400 font-semibold">{unit} avg</span>
                </div>
                {target && (
                  <div className="text-[10px] text-slate-500 mt-1">Target: <strong className="text-slate-700">{target} {unit}</strong></div>
                )}
              </div>
              {pct !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Adherence</span>
                    <span style={{ color }}>{pct}%</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-1.5 bg-slate-100" />
                </div>
              )}
              {onTarget && (
                <p className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2">
                  On target: <strong className="text-slate-700">{onTarget.days}/{onTarget.total}</strong> days
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Calorie Bar Chart */}
      <div className="geometric-card p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-orange-500" />
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Calories vs. Target</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Bar name="Calories" dataKey="Calories" fill="#f97316" radius={[4, 4, 0, 0]} barSize={28} />
              {plan.targetCalories && (
                <ReferenceLine y={plan.targetCalories} stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `Target ${plan.targetCalories}`, fill: '#f97316', fontSize: 10, position: 'right' }} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macro Trend Line Chart */}
      <div className="geometric-card p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protein / Fat / Net Carbs — Daily Trend</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingBottom: '20px' }} />
              <Line name="Protein (g)" type="monotone" dataKey="Protein" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line name="Fat (g)" type="monotone" dataKey="Fat" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line name="Net Carbs (g)" type="monotone" dataKey="Net Carbs" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day-by-Day Food Log Summary */}
      <div className="geometric-card p-6">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Daily Meal Log Summary</h3>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(weekStart, i);
            const log = weekLogs.find(l => l.date === format(day, 'yyyy-MM-dd'));
            const mealCount = log?.meals.length || 0;
            const cal = log?.totals.calories || 0;
            const targetCal = plan.targetCalories;
            const pct = targetCal && cal ? Math.min((cal / targetCal) * 100, 100) : 0;
            const isOver = targetCal && cal > targetCal * 1.1;
            return (
              <div key={i} className="flex flex-col gap-2 items-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">{format(day, 'EEE')}</span>
                <span className="text-[9px] text-slate-400">{format(day, 'M/d')}</span>
                <div
                  className={`w-full rounded-lg p-2 text-center transition-colors ${
                    cal === 0 ? 'bg-slate-50 border border-slate-100' :
                    isOver ? 'bg-rose-50 border border-rose-100' :
                    'bg-emerald-50 border border-emerald-100'
                  }`}
                >
                  <div className={`text-sm font-black ${cal === 0 ? 'text-slate-300' : isOver ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {cal || '—'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium">kcal</div>
                  {mealCount > 0 && (
                    <div className="text-[9px] text-slate-400 mt-0.5">{mealCount} items</div>
                  )}
                </div>
                {cal > 0 && (
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-400' : 'bg-emerald-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

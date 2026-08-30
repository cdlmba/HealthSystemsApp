import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyFoodLog, WellnessPlan } from '../types';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, LineChart, Line, Legend
} from 'recharts';
import { Flame, Beef, Droplets, Wheat, TrendingUp, ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';

const TSD = {
  forest:    'var(--tsd-forest)',
  forestMid: 'var(--tsd-forest-mid)',
  moss:      'var(--tsd-moss)',
  gold:      'var(--tsd-gold)',
  goldLight: 'var(--tsd-gold-light)',
  goldBg:    'var(--tsd-gold-bg)',
  cream:     'var(--tsd-bg)',
  surface:   'var(--tsd-surface)',
  surfaceDim:'var(--tsd-surface-dim)',
  text:      'var(--tsd-text)',
  textDim:   'var(--tsd-text-dim)',
  danger:    'var(--tsd-danger)',
};

const MACRO_CONFIG = [
  { key: 'calories',  label: 'Calories',  unit: 'kcal', color: TSD.gold,      targetKey: 'targetCalories',  icon: Flame   },
  { key: 'protein',   label: 'Protein',   unit: 'g',    color: TSD.forest,     targetKey: 'targetProtein',   icon: Beef    },
  { key: 'fat',       label: 'Fat',       unit: 'g',    color: TSD.goldLight,  targetKey: 'targetFat',       icon: Droplets },
  { key: 'netCarbs',  label: 'Net Carbs', unit: 'g',    color: TSD.forestMid,  targetKey: 'targetNetCarbs',  icon: Wheat   },
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
        protein:  Math.round(155  * base + (Math.random() - 0.5) * 20),
        fat:      Math.round(78   * base + (Math.random() - 0.5) * 15),
        netCarbs: Math.round(45   * base + (Math.random() - 0.5) * 10),
      },
    };
  });

export default function NutritionDashboard({ user }: { user: any }) {
  const [logs, setLogs]         = useState<DailyFoodLog[]>([]);
  const [plan, setPlan]         = useState<Partial<WellnessPlan>>({});
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekEnd   = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  useEffect(() => {
    if (!user) return;
    if (user.isMock) {
      const raw = localStorage.getItem(`dean_tracker_wellness_plan_${user.uid}`);
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

  useEffect(() => {
    if (!user) return;
    if (user.isMock) {
      const key = `dean_tracker_food_logs_${user.uid}`;
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
      Protein:  log?.totals.protein  || 0,
      Fat:      log?.totals.fat      || 0,
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

  const tooltipStyle = {
    borderRadius: '12px',
    border: `1px solid ${TSD.surfaceDim}`,
    backgroundColor: 'var(--tsd-surface-2)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    fontSize: '12px',
    color: 'var(--tsd-text)',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
        style={{ background: 'var(--tsd-forest-mid)' }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(246,201,14,0.15)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="w-4 h-4" style={{ color: TSD.gold }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TSD.gold }}>
              Nutrition Analytics
            </span>
          </div>
          <h2 className="tsd-serif text-2xl font-bold text-[#0e1412]">Macro Performance</h2>
          <p className="text-xs font-medium mt-1" style={{ color: 'rgba(14,20,18,0.7)' }}>
            Weekly breakdown vs targets
          </p>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-3 relative z-10 shrink-0 bg-[#0e1412] p-1 rounded-xl">
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.1)]"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold min-w-[130px] text-center text-white">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset(v => Math.min(v + 1, 0))}
            disabled={weekOffset === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 hover:bg-[rgba(255,255,255,0.1)]"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {MACRO_CONFIG.map(({ key, label, unit, color, targetKey, icon: Icon }) => {
          const avg    = getAvg(key as any);
          const target = (plan as any)[targetKey] as number | undefined;
          const pct    = target ? Math.min(Math.round((avg / target) * 100), 150) : null;
          const onTarget = getDaysOnTarget(key as any, targetKey as any);
          const variance = target && avg ? Math.round(((avg - target) / target) * 100) : null;

          return (
            <div key={key} className="metric-card">
              {/* Label + icon */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TSD.textDim }}>
                  {label}
                </span>
                <div className="p-1.5 rounded-lg border border-[var(--tsd-surface-dim)]" style={{ background: 'var(--tsd-bg)' }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
              </div>

              {/* Value */}
              <div className="mt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="tsd-serif text-3xl font-bold" style={{ color: TSD.text }}>
                    {avg || '—'}
                  </span>
                  <span className="text-[10px] font-bold uppercase" style={{ color: TSD.textDim }}>{unit}</span>
                </div>
                {target && (
                  <div className="text-[9px] mt-1 flex flex-wrap items-center gap-1.5 font-bold uppercase tracking-widest" style={{ color: TSD.textDim }}>
                    Tgt:
                    <span style={{ color: TSD.text }}>
                      {target} {unit}
                    </span>
                    {variance !== null && (
                      <span className="bg-[var(--tsd-surface-dim)] px-1 py-0.5 rounded text-[var(--tsd-text)]">
                        {variance > 0 ? '+' : ''}{variance}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Gold progress bar */}
              {pct !== null && (
                <div className="space-y-1 mt-2">
                  <div className="tsd-progress-track">
                    <div className="tsd-progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Charts row ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Calorie bar chart */}
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4" style={{ color: TSD.gold }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TSD.textDim }}>
              Daily Calories
            </h3>
          </div>
          <div className="h-56 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={TSD.surfaceDim} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: TSD.textDim, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: TSD.textDim }} width={40} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} />
                <Bar name="Calories" dataKey="Calories" fill={TSD.gold} radius={[4, 4, 0, 0]} barSize={20} />
                {plan.targetCalories && (
                  <ReferenceLine
                    y={plan.targetCalories}
                    stroke={TSD.goldLight}
                    strokeDasharray="4 4"
                    strokeWidth={2}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Macro trend chart */}
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: TSD.forest }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TSD.textDim }}>
              Macro Trend
            </h3>
          </div>
          <div className="h-56 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={TSD.surfaceDim} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: TSD.textDim, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: TSD.textDim }} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="top" align="right" iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingBottom: '10px', color: TSD.textDim }} />
                <Line name="Protein"   type="monotone" dataKey="Protein"   stroke={TSD.forest}    strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line name="Fat"       type="monotone" dataKey="Fat"       stroke={TSD.gold}      strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line name="Net Carbs" type="monotone" dataKey="Net Carbs" stroke={TSD.goldLight} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Day-by-Day Summary ─────────────────────────────────── */}
      <div className="metric-card mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: TSD.textDim }}>
          Daily Log Summary
        </h3>
        <div className="flex justify-between gap-1 overflow-x-auto pb-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const day      = addDays(weekStart, i);
            const log      = weekLogs.find(l => l.date === format(day, 'yyyy-MM-dd'));
            const mealCount = log?.meals.length || 0;
            const cal      = log?.totals.calories || 0;
            const targetCal = plan.targetCalories;
            const pct      = targetCal && cal ? Math.min((cal / targetCal) * 100, 100) : 0;
            const isOver   = targetCal && cal > targetCal * 1.1;
            const isEmpty  = cal === 0;

            return (
              <div key={i} className="flex flex-col gap-1 items-center min-w-[45px]">
                <span className="text-[9px] font-bold uppercase" style={{ color: TSD.textDim }}>
                  {format(day, 'EEE')}
                </span>
                <div
                  className="w-full rounded-lg py-2 flex flex-col items-center border"
                  style={{
                    background: isEmpty ? 'var(--tsd-bg)' : isOver ? 'rgba(248,113,113,0.1)' : 'var(--tsd-surface)',
                    borderColor: isEmpty ? 'var(--tsd-surface-dim)' : isOver ? 'rgba(248,113,113,0.3)' : 'var(--tsd-surface-dim)'
                  }}
                >
                  <span className="text-[10px] font-bold" style={{ color: isOver ? 'var(--tsd-danger)' : 'var(--tsd-text)' }}>
                    {cal || '—'}
                  </span>
                </div>
                {cal > 0 && (
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: TSD.surfaceDim }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isOver ? 'var(--tsd-danger)' : TSD.gold }}
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

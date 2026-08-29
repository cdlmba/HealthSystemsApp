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
  forest:    '#013220',
  forestMid: '#234f3b',
  moss:      '#717973',
  gold:      '#D4A017',
  goldLight: '#F6BE39',
  goldBg:    '#FFF9E6',
  cream:     '#F8F4EF',
  surface:   '#FDF9F4',
  surfaceDim:'#EDE9E3',
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
    borderRadius: '10px',
    border: `1px solid ${TSD.surfaceDim}`,
    boxShadow: '0 4px 16px rgba(1,50,32,0.08)',
    fontSize: '12px',
    color: TSD.forest,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
        style={{ background: TSD.forest }}
      >
        {/* Gold glow orb */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: `${TSD.gold}18` }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="w-3 h-3" style={{ color: TSD.goldLight }} />
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TSD.goldLight }}>
              Nutrition Analytics
            </span>
          </div>
          <h2 className="tsd-serif text-xl font-semibold text-white">Macro Performance</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Weekly breakdown vs. your Wellness Plan targets
          </p>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium min-w-[160px] text-center text-white">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset(v => Math.min(v + 1, 0))}
            disabled={weekOffset === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MACRO_CONFIG.map(({ key, label, unit, color, targetKey, icon: Icon }) => {
          const avg    = getAvg(key as any);
          const target = (plan as any)[targetKey] as number | undefined;
          const pct    = target ? Math.min(Math.round((avg / target) * 100), 150) : null;
          const onTarget = getDaysOnTarget(key as any, targetKey as any);
          const variance = target && avg ? Math.round(((avg - target) / target) * 100) : null;

          return (
            <div key={key} className="tsd-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              {/* Label + icon */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TSD.moss }}>
                  {label}
                </span>
                <div className="p-1.5 rounded-lg" style={{ background: `${color}18` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                </div>
              </div>

              {/* Value */}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="tsd-serif text-3xl font-semibold" style={{ color: TSD.forest }}>
                    {avg || '—'}
                  </span>
                  <span className="text-xs font-medium" style={{ color: TSD.moss }}>{unit} avg</span>
                </div>
                {target && (
                  <div className="text-[10px] mt-1 flex items-center gap-1.5" style={{ color: TSD.moss }}>
                    Target:
                    <span className="font-semibold" style={{ color: TSD.forest }}>
                      {target} {unit}
                    </span>
                    {variance !== null && (
                      <span
                        className="tsd-badge-gold"
                        style={variance < 0
                          ? { background: 'rgba(1,50,32,0.07)', borderColor: 'rgba(1,50,32,0.2)', color: TSD.forestMid }
                          : {}}
                      >
                        {variance > 0 ? '+' : ''}{variance}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Gold progress bar */}
              {pct !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-semibold uppercase tracking-widest" style={{ color: TSD.moss }}>
                    <span>Adherence</span>
                    <span style={{ color: TSD.gold }}>{Math.min(pct, 100)}%</span>
                  </div>
                  <div className="tsd-progress-track">
                    <div className="tsd-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Days on target */}
              {onTarget && (
                <p className="text-[10px] font-medium pt-2" style={{ borderTop: `1px solid ${TSD.surfaceDim}`, color: TSD.moss }}>
                  On target: <strong style={{ color: TSD.forest }}>{onTarget.days}/{onTarget.total}</strong> days
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Charts row ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Calorie bar chart */}
        <div className="tsd-card p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: TSD.gold }} />
            <h3 className="tsd-serif text-base font-semibold" style={{ color: TSD.forest }}>
              Daily Calories vs. Target
            </h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={TSD.surfaceDim} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: TSD.moss, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: TSD.moss }} />
                <Tooltip cursor={{ fill: `${TSD.gold}08` }} contentStyle={tooltipStyle} />
                <Bar name="Calories" dataKey="Calories" fill={TSD.gold} radius={[6, 6, 0, 0]} barSize={26} />
                {plan.targetCalories && (
                  <ReferenceLine
                    y={plan.targetCalories}
                    stroke={TSD.goldLight}
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{ value: `Target ${plan.targetCalories}`, fill: TSD.gold, fontSize: 10, position: 'right' }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Macro trend chart */}
        <div className="tsd-card p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: TSD.forestMid }} />
            <h3 className="tsd-serif text-base font-semibold" style={{ color: TSD.forest }}>
              Protein / Fat / Net Carbs — Trend
            </h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={TSD.surfaceDim} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: TSD.moss, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: TSD.moss }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="top" align="right" iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingBottom: '16px', color: TSD.moss }} />
                <Line name="Protein (g)"   type="monotone" dataKey="Protein"   stroke={TSD.forest}    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line name="Fat (g)"       type="monotone" dataKey="Fat"       stroke={TSD.gold}      strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line name="Net Carbs (g)" type="monotone" dataKey="Net Carbs" stroke={TSD.goldLight} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Day-by-Day Summary ─────────────────────────────────── */}
      <div className="tsd-card p-6">
        <h3 className="tsd-serif text-base font-semibold mb-5" style={{ color: TSD.forest }}>
          Daily Meal Log Summary
        </h3>
        <div className="grid grid-cols-7 gap-2">
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
              <div key={i} className="flex flex-col gap-1.5 items-center">
                <span className="text-[10px] font-semibold uppercase" style={{ color: TSD.moss }}>
                  {format(day, 'EEE')}
                </span>
                <span className="text-[9px]" style={{ color: TSD.surfaceDim.replace('#','') === 'EDE9E3' ? TSD.moss : TSD.moss }}>
                  {format(day, 'M/d')}
                </span>
                <div
                  className="w-full rounded-xl p-2 text-center transition-colors"
                  style={{
                    background: isEmpty ? TSD.surface :
                                isOver  ? 'rgba(186,26,26,0.06)' :
                                          'rgba(1,50,32,0.05)',
                    border: `1px solid ${isEmpty ? TSD.surfaceDim :
                                         isOver  ? 'rgba(186,26,26,0.15)' :
                                                   'rgba(1,50,32,0.12)'}`,
                  }}
                >
                  <div
                    className="tsd-serif text-base font-semibold"
                    style={{ color: isEmpty ? TSD.surfaceDim : isOver ? '#ba1a1a' : TSD.forest }}
                  >
                    {cal || '—'}
                  </div>
                  <div className="text-[9px] font-medium" style={{ color: TSD.moss }}>kcal</div>
                  {mealCount > 0 && (
                    <div className="text-[9px] mt-0.5" style={{ color: TSD.moss }}>{mealCount} items</div>
                  )}
                </div>
                {cal > 0 && (
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: TSD.surfaceDim }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isOver ? '#ba1a1a' : TSD.gold }}
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

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyLog, WellnessPlan, WeeklyRecommendation } from '../types';
import { startOfWeek, addDays, parseISO, format } from 'date-fns';
import { Progress } from './ui/progress';
import { calculateRecommendation } from '../lib/recommendation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from 'recharts';
import {
  Activity,
  Moon,
  Dumbbell,
  Utensils,
  Weight,
  Target,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Flame,
  Footprints
} from 'lucide-react';

export default function WeeklyReview({ user }: { user: any }) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [plan, setPlan] = useState<WellnessPlan | null>(null);
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Load Plan
      if (user.isMock) {
        const raw = localStorage.getItem(`dean_tracker_wellness_plan_${user.uid}`);
        if (raw) setPlan(JSON.parse(raw));
      } else {
        const snap = await getDoc(doc(db, 'wellnessPlans', user.uid));
        if (snap.exists()) setPlan(snap.data() as WellnessPlan);
      }
    };
    loadData();

    // Listen to logs
    if (user.isMock) {
      const storageKey = `dean_tracker_logs_v2_${user.uid}`;
      const savedLogs = localStorage.getItem(storageKey);
      if (savedLogs) setLogs(JSON.parse(savedLogs));
    } else {
      const q = query(collection(db, 'healthLogs'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setLogs(snapshot.docs.map(doc => doc.data() as DailyLog));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const weekLogs = logs.filter(log => {
    const logDate = parseISO(log.date);
    return logDate >= currentWeekStart && logDate < addDays(currentWeekStart, 7);
  });

  const getAvg = (field: keyof DailyLog) => {
    const values = weekLogs.map(log => log[field]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getSum = (field: keyof DailyLog) => {
    const values = weekLogs.map(log => log[field]).filter(v => typeof v === 'number') as number[];
    return values.reduce((a, b) => a + b, 0);
  };

  const avgWeight = getAvg('morningWeight');
  const avgCalories = getAvg('caloriesLogged');
  const avgProtein = getAvg('proteinLogged');
  const avgSteps = getAvg('stepCount');
  const avgSleep = getAvg('sleepQuality');
  
  const gymSessionsCount = weekLogs.filter(log => log.gymCompleted || log.workoutSessionName).length;
  const zone2Count = weekLogs.filter(log => log.zone2Cardio).length;

  const currentRate = plan ? (avgWeight - (plan.bodyWeightLbs || avgWeight)) : 0;
  
  let recommendation: WeeklyRecommendation | null = null;
  if (plan) {
    recommendation = calculateRecommendation({
      weekStart: format(currentWeekStart, 'yyyy-MM-dd'),
      userId: user.uid,
      avgWeight,
      avgCalories,
      avgProtein,
      avgSteps,
      trainingSessions: gymSessionsCount,
      zone2Sessions: zone2Count,
      avgSleepHours: avgSleep,
      avgStressLevel: 0
    } as any, plan);
  }

  // Compile trend data for charts
  const trendData = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(currentWeekStart, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = weekLogs.find(l => l.date === dateStr);
    
    return {
      name: format(date, 'EEE'),
      'Weight': log?.morningWeightLbs || avgWeight,
      'Calories': log?.caloriesLogged || 0,
      'Steps': log?.steps || 0
    };
  });

  if (!plan) return <div className="p-8 text-center text-slate-500">Loading plan...</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic Header Block with Recommendation */}
      <div className="rounded-xl p-6 flex flex-col md:flex-row justify-between gap-6 shadow-lg relative overflow-hidden" style={{ background: 'var(--tsd-forest)', border: '1px solid var(--tsd-forest-mid)' }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col justify-center text-white relative z-10 md:w-1/2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--tsd-gold)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: 'var(--tsd-gold)' }} />
            Weekly Check-In Ready
          </div>
          <h2 className="text-xl md:text-2xl font-bold mt-1 tracking-tight tsd-serif">The ONE Adjustment</h2>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(248,244,239,0.7)' }}>
            Based on your 7-day averages, here is the single most effective adjustment to your protocol for the upcoming week.
          </p>
        </div>

        {recommendation && (
          <div className="md:w-1/2 bg-white rounded-lg p-5 shadow-inner flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-100 text-amber-700">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Coach's Directive</span>
            </div>
            
            <p className="text-sm font-semibold text-slate-800">
              {recommendation.rationale}
            </p>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Lever</div>
                <div className="font-bold text-slate-700 capitalize">{recommendation.lever}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Action</div>
                <div className="font-bold text-slate-700 capitalize flex items-center gap-1">
                  {recommendation.direction === 'increase' ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : recommendation.direction === 'decrease' ? <TrendingUp className="w-3 h-3 text-rose-600 transform rotate-180" /> : '-'} 
                  {recommendation.direction}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Amount</div>
                <div className="font-bold text-slate-700">{recommendation.amount > 0 ? recommendation.amount : 'Hold Steady'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary KPI Grid (7-Day Averages) */}
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">7-Day Averages</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          <div className="geometric-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Weight</span>
              <div className="p-1.5 rounded text-blue-500 bg-blue-50">
                <Weight className="h-3.5 w-3.5 leading-none" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">{avgWeight.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-semibold">lbs</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px]">
                <span className="font-bold text-slate-400 uppercase tracking-widest">Rate</span>
                <span className="font-bold text-slate-700">{currentRate > 0 ? '+' : ''}{currentRate.toFixed(2)} lbs</span>
              </div>
            </div>
          </div>

          <div className="geometric-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Calories</span>
              <div className="p-1.5 rounded text-rose-500 bg-rose-50">
                <Flame className="h-3.5 w-3.5 leading-none" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">{Math.round(avgCalories)}</span>
                <span className="text-xs text-slate-400 font-semibold">kcal</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px]">
                <span className="font-bold text-slate-400 uppercase tracking-widest">Target</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{plan.currentWeekCalorieTarget || plan.targetCalories}</span>
              </div>
            </div>
          </div>

          <div className="geometric-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Steps</span>
              <div className="p-1.5 rounded text-emerald-500 bg-emerald-50">
                <Footprints className="h-3.5 w-3.5 leading-none" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">{Math.round(avgSteps)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px]">
                <span className="font-bold text-slate-400 uppercase tracking-widest">Target</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{plan.currentWeekStepTarget || plan.targetSteps}</span>
              </div>
            </div>
          </div>

          <div className="geometric-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Training</span>
              <div className="p-1.5 rounded text-violet-500 bg-violet-50">
                <Dumbbell className="h-3.5 w-3.5 leading-none" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">{gymSessionsCount}</span>
                <span className="text-xs text-slate-400 font-semibold">sessions</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px]">
                <span className="font-bold text-slate-400 uppercase tracking-widest">Target</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{plan.targetGymDaysPerWeek}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="geometric-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight Trend</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Line type="monotone" dataKey="Weight" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="geometric-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600" />
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caloric Intake</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Bar name="Calories" dataKey="Calories" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
    </div>
  );
}

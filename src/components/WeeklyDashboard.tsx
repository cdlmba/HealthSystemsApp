import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { HealthLog } from '../types';
import { startOfWeek, addDays, parseISO, format } from 'date-fns';
import { Progress } from './ui/progress';
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
  BarChart3,
  PenTool,
  Coins,
  Sparkles,
  PhoneCall,
  TrendingUp,
  Target
} from 'lucide-react';

export default function WeeklyDashboard({ user }: { user: any }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    if (!user) return;

    if (user.isMock) {
      const storageKey = `twin_focus_logs_${user.uid}`;
      const loadLogs = () => {
        const savedLogs = localStorage.getItem(storageKey);
        if (savedLogs) {
          setLogs(JSON.parse(savedLogs));
        } else {
          const seedNotes = [
            "Fasted cardio felt explosive. Hit 620 words on the Reset manuscript. Clean 14-hour fast.",
            "Slight energy dip at 3 PM. Handled calls with coaching leads.",
            "Epic gym session. 780 words on Edge Strategy. Fully aligned.",
            "Poor sleep, late business dinner broke eating window. Zero margin today.",
            "Recovered sleep deficit. Hit leg day and client check-ins.",
            "Weekend family margin. Spiritual rhythm is deep.",
            "Weekly systems audit complete. Prepping for next sprint."
          ];
          const seedLogs = Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(currentWeekStart, i);
            const isThursday = i === 3;
            const isWeekend = i >= 5;
            const isGymDay = i === 0 || i === 2 || i === 4;

            return {
              date: format(day, 'yyyy-MM-dd'),
              userId: user.uid,
              weight: Number((isThursday ? 84.1 : 83.5 + (i * -0.08) + Math.random() * 0.2).toFixed(1)),
              sleepQuality: isThursday ? 6 : isWeekend ? 9 : 8,
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
          localStorage.setItem(storageKey, JSON.stringify(seedLogs));
          setLogs(seedLogs);
        }
      };

      loadLogs();

      // Listen for local changes to keep tabs synchronized in real-time
      const handleStorageChange = () => {
        loadLogs();
      };
      window.addEventListener('storage', handleStorageChange);
      const interval = setInterval(loadLogs, 1000);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }

    const q = query(
      collection(db, 'healthLogs'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => doc.data() as HealthLog));
    });
    return () => unsubscribe();
  }, [user, currentWeekStart]);

  const weekLogs = logs.filter(log => {
    const logDate = parseISO(log.date);
    return logDate >= currentWeekStart && logDate < addDays(currentWeekStart, 7);
  });

  const getAvg = (field: keyof HealthLog) => {
    const values = weekLogs.map(log => log[field]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getSum = (field: keyof HealthLog) => {
    return weekLogs.filter(log => log[field] === true).length;
  };

  const getNumberSum = (field: keyof HealthLog) => {
    const values = weekLogs.map(log => log[field]).filter(v => typeof v === 'number') as number[];
    return values.reduce((a, b) => a + b, 0);
  };

  // Compile daily trend data for charts
  const trendData = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(currentWeekStart, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = weekLogs.find(l => l.date === dateStr);
    
    // Compute normalized performance index for the day (0-100)
    let healthScore = 0;
    let marginScore = 0;

    if (log) {
      // Health Score components: Sleep (30%), Eating Window (30%), Chair Stand Ease (20%), Gym / Mobility (20%)
      const sleepTerm = (log.sleepQuality || 0) * 10; // scale 0-100
      const eatTerm = log.eatingWindowAdherence ? 100 : 0;
      const chairTerm = (log.chairStandEase || 0) * 10;
      const gymTerm = (log.gymCompleted || log.mobility) ? 100 : 0;
      healthScore = Math.round((sleepTerm * 0.3) + (eatTerm * 0.3) + (chairTerm * 0.2) + (gymTerm * 0.2));

      // Margin Reset Score components: Writing (30%), 80/10/10 check (30%), Spiritual (20%), Daily Calls (20%)
      const writingTerm = Math.min(((log.writingOutput || 0) / 500) * 100, 100);
      const financeTerm = log.finances801010 ? 100 : 0;
      const spiritTerm = log.spiritualRhythm ? 100 : 0;
      const callsTerm = Math.min(((log.dailyCalls || 0) / 2) * 100, 100);
      marginScore = Math.round((writingTerm * 0.3) + (financeTerm * 0.3) + (spiritTerm * 0.2) + (callsTerm * 0.2));
    }

    return {
      name: format(date, 'EEE'),
      'Sleep Quality': log?.sleepQuality || 0,
      'Energy Crashes': log?.energyCrashes || 0,
      'Writing Output (w)': log?.writingOutput || 0,
      'Relational Calls': log?.dailyCalls || 0,
      'Health Performance Index': healthScore,
      'MarginReset Index': marginScore,
    };
  });

  // Calculate high-level summary indicators
  const healthAdherence = Math.round(
    ((getSum('eatingWindowAdherence') + getSum('gymCompleted') + getSum('mobility')) / 21) * 100
  );
  
  const marginAdherence = Math.round(
    ((getSum('finances801010') + getSum('spiritualRhythm') + (weekLogs.filter(log => (log.writingOutput || 0) > 0).length)) / 21) * 100
  );

  const dashboardMetrics = [
    // Health Focus Metrics
    {
      label: 'Sleep Quality',
      value: getAvg('sleepQuality').toFixed(1),
      max: '10.0',
      target: '8.0+',
      icon: Moon,
      color: 'text-blue-500 bg-blue-50 border-blue-100',
      pillar: 'Health'
    },
    {
      label: 'Gym Session Count',
      value: `${getSum('gymCompleted')}`,
      max: '7',
      target: '3/wk',
      icon: Dumbbell,
      color: 'text-rose-500 bg-rose-50 border-rose-100',
      pillar: 'Health'
    },
    {
      label: 'Eating Window Adherence',
      value: `${((getSum('eatingWindowAdherence') / Math.max(weekLogs.length, 1)) * 100).toFixed(0)}%`,
      progress: (getSum('eatingWindowAdherence') / 7) * 100,
      target: '80%+',
      icon: Utensils,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
      pillar: 'Health'
    },
    {
      label: 'Chair Stand Ease',
      value: getAvg('chairStandEase').toFixed(1),
      max: '10.0',
      target: '8.0+',
      icon: Activity,
      color: 'text-teal-500 bg-teal-50 border-teal-100',
      pillar: 'Health'
    },
    // MarginReset Focus Metrics
    {
      label: 'Total Writing Output',
      value: `${getNumberSum('writingOutput')}`,
      target: '2,500w+',
      icon: PenTool,
      color: 'text-violet-500 bg-violet-50 border-violet-100',
      pillar: 'MarginReset'
    },
    {
      label: '80/10/10 Finances Check',
      value: `${getSum('finances801010')} / 7`,
      progress: (getSum('finances801010') / 7) * 100,
      target: '7/7 days',
      icon: Coins,
      color: 'text-amber-500 bg-amber-50 border-amber-100',
      pillar: 'MarginReset'
    },
    {
      label: 'Spiritual Rhythm Rate',
      value: `${((getSum('spiritualRhythm') / Math.max(weekLogs.length, 1)) * 100).toFixed(0)}%`,
      progress: (getSum('spiritualRhythm') / 7) * 100,
      target: '100%',
      icon: Sparkles,
      color: 'text-indigo-500 bg-indigo-50 border-indigo-100',
      pillar: 'MarginReset'
    },
    {
      label: 'Daily Relational Calls',
      value: `${getNumberSum('dailyCalls')}`,
      target: '7+ calls',
      icon: PhoneCall,
      color: 'text-cyan-500 bg-cyan-50 border-cyan-100',
      pillar: 'MarginReset'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Pillar High-Level Summary Status */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Health Command Center Card */}
        <div className="geometric-card p-6 border-l-4 border-l-emerald-600 bg-gradient-to-br from-white to-emerald-50/10 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pillar Status</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded">Active Protocol</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Health Focus</h3>
            <p className="text-xs text-slate-500 mt-1">Eating window, fasted training state, eggs meal baseline, sleep quality, and chair stand mobility.</p>
          </div>
          <div className="flex items-center gap-6 mt-2">
            <div className="flex flex-col">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{healthAdherence || 0}%</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Adherence Index</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span>SYSTEM VIABILITY</span>
                <span>TARGET: 85%</span>
              </div>
              <Progress value={healthAdherence} className="h-2 bg-slate-100" />
            </div>
          </div>
        </div>

        {/* MarginReset Command Center Card */}
        <div className="geometric-card p-6 border-l-4 border-l-violet-600 bg-gradient-to-br from-white to-violet-50/10 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pillar Status</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-100/50 px-2 py-0.5 rounded">Margin Reset</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">MarginReset Focus</h3>
            <p className="text-xs text-slate-500 mt-1">Writing metrics, 80/10/10 structural budgeting check, daily spiritual rhythms, and check-in calls.</p>
          </div>
          <div className="flex items-center gap-6 mt-2">
            <div className="flex flex-col">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{marginAdherence || 0}%</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Margin Index</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span>STRUCTURAL MARGIN</span>
                <span>TARGET: 90%</span>
              </div>
              <Progress value={marginAdherence} className="h-2 bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Health Metric Grid */}
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">Health Protocol Core Kpis</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardMetrics.filter(m => m.pillar === 'Health').map((metric) => (
            <div key={metric.label} className="geometric-card p-5 flex flex-col gap-3 hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">{metric.label}</span>
                <div className={`p-1.5 rounded ${metric.color}`}>
                  <metric.icon className="h-3.5 w-3.5 leading-none" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-800 tracking-tight">{metric.value}</span>
                  {metric.max && (
                    <span className="text-xs text-slate-400 font-semibold">/ {metric.max}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px]">
                  <span className="font-bold text-slate-400 uppercase tracking-widest">Protocol Target</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{metric.target}</span>
                </div>
              </div>
              {metric.progress !== undefined && (
                <Progress value={metric.progress} className="h-1 bg-slate-100" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MarginReset Metric Grid */}
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">Marginreset Core Kpis</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardMetrics.filter(m => m.pillar === 'MarginReset').map((metric) => (
            <div key={metric.label} className="geometric-card p-5 flex flex-col gap-3 hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">{metric.label}</span>
                <div className={`p-1.5 rounded ${metric.color}`}>
                  <metric.icon className="h-3.5 w-3.5 leading-none" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-800 tracking-tight">{metric.value}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px]">
                  <span className="font-bold text-slate-400 uppercase tracking-widest">Protocol Target</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{metric.target}</span>
                </div>
              </div>
              {metric.progress !== undefined && (
                <Progress value={metric.progress} className="h-1 bg-slate-100" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dual Analytics Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Graph 1: Sleep Quality vs Energy Crashes */}
        <div className="geometric-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sleep Quality vs. Energy Crashes</h3>
            </div>
            <div className="text-[9px] font-semibold text-slate-400 italic">Direct correlation analysis</div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingBottom: '20px' }} />
                <Bar name="Sleep Quality (1-10)" dataKey="Sleep Quality" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar name="Energy Crashes (0-3)" dataKey="Energy Crashes" fill="#f97316" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Graph 2: Twin Focus Indexes */}
        <div className="geometric-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Twin Focus System Coherence</h3>
            </div>
            <div className="text-[9px] font-semibold text-slate-400 italic">Daily Adherence Indexes</div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingBottom: '20px' }} />
                <Line name="Health Pillar Index (%)" type="monotone" dataKey="Health Performance Index" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line name="MarginReset Index (%)" type="monotone" dataKey="MarginReset Index" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sunday Accountability Summary Banner */}
      <div className="geometric-card p-8 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-emerald-500 w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Twin Focus Accountability System</h3>
          </div>
          <p className="text-xl font-light text-slate-200 max-w-lg leading-relaxed mt-2">
            Precision control protocol is <span className="font-semibold text-emerald-400">fully operational</span>. Maintain <span className="font-semibold text-white">writing margins</span> and defend the <span className="font-semibold text-white">14-hour fast</span>.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded font-extrabold text-xs uppercase tracking-widest transition-colors cursor-pointer shadow-xl shadow-slate-950/50 active:scale-95">
            Sunday Systems Audit
          </button>
        </div>
        {/* Decorative background shape */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-800/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-violet-800/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}

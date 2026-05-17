import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { HealthLog } from '../types';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';

const METRIC_GROUPS = [
  {
    category: 'Health Focus',
    metrics: [
      { id: 'weight', label: 'Morning Weight (kg)', type: 'number', aggregation: 'avg', target: 'Maintain / Monitor' },
      { id: 'sleepQuality', label: 'Sleep Quality (1-10)', type: 'number', aggregation: 'avg', target: '8+' },
      { id: 'wakeups', label: '# of Wake-ups', type: 'number', aggregation: 'avg', target: '< 2' },
      { id: 'energyCrashes', label: 'Energy Crashes (0-3)', type: 'number', aggregation: 'avg', target: '0' },
      { id: 'chairStandEase', label: 'Chair Stand Ease (1-10)', type: 'number', aggregation: 'avg', target: '8+' },
      { id: 'gymCompleted', label: 'Gym Session Completed', type: 'boolean', aggregation: 'sum', target: '3-4/wk' },
      { id: 'fastedGymEnergy', label: 'Fasted Gym Energy (1-10)', type: 'number', aggregation: 'avg', target: '7+' },
      { id: 'eatingWindowAdherence', label: '14/10 Eating Window (10h eat)', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'eggMeal', label: '9:30 AM Eggs Meal (80% full)', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'lunchProtein', label: 'Lunch Protein-First + Walk', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'dinnerTime', label: 'Dinner by 7:30 PM', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'postMealWalks', label: 'Post-Meal Walks Completed', type: 'number', aggregation: 'sum', target: '3/day' },
      { id: 'dailyProtein', label: 'Daily Protein Estimate (g)', type: 'number', aggregation: 'avg', target: '150g+' },
      { id: 'hydration', label: 'Hydration (glasses / 8+)', type: 'number', aggregation: 'avg', target: '8+' },
      { id: 'mobility', label: 'Mobility / Sit-to-Stands', type: 'boolean', aggregation: 'sum', target: 'Daily' },
    ]
  },
  {
    category: 'MarginReset Focus',
    metrics: [
      { id: 'writingOutput', label: 'Writing Output (words/mins)', type: 'number', aggregation: 'sum', target: '500w / 30m' },
      { id: 'finances801010', label: '80/10/10 Financial Rule', type: 'boolean', aggregation: 'sum', target: 'Weekly Check' },
      { id: 'spiritualRhythm', label: 'Spiritual Rhythm (quiet time)', type: 'boolean', aggregation: 'sum', target: 'Daily' },
      { id: 'dailyCalls', label: 'Daily Relational Calls', type: 'number', aggregation: 'sum', target: '1+ calls' }
    ]
  }
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
};

export default function HealthTrackingTable({ user }: { user: any }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday

  useEffect(() => {
    if (!user) return;

    if (user.isMock) {
      const storageKey = `twin_focus_logs_${user.uid}`;
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

    const q = query(
      collection(db, 'healthLogs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthLog));
      setLogs(logsData);
    });

    return () => unsubscribe();
  }, [user, currentWeekStart]);

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const getLogForDay = (date: Date) => {
    return logs.find(log => isSameDay(parseISO(log.date), date));
  };

  const updateLog = async (date: Date, field: string, value: any) => {
    if (!user) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLog = getLogForDay(date);
    const docId = existingLog?.id || `${user.uid}_${dateStr}`;

    const updatedData = {
      ...existingLog,
      [field]: value,
      date: dateStr,
      userId: user.uid,
    };

    if (user.isMock) {
      const storageKey = `twin_focus_logs_${user.uid}`;
      const savedLogs = localStorage.getItem(storageKey);
      let updatedLogsList: HealthLog[] = savedLogs ? JSON.parse(savedLogs) : [];
      
      const logIdx = updatedLogsList.findIndex(l => l.date === dateStr);
      if (logIdx >= 0) {
        updatedLogsList[logIdx] = { ...updatedLogsList[logIdx], ...updatedData };
      } else {
        updatedLogsList.push(updatedData);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(updatedLogsList));
      setLogs(updatedLogsList);
      return;
    }

    await setDoc(doc(db, 'healthLogs', docId), updatedData, { merge: true });
  };

  const calculateAggregation = (metricId: string, aggregation: string) => {
    const weekLogs = days.map(d => getLogForDay(d)).filter(Boolean) as HealthLog[];
    if (weekLogs.length === 0) return '-';

    const values = weekLogs.map(log => (log as any)[metricId]).filter(v => v !== undefined && v !== null);
    if (values.length === 0) return '-';

    if (aggregation === 'avg') {
      const sum = values.reduce((a, b) => a + Number(b), 0);
      return (sum / values.length).toFixed(1);
    } else if (aggregation === 'sum') {
      return values.reduce((a, b) => a + (typeof b === 'boolean' ? (b ? 1 : 0) : Number(b)), 0);
    }
    return '-';
  };

  return (
    <div className="geometric-card flex flex-col h-full shadow-lg border-slate-200">
      {/* Grid Header */}
      <div className="grid grid-cols-[280px_repeat(7,1fr)_120px] grid-header border-b border-slate-200 sticky top-0 z-10">
        <div className="p-3 border-r border-slate-200 flex items-center">System Target Protocol</div>
        {days.map((day, idx) => (
          <div key={day.toISOString()} className={`p-3 text-center border-r border-slate-200 ${idx === 6 ? 'text-rose-700 bg-rose-50/50' : ''}`}>
            <span className="font-bold">{format(day, 'EEE')}</span>
            <div className="text-[9px] font-medium opacity-70 mt-0.5">{format(day, 'MMM d')}</div>
          </div>
        ))}
        <div className="p-3 text-center bg-emerald-100/70 text-emerald-950 font-bold flex items-center justify-center">Weekly Run</div>
      </div>

      {/* Metric Rows Grouped */}
      <div className="flex-1 flex flex-col divide-y divide-slate-100 text-sm overflow-y-auto">
        {METRIC_GROUPS.map((group) => (
          <React.Fragment key={group.category}>
            {/* Group Category Divider */}
            <div className="bg-slate-50 px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-slate-600 border-y border-slate-200 flex justify-between items-center sticky top-0 z-1 bg-gradient-to-r from-slate-100 to-slate-50">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-emerald-600 rounded-full"></span>
                {group.category}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 normal-case">Measure → Adjust → Improve</span>
            </div>

            {group.metrics.map((metric) => (
              <div key={metric.id} className="grid grid-cols-[280px_repeat(7,1fr)_120px] items-stretch min-h-[46px] hover:bg-slate-50/30 transition-colors">
                <div className="px-4 py-2 font-medium text-slate-600 flex flex-col justify-center border-r border-slate-100">
                  <span className="text-slate-800 font-semibold text-xs leading-tight">{metric.label}</span>
                  <span className="text-[9px] font-normal text-slate-400 mt-0.5">Target: {metric.target}</span>
                </div>
                {days.map(day => {
                  const log = getLogForDay(day);
                  const val = log ? (log as any)[metric.id] : undefined;

                  return (
                    <div key={day.toISOString()} className="flex justify-center items-center border-r border-slate-100 relative group">
                      {metric.type === 'boolean' ? (
                        <Checkbox
                          checked={val || false}
                          onCheckedChange={(checked) => updateLog(day, metric.id, checked)}
                          className={`h-5 w-5 transition-all ${
                            val 
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm shadow-emerald-500/20' 
                              : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                          }`}
                        />
                      ) : (
                        <input
                          type="number"
                          value={val !== undefined && val !== null ? val : ''}
                          placeholder="–"
                          className={`w-full h-full text-center transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${
                            metric.id.includes('Quality') || metric.id.includes('Ease') || metric.id.includes('Energy')
                              ? val >= 8 ? 'bg-emerald-50/60 text-emerald-700 font-semibold' 
                                : val <= 4 && val !== null && val !== undefined ? 'bg-amber-50 text-amber-700' 
                                : 'bg-transparent text-slate-600'
                              : 'bg-transparent text-slate-600'
                          }`}
                          onChange={(e) => updateLog(day, metric.id, e.target.value === '' ? null : Number(e.target.value))}
                        />
                      )}
                    </div>
                  );
                })}
                <div className="text-center font-bold bg-slate-50/50 flex items-center justify-center text-slate-700 border-l border-slate-100">
                  {calculateAggregation(metric.id, metric.aggregation)}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Daily Notes Section */}
      <div className="h-44 bg-slate-50/50 border-t border-slate-200 flex flex-col divide-y divide-slate-200">
        <div className="px-4 py-2 bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between items-center">
          <span>Daily Performance Notes & System Exceptions</span>
          <span className="text-[9px] font-normal normal-case italic text-slate-400">Add context to metric spikes or crashes</span>
        </div>
        <div className="flex-1 grid grid-cols-[280px_repeat(7,1fr)_120px] divide-x divide-slate-100">
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
                  onChange={(e) => updateLog(day, 'notes', e.target.value)}
                />
              </div>
            );
          })}
          <div className="bg-slate-100/10" />
        </div>
      </div>
    </div>
  );
}

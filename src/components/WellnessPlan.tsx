import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WellnessPlan as WellnessPlanType, DayOfWeek } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Moon, Dumbbell, UtensilsCrossed, Footprints, Save,
  CheckCircle2, Clock, Target, Settings2, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_PLAN: Omit<WellnessPlanType, 'id' | 'userId' | 'updatedAt'> = {
  targetBedtime: '22:30',
  targetWakeTime: '06:00',
  workoutSplit: {
    Mon: 'Upper Body',
    Tue: 'Rest',
    Wed: 'Lower Body',
    Thu: 'Rest',
    Fri: 'Cardio / Full Body',
    Sat: 'Rest',
    Sun: 'Rest',
  },
  targetGymDaysPerWeek: 3,
  targetCalories: 2000,
  targetProtein: 160,
  targetFat: 80,
  targetNetCarbs: 50,
  eatingWindowStart: '09:30',
  eatingWindowEnd: '19:30',
  targetSteps: 8000,
  targetActiveMinutes: 30,
  notes: '',
};

function calcSleepDuration(bedtime: string, wakeTime: string): string {
  if (!bedtime || !wakeTime) return '—';
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
}

function Section({ title, icon: Icon, color, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="geometric-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <span className="font-extrabold text-slate-800 tracking-tight">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 font-medium -mt-1">{hint}</p>}
      {children}
    </div>
  );
}

export default function WellnessPlan({ user }: { user: any }) {
  const [plan, setPlan] = useState<Omit<WellnessPlanType, 'id' | 'userId' | 'updatedAt'>>(DEFAULT_PLAN);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing plan
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (user.isMock) {
        const raw = localStorage.getItem(`twin_focus_wellness_plan_${user.uid}`);
        if (raw) setPlan(JSON.parse(raw));
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'wellnessPlans', user.uid));
        if (snap.exists()) {
          const data = snap.data() as WellnessPlanType;
          const { id, userId, updatedAt, ...rest } = data;
          setPlan(rest);
        }
      } catch (e) { /* use defaults */ }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const full: WellnessPlanType = {
      ...plan,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    };
    if (user.isMock) {
      localStorage.setItem(`twin_focus_wellness_plan_${user.uid}`, JSON.stringify(plan));
    } else {
      await setDoc(doc(db, 'wellnessPlans', user.uid), full, { merge: true });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setField = <K extends keyof typeof plan>(key: K, value: (typeof plan)[K]) => {
    setPlan(prev => ({ ...prev, [key]: value }));
  };

  const setWorkoutDay = (day: DayOfWeek, value: string) => {
    setPlan(prev => ({
      ...prev,
      workoutSplit: { ...prev.workoutSplit, [day]: value },
    }));
  };

  const sleepDuration = calcSleepDuration(plan.targetBedtime, plan.targetWakeTime);
  const eatingWindowHours = calcSleepDuration(plan.eatingWindowStart, plan.eatingWindowEnd);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm font-medium gap-2">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
        Loading your wellness plan…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4 text-white relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
            <Settings2 className="w-3 h-3" /> Personal Protocol Configuration
          </div>
          <h2 className="text-lg font-bold tracking-tight">Wellness Plan</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-lg">
            Define your targets. The app scores every logged day against this protocol.
          </p>
        </div>
        <Button
          onClick={handleSave}
          className={`shrink-0 relative z-10 font-extrabold uppercase tracking-wider text-xs h-10 px-5 gap-2 transition-all ${
            saved
              ? 'bg-emerald-500 text-white border-0'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-0'
          }`}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Plan</>
          )}
        </Button>
      </div>

      {/* 🌙 Sleep Protocol */}
      <Section title="Sleep Protocol" icon={Moon} color="bg-blue-100 text-blue-600" defaultOpen>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Target Bedtime" hint="When you aim to be asleep">
            <input
              type="time"
              value={plan.targetBedtime}
              onChange={e => setField('targetBedtime', e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition font-mono"
            />
          </Field>
          <Field label="Target Wake Time" hint="Your ideal wake-up time">
            <input
              type="time"
              value={plan.targetWakeTime}
              onChange={e => setField('targetWakeTime', e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition font-mono"
            />
          </Field>
          <Field label="Target Sleep Duration" hint="Auto-calculated">
            <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-sm font-bold text-blue-700 gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              {sleepDuration}
            </div>
          </Field>
        </div>
      </Section>

      {/* 🏋️ Workout Split */}
      <Section title="Workout Split" icon={Dumbbell} color="bg-rose-100 text-rose-600" defaultOpen>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Target Gym Days / Week">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0} max={7}
                value={plan.targetGymDaysPerWeek}
                onChange={e => setField('targetGymDaysPerWeek', Number(e.target.value))}
                className="w-20 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition text-center font-bold"
              />
              <span className="text-xs text-slate-500 font-medium">days per week</span>
            </div>
          </Field>
        </div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Daily Split Plan</p>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(day => (
            <div key={day} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-center text-slate-500">{day}</span>
              <input
                type="text"
                value={plan.workoutSplit[day] || ''}
                onChange={e => setWorkoutDay(day, e.target.value)}
                placeholder="Rest"
                className="h-20 w-full text-center text-[11px] font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition resize-none bg-white text-slate-700 p-1"
                style={{ writingMode: 'horizontal-tb' }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 🥩 Nutrition Targets */}
      <Section title="Nutrition Targets" icon={UtensilsCrossed} color="bg-emerald-100 text-emerald-600" defaultOpen>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Eating Window Start" hint="First meal time (e.g. 9:30 AM eggs)">
            <input
              type="time"
              value={plan.eatingWindowStart}
              onChange={e => setField('eatingWindowStart', e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition font-mono"
            />
          </Field>
          <Field label="Eating Window End" hint="Last meal cutoff">
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={plan.eatingWindowEnd}
                onChange={e => setField('eatingWindowEnd', e.target.value)}
                className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition font-mono"
              />
              <div className="h-10 px-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center text-xs font-bold text-emerald-700 whitespace-nowrap gap-1">
                <Clock className="w-3.5 h-3.5" /> {eatingWindowHours} window
              </div>
            </div>
          </Field>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { key: 'targetCalories', label: 'Daily Calories', unit: 'kcal', color: 'orange' },
            { key: 'targetProtein', label: 'Protein Target', unit: 'g / day', color: 'blue' },
            { key: 'targetFat', label: 'Fat Target', unit: 'g / day', color: 'amber' },
            { key: 'targetNetCarbs', label: 'Net Carbs Target', unit: 'g / day', color: 'emerald' },
          ].map(({ key, label, unit, color }) => (
            <Field key={key} label={label} hint={unit}>
              <input
                type="number"
                min={0}
                value={(plan as any)[key]}
                onChange={e => setField(key as any, Number(e.target.value))}
                className={`h-10 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition font-bold text-center border-slate-200 focus:ring-${color}-400/30 focus:border-${color}-400`}
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* 🚶 Activity Targets */}
      <Section title="Activity Targets" icon={Footprints} color="bg-teal-100 text-teal-600" defaultOpen>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Daily Step Goal" hint="Target steps per day">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0} step={500}
                value={plan.targetSteps}
                onChange={e => setField('targetSteps', Number(e.target.value))}
                className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition font-bold"
              />
              <span className="text-xs text-slate-500 font-medium shrink-0">steps</span>
            </div>
          </Field>
          <Field label="Active Minutes Goal" hint="Minutes of intentional movement">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0} step={5}
                value={plan.targetActiveMinutes}
                onChange={e => setField('targetActiveMinutes', Number(e.target.value))}
                className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition font-bold"
              />
              <span className="text-xs text-slate-500 font-medium shrink-0">min / day</span>
            </div>
          </Field>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Protocol Notes" icon={Target} color="bg-violet-100 text-violet-600" defaultOpen={false}>
        <textarea
          value={plan.notes}
          onChange={e => setField('notes', e.target.value)}
          placeholder="Additional context, reminders, or protocol amendments…"
          rows={4}
          className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition resize-none text-slate-700 placeholder:text-slate-300"
        />
      </Section>

      {/* Save Footer */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          className={`font-extrabold uppercase tracking-wider text-xs h-11 px-8 gap-2 transition-all shadow-lg ${
            saved
              ? 'bg-emerald-500 text-white border-0 shadow-emerald-200'
              : 'bg-slate-900 hover:bg-slate-800 text-white border-0'
          }`}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Plan Saved!</> : <><Save className="w-4 h-4" /> Save Wellness Plan</>}
        </Button>
      </div>
    </div>
  );
}

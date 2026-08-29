import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WellnessPlan as WellnessPlanType, DayOfWeek } from '../types';
import { Button } from './ui/button';
import {
  Moon, Dumbbell, UtensilsCrossed, Footprints, Save,
  CheckCircle2, Clock, Target, Settings2, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TSD = {
  forest:    '#013220',
  forestMid: '#234f3b',
  moss:      '#717973',
  gold:      '#D4A017',
  goldBg:    '#FFF9E6',
  cream:     '#F8F4EF',
  surface:   '#FDF9F4',
  surfaceDim:'#EDE9E3',
};

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

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="tsd-card">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: TSD.goldBg }}>
            <Icon className="w-4.5 h-4.5" style={{ color: '#795900' }} />
          </div>
          <span className="tsd-serif text-lg font-semibold" style={{ color: TSD.forest }}>{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: TSD.moss }} /> : <ChevronDown className="w-4 h-4" style={{ color: TSD.moss }} />}
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
            <div className="px-5 pb-5 pt-2" style={{ borderTop: `1px solid ${TSD.surfaceDim}` }}>
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
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TSD.forestMid }}>{label}</label>
      {hint && <p className="text-[10px] font-medium -mt-1" style={{ color: TSD.moss }}>{hint}</p>}
      {children}
    </div>
  );
}

const inputClass = `h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-medium w-full`;
const inputStyle = {
  border: `1px solid ${TSD.surfaceDim}`,
  background: '#fff',
  color: TSD.forest
};

export default function WellnessPlan({ user }: { user: any }) {
  const [plan, setPlan] = useState<Omit<WellnessPlanType, 'id' | 'userId' | 'updatedAt'>>(DEFAULT_PLAN);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center py-20 text-sm font-medium gap-2" style={{ color: TSD.moss }}>
        Loading your wellness plan…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
        style={{ background: TSD.forest }}
      >
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: `${TSD.gold}18` }} />
        <div className="relative z-10 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <Settings2 className="w-3 h-3" style={{ color: TSD.goldLight }} />
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TSD.goldLight }}>
              Personal Protocol Configuration
            </span>
          </div>
          <h2 className="tsd-serif text-xl font-semibold text-white">Wellness Plan</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Define your targets. The app scores every logged day against this protocol.
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="shrink-0 relative z-10 font-semibold uppercase tracking-wider text-xs h-10 px-5 gap-2 transition-all w-full sm:w-auto"
          style={{
            background: saved ? TSD.forestMid : TSD.gold,
            color: saved ? '#fff' : '#795900',
            borderRadius: '10px'
          }}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Plan</>
          )}
        </Button>
      </div>

      {/* 🌙 Sleep Protocol */}
      <Section title="Sleep Protocol" icon={Moon} defaultOpen>
        <div className="grid sm:grid-cols-3 gap-6 pt-2">
          <Field label="Target Bedtime" hint="When you aim to be asleep">
            <input
              type="time"
              value={plan.targetBedtime}
              onChange={e => setField('targetBedtime', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </Field>
          <Field label="Target Wake Time" hint="Your ideal wake-up time">
            <input
              type="time"
              value={plan.targetWakeTime}
              onChange={e => setField('targetWakeTime', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </Field>
          <Field label="Target Sleep Duration" hint="Auto-calculated">
            <div className="h-10 px-3 rounded-lg flex items-center text-sm font-semibold gap-2"
              style={{ background: TSD.surface, border: `1px solid ${TSD.surfaceDim}`, color: TSD.forest }}
            >
              <Clock className="w-4 h-4" style={{ color: TSD.gold }} />
              {sleepDuration}
            </div>
          </Field>
        </div>
      </Section>

      {/* 🏋️ Workout Split */}
      <Section title="Workout Split" icon={Dumbbell} defaultOpen>
        <div className="grid sm:grid-cols-2 gap-6 pt-2 mb-6">
          <Field label="Target Gym Days / Week">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0} max={7}
                value={plan.targetGymDaysPerWeek}
                onChange={e => setField('targetGymDaysPerWeek', Number(e.target.value))}
                className="w-20 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition text-center font-bold"
                style={inputStyle}
              />
              <span className="text-xs font-medium" style={{ color: TSD.moss }}>days per week</span>
            </div>
          </Field>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: TSD.forestMid }}>Daily Split Plan</p>
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
          {DAYS.map(day => (
            <div key={day} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-center" style={{ color: TSD.moss }}>{day}</span>
              <input
                type="text"
                value={plan.workoutSplit[day] || ''}
                onChange={e => setWorkoutDay(day, e.target.value)}
                placeholder="Rest"
                className="h-14 sm:h-20 w-full text-center text-xs font-medium rounded-lg focus:outline-none focus:ring-2 transition bg-white p-1"
                style={{ ...inputStyle, border: `1px solid ${plan.workoutSplit[day] && plan.workoutSplit[day] !== 'Rest' ? TSD.gold : TSD.surfaceDim}` }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 🥩 Nutrition Targets */}
      <Section title="Nutrition Targets" icon={UtensilsCrossed} defaultOpen>
        <div className="grid sm:grid-cols-2 gap-6 pt-2 mb-6">
          <Field label="Eating Window Start" hint="First meal time (e.g. 9:30 AM eggs)">
            <input
              type="time"
              value={plan.eatingWindowStart}
              onChange={e => setField('eatingWindowStart', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </Field>
          <Field label="Eating Window End" hint="Last meal cutoff">
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={plan.eatingWindowEnd}
                onChange={e => setField('eatingWindowEnd', e.target.value)}
                className={`w-32 ${inputClass} font-mono`}
                style={inputStyle}
              />
              <div className="h-10 px-3 rounded-lg flex items-center text-xs font-semibold whitespace-nowrap gap-1.5"
                style={{ background: TSD.surface, border: `1px solid ${TSD.surfaceDim}`, color: TSD.forest }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: TSD.moss }} /> {eatingWindowHours} window
              </div>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { key: 'targetCalories', label: 'Calories', unit: 'kcal' },
            { key: 'targetProtein',  label: 'Protein',  unit: 'g' },
            { key: 'targetFat',      label: 'Fat',      unit: 'g' },
            { key: 'targetNetCarbs', label: 'Net Carbs',unit: 'g' },
          ].map(({ key, label, unit }) => (
            <Field key={key} label={label} hint={unit}>
              <input
                type="number"
                min={0}
                value={(plan as any)[key]}
                onChange={e => setField(key as any, Number(e.target.value))}
                className="h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-bold text-center"
                style={inputStyle}
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* 🚶 Activity Targets */}
      <Section title="Activity Targets" icon={Footprints} defaultOpen>
        <div className="grid sm:grid-cols-2 gap-6 pt-2">
          <Field label="Daily Step Goal" hint="Target steps per day">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0} step={500}
                value={plan.targetSteps}
                onChange={e => setField('targetSteps', Number(e.target.value))}
                className="w-28 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-bold"
                style={inputStyle}
              />
              <span className="text-xs font-medium shrink-0" style={{ color: TSD.moss }}>steps</span>
            </div>
          </Field>
          <Field label="Active Minutes Goal" hint="Minutes of intentional movement">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0} step={5}
                value={plan.targetActiveMinutes}
                onChange={e => setField('targetActiveMinutes', Number(e.target.value))}
                className="w-28 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-bold"
                style={inputStyle}
              />
              <span className="text-xs font-medium shrink-0" style={{ color: TSD.moss }}>min / day</span>
            </div>
          </Field>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Protocol Notes" icon={Target} defaultOpen={false}>
        <div className="pt-2">
          <textarea
            value={plan.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Additional context, reminders, or protocol amendments…"
            rows={4}
            className="w-full text-sm rounded-lg p-3 focus:outline-none focus:ring-2 transition resize-none"
            style={inputStyle}
          />
        </div>
      </Section>

      {/* Save Footer */}
      <div className="flex justify-end pb-8 pt-4">
        <Button
          onClick={handleSave}
          className="font-semibold uppercase tracking-wider text-xs h-11 px-8 gap-2 transition-all shadow-md"
          style={{
            background: saved ? TSD.forestMid : TSD.gold,
            color: saved ? '#fff' : '#795900',
            borderRadius: '10px'
          }}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Plan Saved!</> : <><Save className="w-4 h-4" /> Save Wellness Plan</>}
        </Button>
      </div>
    </div>
  );
}

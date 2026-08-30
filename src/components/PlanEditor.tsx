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
    Fri: 'Upper Body',
    Sat: 'Lower Body',
    Sun: 'Rest',
  },
  targetGymDaysPerWeek: 4,
  targetCalories: 2400,
  targetProtein: 180,
  targetFat: 80,
  targetNetCarbs: 240,
  eatingWindowStart: '09:00',
  eatingWindowEnd: '20:00',
  targetSteps: 10000,
  targetActiveMinutes: 30,
  notes: '',
  phase: 'cut',
  weeklyRateTarget: -1.0,
  heightInches: '' as any as number,
  estimatedBodyFat: '' as any as number,
  bodyWeightLbs: '' as any as number,
  zone2DaysPerWeek: 2,
  restTimerSeconds: 120,
  currentWeekCalorieTarget: 2400,
  currentWeekStepTarget: 10000,
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
        className="w-full flex items-center justify-between p-5 transition-colors" style={{ '--tw-hover-bg': 'var(--tsd-surface-dim)' } as React.CSSProperties} onMouseEnter={e => (e.currentTarget.style.background = 'var(--tsd-surface-dim)')} onMouseLeave={e => (e.currentTarget.style.background = '')}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode; key?: React.Key }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TSD.forestMid }}>{label}</label>
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

export default function PlanEditor({ user }: { user: any }) {
  const [plan, setPlan] = useState<Omit<WellnessPlanType, 'id' | 'userId' | 'updatedAt'>>(DEFAULT_PLAN);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (user.isMock) {
        const raw = localStorage.getItem(`dean_tracker_wellness_plan_${user.uid}`);
        if (raw) setPlan({ ...DEFAULT_PLAN, ...JSON.parse(raw) });
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'wellnessPlans', user.uid));
        if (snap.exists()) {
          const data = snap.data() as WellnessPlanType;
          const { id, userId, updatedAt, ...rest } = data;
          setPlan({ ...DEFAULT_PLAN, ...rest });
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
      localStorage.setItem(`dean_tracker_wellness_plan_${user.uid}`, JSON.stringify(plan));
    } else {
      await setDoc(doc(db, 'wellnessPlans', user.uid), full, { merge: true });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAutoEstimateBF = () => {
    if (!plan.bodyWeightLbs || !plan.heightInches) return;
    const bmi = (plan.bodyWeightLbs / (plan.heightInches * plan.heightInches)) * 703;
    const estimatedBf = (1.20 * bmi) - 9.3;
    setField('estimatedBodyFat', Math.max(0, Math.round(estimatedBf * 10) / 10));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm font-medium gap-2" style={{ color: TSD.moss }}>
        Loading your protocol…
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
            <Settings2 className="w-3 h-3" style={{ color: TSD.gold }} />
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TSD.gold }}>
              Personal Protocol Configuration
            </span>
          </div>
          <h2 className="tsd-serif text-xl font-semibold text-white">Dean Tracker Plan</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Define your targets. The recommendation engine uses these to steer your week.
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

      {/* 👤 Body & Phase Profile */}
      <Section title="Body & Phase Profile" icon={Target} defaultOpen>
        <div className="grid sm:grid-cols-2 gap-6 pt-2 mb-6">
          <Field label="Current Phase" hint="Determines target directions">
            <select
              value={plan.phase}
              onChange={e => setField('phase', e.target.value as any)}
              className={`${inputClass}`}
              style={inputStyle}
            >
              <option value="cut">Fat Loss (Cut)</option>
              <option value="maintain">Maintenance</option>
              <option value="bulk">Muscle Gain (Bulk)</option>
            </select>
          </Field>
          <Field label="Weekly Rate Target" hint="% body weight per week">
            <div className="flex items-center gap-3">
              <input
                type="number" step="0.1"
                value={plan.weeklyRateTarget}
                onChange={e => setField('weeklyRateTarget', Number(e.target.value))}
                className="w-24 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition text-center font-bold"
                style={inputStyle}
              />
              <span className="text-xs font-medium" style={{ color: TSD.moss }}>% / week</span>
            </div>
          </Field>
          <Field label="Baseline Body Weight" hint="Initial weight (lbs)">
            <input
              type="number" step="0.1"
              value={plan.bodyWeightLbs}
              onChange={e => setField('bodyWeightLbs', Number(e.target.value))}
              className={`${inputClass}`}
              style={inputStyle}
              placeholder="e.g. 195"
            />
          </Field>
          <Field label="Height (Inches)" hint="Total height in inches">
            <input
              type="number" step="1"
              value={plan.heightInches}
              onChange={e => setField('heightInches', Number(e.target.value))}
              className={`${inputClass}`}
              style={inputStyle}
              placeholder="e.g. 70"
            />
          </Field>
          <Field label="Baseline Body Fat %" hint="Estimated BF %">
            <div className="flex flex-col xl:flex-row gap-2">
              <input
                type="number" step="0.1"
                value={plan.estimatedBodyFat}
                onChange={e => setField('estimatedBodyFat', Number(e.target.value))}
                className={`${inputClass} flex-1`}
                style={inputStyle}
                placeholder="e.g. 18"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoEstimateBF}
                className="h-10 text-[9px] uppercase tracking-wider font-bold shrink-0"
                style={{ color: TSD.forest }}
              >
                Auto-Calc
              </Button>
            </div>
          </Field>
        </div>
      </Section>

      {/* 🥩 Nutrition Targets */}
      <Section title="Nutrition Targets" icon={UtensilsCrossed} defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
          {[
            { key: 'targetCalories', label: 'Base Calories', unit: 'kcal' },
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

      {/* 🏋️ Workout Split & Training */}
      <Section title="Training & Split" icon={Dumbbell} defaultOpen>
        <div className="grid sm:grid-cols-3 gap-6 pt-2 mb-6">
          <Field label="Target Gym Days">
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} max={7}
                value={plan.targetGymDaysPerWeek}
                onChange={e => setField('targetGymDaysPerWeek', Number(e.target.value))}
                className="w-20 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition text-center font-bold"
                style={inputStyle}
              />
              <span className="text-xs font-medium" style={{ color: TSD.moss }}>/ week</span>
            </div>
          </Field>
          <Field label="Zone 2 Days">
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} max={7}
                value={plan.zone2DaysPerWeek}
                onChange={e => setField('zone2DaysPerWeek', Number(e.target.value))}
                className="w-20 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition text-center font-bold"
                style={inputStyle}
              />
              <span className="text-xs font-medium" style={{ color: TSD.moss }}>/ week</span>
            </div>
          </Field>
          <Field label="Rest Timer">
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} step={30}
                value={plan.restTimerSeconds}
                onChange={e => setField('restTimerSeconds', Number(e.target.value))}
                className="w-20 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition text-center font-bold"
                style={inputStyle}
              />
              <span className="text-xs font-medium" style={{ color: TSD.moss }}>seconds</span>
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

      {/* 🚶 Activity & Recovery */}
      <Section title="Activity & Recovery" icon={Moon} defaultOpen>
        <div className="grid sm:grid-cols-3 gap-6 pt-2">
          <Field label="Daily Step Goal" hint="Target steps per day">
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} step={500}
                value={plan.targetSteps}
                onChange={e => setField('targetSteps', Number(e.target.value))}
                className="w-28 h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-bold"
                style={inputStyle}
              />
            </div>
          </Field>
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

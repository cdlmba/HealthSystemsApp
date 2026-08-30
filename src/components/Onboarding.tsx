import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WellnessPlan } from '../types';
import { generatePlan } from '../lib/planGenerator';
import { Button } from './ui/button';
import { Target, Activity, Dumbbell, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingProps {
  user: any;
  onComplete: (plan: Partial<WellnessPlan>) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [weight, setWeight] = useState(185);
  const [bodyFat, setBodyFat] = useState(18);
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'active' | 'very_active'>('light');
  const [phase, setPhase] = useState<'cut' | 'maintain' | 'bulk'>('cut');

  const generatedPlan = generatePlan('male', 30, weight, bodyFat, activity, phase);

  const handleSave = async () => {
    setLoading(true);
    const fullPlan = {
      ...generatedPlan,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    };
    
    if (user.isMock) {
      localStorage.setItem(`dean_tracker_wellness_plan_${user.uid}`, JSON.stringify(fullPlan));
    } else {
      await setDoc(doc(db, 'wellnessPlans', user.uid), fullPlan, { merge: true });
    }
    
    onComplete(fullPlan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--tsd-cream)' }}>
      <div className="max-w-md w-full tsd-card p-8 relative overflow-hidden">
        <h2 className="tsd-serif text-2xl font-semibold mb-2" style={{ color: 'var(--tsd-forest)' }}>
          Initialize Protocol
        </h2>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--tsd-moss)' }}>
          Let's establish your baseline targets.
        </p>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tsd-forestMid)' }}>Body Weight (lbs)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(Number(e.target.value))}
                    className="h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-medium w-full"
                    style={{ border: '1px solid var(--tsd-surface-dim)', color: 'var(--tsd-forest)' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tsd-forestMid)' }}>Estimated Body Fat %</label>
                  <input
                    type="number"
                    value={bodyFat}
                    onChange={e => setBodyFat(Number(e.target.value))}
                    className="h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-medium w-full"
                    style={{ border: '1px solid var(--tsd-surface-dim)', color: 'var(--tsd-forest)' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tsd-forestMid)' }}>Daily Activity Level (excluding workouts)</label>
                  <select
                    value={activity}
                    onChange={e => setActivity(e.target.value as any)}
                    className="h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 transition font-medium w-full"
                    style={{ border: '1px solid var(--tsd-surface-dim)', color: 'var(--tsd-forest)' }}
                  >
                    <option value="sedentary">Sedentary (Desk Job)</option>
                    <option value="light">Lightly Active (Walking 5k+ steps)</option>
                    <option value="active">Active (On feet all day)</option>
                    <option value="very_active">Very Active (Manual Labor)</option>
                  </select>
                </div>
                <Button onClick={() => setStep(2)} className="mt-4 w-full" style={{ background: 'var(--tsd-forest)', color: '#fff' }}>
                  Next Step
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tsd-forestMid)' }}>Select Your Goal</label>
                  
                  {[
                    { val: 'cut', label: 'Fat Loss (Cut)', desc: 'Caloric deficit, preserve muscle.' },
                    { val: 'maintain', label: 'Maintenance', desc: 'Hold current composition.' },
                    { val: 'bulk', label: 'Muscle Gain (Bulk)', desc: 'Slight surplus, maximize growth.' }
                  ].map(p => (
                    <button
                      key={p.val}
                      onClick={() => setPhase(p.val as any)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${phase === p.val ? 'border-[#013220] bg-white' : 'border-transparent bg-[#FDF9F4]'}`}
                    >
                      <div className="font-semibold text-sm" style={{ color: 'var(--tsd-forest)' }}>{p.label}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--tsd-moss)' }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-1" style={{ background: 'var(--tsd-forest)', color: '#fff' }}>Generate Plan</Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg" style={{ background: 'var(--tsd-gold-bg)' }}>
                    <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--tsd-forestMid)' }}>Daily Calories</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--tsd-forest)' }}>{generatedPlan.targetCalories}</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'var(--tsd-gold-bg)' }}>
                    <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--tsd-forestMid)' }}>Daily Protein</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--tsd-forest)' }}>{generatedPlan.targetProtein}g</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'var(--tsd-gold-bg)' }}>
                    <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--tsd-forestMid)' }}>Training Split</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--tsd-forest)' }}>{generatedPlan.targetGymDaysPerWeek} Days</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'var(--tsd-gold-bg)' }}>
                    <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--tsd-forestMid)' }}>Zone 2 Cardio</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--tsd-forest)' }}>{generatedPlan.zone2DaysPerWeek} Days</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={loading}>Back</Button>
                  <Button onClick={handleSave} disabled={loading} className="flex-1" style={{ background: 'var(--tsd-forest)', color: '#fff' }}>
                    {loading ? 'Saving...' : 'Accept Protocol'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

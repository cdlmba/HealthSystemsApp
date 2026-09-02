import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, Check } from 'lucide-react';
import { Button } from './ui/button';

interface QuickLogData {
  morningWeight?: number;
  sleepQuality?: number;
  gymCompleted?: boolean;
  stepCount?: number;
  waterOz?: number;
  stressLevel?: number;
}

interface QuickLogModalProps {
  mode: 'morning' | 'evening';
  onClose: () => void;
  onSave: (data: QuickLogData) => void;
}

const MORNING_STEPS = [
  {
    id: 'morningWeight',
    label: 'Morning Weight',
    sub: 'Step on scale first thing, before eating',
    unit: 'lbs',
    type: 'number',
    inputMode: 'decimal' as const,
    min: 50, max: 500, step: 0.1,
  },
  {
    id: 'sleepQuality',
    label: 'Sleep Quality',
    sub: 'How did you sleep? (1 = terrible, 10 = perfect)',
    type: 'scale',
    max: 10,
  },
  {
    id: 'gymCompleted',
    label: 'Workout Planned Today?',
    sub: 'Did you hit the gym / will you today?',
    type: 'boolean',
  },
];

const EVENING_STEPS = [
  {
    id: 'stepCount',
    label: "Today's Steps",
    sub: 'Total steps from your phone or watch',
    unit: 'steps',
    type: 'number',
    inputMode: 'numeric' as const,
    min: 0, max: 100000, step: 100,
  },
  {
    id: 'waterOz',
    label: 'Water Intake',
    sub: 'Total ounces of water consumed today',
    unit: 'oz',
    type: 'number',
    inputMode: 'numeric' as const,
    min: 0, max: 300, step: 8,
  },
  {
    id: 'stressLevel',
    label: 'Stress Level',
    sub: 'How was your stress today? (1 = calm, 5 = overwhelmed)',
    type: 'scale',
    max: 5,
  },
];

export default function QuickLogModal({ mode, onClose, onSave }: QuickLogModalProps) {
  const steps = mode === 'morning' ? MORNING_STEPS : EVENING_STEPS;
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<QuickLogData>({});
  const [done, setDone] = useState(false);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep) / steps.length) * 100;

  const handleNext = () => {
    if (isLast) {
      setDone(true);
      onSave(data);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const updateValue = (val: any) => {
    setData(prev => ({ ...prev, [step.id]: val }));
  };

  const currentVal = (data as any)[step?.id];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-sm tsd-card p-6 rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--tsd-moss)]">
              {mode === 'morning' ? '🌅 Morning Check-In' : '🌙 Evening Check-In'}
            </span>
            <div className="w-48 h-1 bg-[var(--tsd-surface-dim)] rounded-full mt-1.5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--tsd-forest)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--tsd-surface-dim)] transition-colors">
            <X className="w-4 h-4 text-[var(--tsd-moss)]" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-[rgba(74,222,128,0.12)] border-2 border-[var(--tsd-forest)] flex items-center justify-center">
                <Check className="w-8 h-8 text-[var(--tsd-forest)]" />
              </div>
              <h3 className="tsd-serif text-xl font-semibold text-[var(--tsd-forest)]">Logged.</h3>
              <p className="text-sm text-[var(--tsd-moss)] text-center">Protocol updated. Keep executing.</p>
              <Button onClick={onClose} className="mt-2 bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)]">
                Close
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-5"
            >
              <div>
                <h3 className="text-lg font-bold text-[var(--tsd-text)]">{step.label}</h3>
                <p className="text-xs text-[var(--tsd-moss)] mt-0.5">{step.sub}</p>
              </div>

              {/* Number Input */}
              {step.type === 'number' && (
                <div className="flex flex-col gap-2">
                  <input
                    type="number"
                    inputMode={step.inputMode}
                    value={currentVal ?? ''}
                    onChange={e => updateValue(e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="—"
                    className="gym-input text-center text-2xl font-bold h-16 text-[var(--tsd-forest)]"
                    autoFocus
                  />
                  {step.unit && (
                    <span className="text-center text-[10px] font-bold uppercase tracking-widest text-[var(--tsd-moss)]">{step.unit}</span>
                  )}
                </div>
              )}

              {/* Scale (1–N) */}
              {step.type === 'scale' && (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: step.max! }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => updateValue(n)}
                      className={`h-12 rounded-xl text-sm font-bold border-2 transition-all ${
                        currentVal === n
                          ? 'bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)] border-[var(--tsd-forest)]'
                          : 'bg-[var(--tsd-surface-dim)] text-[var(--tsd-text)] border-transparent hover:border-[var(--tsd-forest)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {/* Boolean */}
              {step.type === 'boolean' && (
                <div className="grid grid-cols-2 gap-3">
                  {[{ val: true, label: '✅ Yes' }, { val: false, label: '⏭ Skip' }].map(({ val, label }) => (
                    <button
                      key={String(val)}
                      onClick={() => updateValue(val)}
                      className={`h-14 rounded-xl text-sm font-bold border-2 transition-all ${
                        currentVal === val
                          ? 'bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)] border-[var(--tsd-forest)]'
                          : 'bg-[var(--tsd-surface-dim)] text-[var(--tsd-text)] border-transparent hover:border-[var(--tsd-forest)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)} className="flex-1 h-12 font-bold border-[var(--tsd-surface-dim)]">
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 font-bold gap-2 bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)]"
                >
                  {isLast ? 'Save Log' : (
                    <>Next <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>

              <div className="text-center text-[10px] text-[var(--tsd-moss)]">
                {currentStep + 1} of {steps.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

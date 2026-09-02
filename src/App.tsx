import React, { useState } from 'react';
import TodayLog from './components/TodayLog';
import WeeklyReview from './components/WeeklyReview';
import PlanEditor from './components/PlanEditor';
import NutritionDashboard from './components/NutritionDashboard';
import WorkoutLogger from './components/WorkoutLogger';
import SystemsCoach from './components/SystemsCoach';
import Onboarding from './components/Onboarding';
import BottomNav from './components/BottomNav';
import { Button } from './components/ui/button';
import { LogOut, LogIn, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';

// Hooks
import { useAuth } from './lib/hooks/useAuth';
import { useTheme } from './lib/hooks/useTheme';
import { useWellnessPlan } from './lib/hooks/useWellnessPlan';
import { loginWithGoogle } from './lib/firebase';
import { logger } from './lib/logger';

export default function App() {
  const { user, loading, handleLogout } = useAuth();
  const { plan } = useWellnessPlan(user);
  const { isLightMode, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('today');

  // 3B: Show onboarding if user has no plan configured yet
  const isOnboarded = !!(plan && (plan as any).userId);
  const [skipOnboarding, setSkipOnboarding] = useState(false);

  if (loading) {
    return (
      <div className="h-[100dvh] w-screen flex items-center justify-center bg-[var(--tsd-surface)]">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="tsd-serif text-2xl font-medium tracking-widest"
          style={{ color: 'var(--tsd-forest)' }}
        >
          Dean Tracker
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[var(--tsd-surface)]">
        {/* Subtle ambient blurs */}
        <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'var(--tsd-gold-bg)' }} />
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(74,222,128,0.05)' }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-sm w-full tsd-card p-10 text-center relative z-10 bg-[var(--tsd-surface)]"
        >
          {/* Logo mark */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)' }}>
            <span className="tsd-serif text-2xl font-semibold" style={{ color: 'var(--tsd-forest)' }}>DT</span>
          </div>
          <h1 className="tsd-serif text-3xl font-semibold mb-1 text-[var(--tsd-forest-text)]">Dean Tracker</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--tsd-moss)' }}>Body Composition & Training</p>

          <div className="my-8 h-px" style={{ background: 'var(--tsd-surface-dim)' }} />

          <div className="flex flex-col gap-3">
            <Button
              onClick={async () => {
                try {
                  logger.info("Connecting to Google Auth...");
                  await loginWithGoogle();
                } catch (err: any) {
                  logger.error("Login error:", err);
                  alert("Login error: " + err.message);
                }
              }}
              size="lg"
              className="w-full gap-2.5 h-14 text-lg font-semibold tracking-wide transition-all"
              style={{ background: 'var(--tsd-forest)', color: 'var(--tsd-forest-text)', borderRadius: '12px' }}
            >
              <LogIn className="w-5 h-5" />
              Enter System
            </Button>
          </div>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--tsd-moss)' }}>
            Precision Tracking Protocol
          </p>
        </motion.div>
      </div>
    );
  }

  // 3B: Show onboarding gate for new users
  if (user && !isOnboarded && !skipOnboarding) {
    return (
      <Onboarding
        user={user}
        onComplete={() => setSkipOnboarding(true)}
      />
    );
  }

  const isWideScreen = activeTab === 'weekly' || activeTab === 'plan' || activeTab === 'coach';

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] flex flex-col font-sans bg-[var(--tsd-surface)] text-[var(--tsd-forest-text)]">
        <header className="h-[var(--header-height)] flex items-center justify-between px-4 shrink-0 fixed top-0 left-0 right-0 z-40 bg-[var(--tsd-surface)] border-b border-[var(--tsd-surface-dim)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--tsd-forest)]">
              <span className="tsd-serif text-base font-medium text-[var(--tsd-forest-text)]">DT</span>
            </div>
            <div className="flex flex-col">
              <h1 className="tsd-serif text-base font-semibold leading-none">Dean Tracker</h1>
              <span className="text-[9px] font-semibold uppercase tracking-widest mt-0.5 text-[var(--tsd-moss)]">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-[var(--tsd-moss)] hover:text-[var(--tsd-forest)] transition-colors rounded-full hover:bg-[var(--tsd-surface-dim)]">
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[var(--tsd-danger)] transition-colors rounded-full hover:bg-[var(--tsd-surface-dim)]">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className={isWideScreen ? "screen-content-wide" : "screen-content"}>
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              {activeTab === 'today' && (
                <motion.div key="today" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.1 }}>
                  <TodayLog user={user} plan={plan as any} />
                </motion.div>
              )}
              {activeTab === 'food' && (
                <motion.div key="food" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.1 }}>
                  <NutritionDashboard user={user} plan={plan as any} />
                </motion.div>
              )}
              {activeTab === 'workout' && (
                <motion.div key="workout" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.1 }}>
                  <WorkoutLogger user={user} plan={plan as any} />
                </motion.div>
              )}
              {activeTab === 'weekly' && (
                <motion.div key="weekly" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.1 }}>
                  <WeeklyReview user={user} plan={plan as any} />
                </motion.div>
              )}
              {activeTab === 'plan' && (
                <motion.div key="plan" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.1 }}>
                  <PlanEditor user={user} plan={plan as any} />
                </motion.div>
              )}
              {activeTab === 'coach' && (
                <motion.div key="coach" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.1 }}>
                  <SystemsCoach user={user} />
                </motion.div>
              )}
            </AnimatePresence>
          </ErrorBoundary>
        </main>

        <BottomNav active={activeTab} onChange={setActiveTab} />
        <Toaster position="top-center" richColors />
      </div>
    </ErrorBoundary>
  );
}

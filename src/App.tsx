import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import HealthTrackingTable from './components/HealthTrackingTable';
import WeeklyDashboard from './components/WeeklyDashboard';
import SystemsCoach from './components/SystemsCoach';
import WellnessPlan from './components/WellnessPlan';
import NutritionDashboard from './components/NutritionDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import {
  LogOut, LogIn, Activity, LayoutDashboard, ClipboardList,
  ShieldAlert, UtensilsCrossed, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedMock = localStorage.getItem('twin_focus_mock_user');
    if (savedMock) {
      setUser(JSON.parse(savedMock));
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMockLogin = () => {
    const defaultMockUser = {
      uid: 'mock_christopher_123',
      displayName: 'Christopher (Systems Master)',
      email: 'christopher@twinfocus.com',
      isMock: true
    };
    setUser(defaultMockUser);
    localStorage.setItem('twin_focus_mock_user', JSON.stringify(defaultMockUser));
  };

  const handleLogout = async () => {
    localStorage.removeItem('twin_focus_mock_user');
    setUser(null);
    await logout();
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--tsd-cream)' }}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="tsd-serif text-2xl font-medium tracking-widest"
          style={{ color: 'var(--tsd-forest)' }}
        >
          Twin Focus
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--tsd-cream)' }}>
        {/* Subtle ambient blurs */}
        <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(212, 160, 23, 0.07)' }} />
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(1, 50, 32, 0.05)' }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-sm w-full tsd-card p-10 text-center relative z-10"
        >
          {/* Logo mark */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(1, 50, 32, 0.07)', border: '1px solid rgba(1,50,32,0.15)' }}>
            <span className="tsd-serif text-2xl font-semibold" style={{ color: 'var(--tsd-forest)' }}>Ω</span>
          </div>
          <h1 className="tsd-serif text-3xl font-semibold mb-1" style={{ color: 'var(--tsd-forest)' }}>Twin Focus</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--tsd-moss)' }}>Wellness &amp; MarginReset Stewardship</p>

          <div className="my-8 h-px" style={{ background: 'var(--tsd-surface-dim)' }} />

          <div className="flex flex-col gap-3">
            <Button
              onClick={loginWithGoogle}
              size="lg"
              className="w-full gap-2.5 h-12 font-semibold tracking-wide transition-all"
              style={{ background: 'var(--tsd-forest)', color: '#fff', borderRadius: '10px' }}
            >
              <LogIn className="w-4 h-4" />
              Enter System
            </Button>
            <Button
              onClick={handleMockLogin}
              variant="outline"
              size="lg"
              className="w-full gap-2.5 h-10 text-xs font-semibold tracking-wider uppercase transition-colors"
              style={{ borderColor: 'var(--tsd-surface-dim)', color: 'var(--tsd-moss)', borderRadius: '10px' }}
            >
              Developer Bypass
            </Button>
          </div>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--tsd-moss)' }}>
            Precision Habit &amp; Margin Tracking
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--tsd-cream)' }}>
      <header className="h-16 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-10"
        style={{ background: 'var(--tsd-surface)', borderBottom: '1px solid var(--tsd-surface-dim)', boxShadow: '0 1px 8px rgba(1,50,32,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--tsd-forest)' }}>
            <span className="tsd-serif text-lg font-medium" style={{ color: 'var(--tsd-gold)' }}>Ω</span>
          </div>
          <div className="flex flex-col">
            <h1 className="tsd-serif text-lg font-semibold leading-none" style={{ color: 'var(--tsd-forest)' }}>Twin Focus</h1>
            <span className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'var(--tsd-moss)' }}>Wellness Stewardship</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <p className="text-xs font-semibold leading-none" style={{ color: 'var(--tsd-forest)' }}>{user.displayName}</p>
            <p className="text-[9px] font-medium uppercase tracking-widest mt-1" style={{ color: 'var(--tsd-moss)' }}>{user.email}</p>
          </div>
          <div className="h-5 w-px hidden sm:block" style={{ background: 'var(--tsd-surface-dim)' }} />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-rose-400 hover:text-rose-600 transition-colors rounded-full hover:bg-rose-50">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        <Tabs defaultValue="health" className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--tsd-surface-dim)' }}>
            {/* Nav tabs */}
            <div className="flex overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 flex gap-1">
                {[
                  { value: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                  { value: 'health', icon: ClipboardList, label: 'Telemetry Log' },
                  { value: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
                  { value: 'plan', icon: Settings2, label: 'Wellness Plan' },
                  { value: 'coach', icon: ShieldAlert, label: 'Systems Coach' },
                ].map(({ value, icon: Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="px-4 py-2.5 text-xs font-semibold tracking-wide flex items-center gap-1.5 rounded-lg transition-all whitespace-nowrap
                      text-[#717973] hover:text-[#013220] hover:bg-white/60
                      data-[state=active]:bg-white data-[state=active]:text-[#013220] data-[state=active]:shadow-sm"
                    style={{
                      '--tw-shadow': '0 1px 6px rgba(1,50,32,0.08)',
                    } as React.CSSProperties}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Date badge */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--tsd-moss)' }}>Active Cycle</span>
              <div className="tsd-badge-gold">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <TabsContent value="dashboard" className="flex-1 m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <WeeklyDashboard user={user} />
              </motion.div>
            </TabsContent>
            <TabsContent value="health" className="flex-1 m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full flex flex-col">
                <HealthTrackingTable user={user} />
              </motion.div>
            </TabsContent>
            <TabsContent value="nutrition" className="flex-1 m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <NutritionDashboard user={user} />
              </motion.div>
            </TabsContent>
            <TabsContent value="plan" className="flex-1 m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <WellnessPlan user={user} />
              </motion.div>
            </TabsContent>
            <TabsContent value="coach" className="flex-1 m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <SystemsCoach user={user} />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>

      <footer className="py-6 shrink-0" style={{ borderTop: '1px solid var(--tsd-surface-dim)', background: 'var(--tsd-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="tsd-serif text-sm font-medium" style={{ color: 'var(--tsd-forest)' }}>Twin Focus</p>
          <div className="flex gap-6 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--tsd-moss)' }}>
            <span>Precision</span>
            <span>Performance</span>
            <span>Stewardship</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

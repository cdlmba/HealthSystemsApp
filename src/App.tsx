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
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-primary font-bold text-2xl tracking-widest font-mono text-slate-800"
        >
          TWIN FOCUS ENGINE...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute -left-20 -top-20 w-96 h-96 bg-emerald-800/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-violet-850/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-slate-900 p-10 rounded-2xl border border-slate-800 text-center shadow-2xl relative z-10"
        >
          <div className="bg-emerald-500/10 border border-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="text-emerald-500 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Twin Focus</h1>
          <p className="text-slate-400 text-sm italic font-medium">Health + MarginReset Control Center</p>
          
          <div className="h-[1px] bg-slate-800 my-8 w-full" />

          <div className="flex flex-col gap-3">
            <Button onClick={loginWithGoogle} size="lg" className="w-full gap-2.5 text-lg h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold tracking-wide uppercase transition-all shadow-xl shadow-emerald-950/50">
              <LogIn className="w-5 h-5" />
              Enter System
            </Button>
            <Button onClick={handleMockLogin} variant="outline" size="lg" className="w-full gap-2.5 text-xs h-10 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 tracking-wider uppercase font-bold transition-colors">
              Use Developer Bypass
            </Button>
          </div>

          <p className="mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Precision Habit & Margin Tracking for Christopher
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center shadow">
            <span className="text-emerald-400 font-black text-lg">Ω</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Twin Focus</h1>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Health + MarginReset</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <p className="text-xs font-bold text-slate-900 leading-none">{user.displayName}</p>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">{user.email}</p>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-50">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        <Tabs defaultValue="health" className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 flex gap-0.5">
                <TabsTrigger
                  value="dashboard"
                  className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow rounded transition-all whitespace-nowrap"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="health"
                  className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow rounded transition-all whitespace-nowrap"
                >
                  <ClipboardList className="w-4 h-4 mr-1.5" />
                  Telemetry Log
                </TabsTrigger>
                <TabsTrigger
                  value="nutrition"
                  className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow rounded transition-all whitespace-nowrap"
                >
                  <UtensilsCrossed className="w-4 h-4 mr-1.5" />
                  Nutrition
                </TabsTrigger>
                <TabsTrigger
                  value="plan"
                  className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow rounded transition-all whitespace-nowrap"
                >
                  <Settings2 className="w-4 h-4 mr-1.5" />
                  Wellness Plan
                </TabsTrigger>
                <TabsTrigger
                  value="coach"
                  className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-400 data-[state=active]:shadow rounded transition-all flex items-center whitespace-nowrap"
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  Systems Coach
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.15em]">Active Telemetry Cycle</span>
              <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-emerald-400 rounded text-xs font-bold font-mono shadow-sm">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
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

      <footer className="py-8 border-t border-slate-200 bg-white shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <p>© 2026 Twin Focus. Real-Time Telemetry Operational.</p>
          <div className="flex gap-6">
            <span>Precision</span>
            <span>Performance</span>
            <span>Structural Margin</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

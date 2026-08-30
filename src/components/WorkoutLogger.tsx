import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WorkoutSession, WorkoutSet } from '../types';
import { format, parseISO } from 'date-fns';
import { Button } from './ui/button';
import { Dumbbell, Plus, Save, Trash2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function WorkoutLogger({ user }: { user: any }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [templateName, setTemplateName] = useState('Upper Body');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const loadSession = async () => {
      setLoading(true);
      if (user.isMock) {
        const raw = localStorage.getItem(`dean_tracker_workout_${user.uid}_${date}`);
        if (raw) {
          setSession(JSON.parse(raw));
          setTemplateName(JSON.parse(raw).templateName);
        } else {
          setSession(null);
        }
      } else {
        const q = query(
          collection(db, 'workoutSessions'),
          where('userId', '==', user.uid),
          where('date', '==', date)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0].data() as WorkoutSession;
          setSession({ ...docData, id: snap.docs[0].id });
          setTemplateName(docData.templateName);
        } else {
          setSession(null);
        }
      }
      setLoading(false);
    };

    loadSession();
  }, [user, date]);

  const handleCreateSession = () => {
    setSession({
      userId: user.uid,
      date,
      templateName,
      sets: [],
      completedAt: new Date().toISOString()
    });
  };

  const handleAddSet = (exerciseName: string = 'New Exercise') => {
    if (!session) return;
    const newSet: WorkoutSet = {
      exerciseId: `ex_${Date.now()}`,
      exerciseName,
      setNumber: session.sets.filter(s => s.exerciseName === exerciseName).length + 1,
      weight: 0,
      reps: 0,
      rir: 2,
    };
    setSession({ ...session, sets: [...session.sets, newSet] });
  };

  const handleUpdateSet = (index: number, field: keyof WorkoutSet, value: any) => {
    if (!session) return;
    const newSets = [...session.sets];
    newSets[index] = { ...newSets[index], [field]: value };
    
    if (field === 'exerciseName') {
      let count = 1;
      newSets.forEach(s => {
        if (s.exerciseName === value) {
          s.setNumber = count++;
        }
      });
    }

    setSession({ ...session, sets: newSets });
  };

  const handleRemoveSet = (index: number) => {
    if (!session) return;
    const newSets = [...session.sets];
    newSets.splice(index, 1);
    setSession({ ...session, sets: newSets });
  };

  const handleSave = async () => {
    if (!session || !user) return;
    
    const sessionToSave = { ...session, templateName };
    
    if (user.isMock) {
      localStorage.setItem(`dean_tracker_workout_${user.uid}_${date}`, JSON.stringify(sessionToSave));
    } else {
      const docRef = session.id ? doc(db, 'workoutSessions', session.id) : doc(collection(db, 'workoutSessions'));
      await setDoc(docRef, sessionToSave, { merge: true });
      if (!session.id) setSession({ ...sessionToSave, id: docRef.id });
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const groupedSets = session?.sets.reduce((acc, set, idx) => {
    if (!acc[set.exerciseName]) acc[set.exerciseName] = [];
    acc[set.exerciseName].push({ ...set, _originalIndex: idx });
    return acc;
  }, {} as Record<string, (WorkoutSet & { _originalIndex: number })[]>) || {};

  return (
    <div className="flex flex-col h-full gap-5">
      
      {/* Header & Date Selector */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--tsd-surface-dim)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)]">
            <Dumbbell className="w-5 h-5 text-[var(--tsd-forest)]" />
          </div>
          <div>
            <h2 className="tsd-serif text-lg font-semibold leading-tight">Training Log</h2>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-[10px] uppercase font-bold tracking-widest text-[var(--tsd-text-dim)] bg-transparent outline-none m-0 p-0"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10 text-[var(--tsd-text-dim)] text-sm">Loading session...</div>
      ) : !session ? (
        <div className="tsd-card p-10 flex flex-col items-center justify-center text-center gap-4 my-auto">
          <div className="w-16 h-16 rounded-full bg-[var(--tsd-surface-dim)] flex items-center justify-center mb-2">
            <Dumbbell className="w-8 h-8 text-[var(--tsd-text-dim)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--tsd-text)]">No session logged</h3>
            <p className="text-sm text-[var(--tsd-text-dim)]">Create a new log for {format(parseISO(date), 'MMM do')}.</p>
          </div>
          <div className="flex flex-col w-full gap-3 mt-4">
            <select
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="h-12 px-4 text-sm rounded-xl font-bold bg-[var(--tsd-bg)] border-2 border-[var(--tsd-surface-dim)] focus:border-[var(--tsd-forest)] outline-none"
            >
              <option value="Upper Body">Upper Body</option>
              <option value="Lower Body">Lower Body</option>
              <option value="Full Body">Full Body</option>
              <option value="Push">Push</option>
              <option value="Pull">Pull</option>
              <option value="Legs">Legs</option>
            </select>
            <Button onClick={handleCreateSession} className="h-12 text-sm font-bold tracking-widest uppercase bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)] hover:bg-[var(--tsd-forest-mid)] rounded-xl">
              Start Workout
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-24">
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--tsd-text-dim)] ml-1">Session Name</label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full h-12 px-4 text-base font-bold bg-[var(--tsd-surface-2)] border-2 border-[var(--tsd-surface-dim)] rounded-xl focus:outline-none focus:border-[var(--tsd-forest)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-6">
            <AnimatePresence>
              {Object.entries(groupedSets).map(([exName, sets]) => (
                <motion.div
                  key={exName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={exName}
                      onChange={e => {
                        (sets as any[]).forEach(s => handleUpdateSet(s._originalIndex, 'exerciseName', e.target.value));
                      }}
                      className="font-black text-lg bg-transparent focus:outline-none border-b-2 border-transparent focus:border-[var(--tsd-forest)] px-1 w-full text-[var(--tsd-text)]"
                    />
                  </div>
                  
                  {/* Set Cards */}
                  <div className="flex flex-col gap-3">
                    {(sets as any[]).map((set, i) => (
                      <div key={set._originalIndex} className="metric-card bg-[var(--tsd-surface-2)] border-2 border-[var(--tsd-surface-dim)]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold uppercase text-[10px] text-[var(--tsd-text-dim)] tracking-widest">
                            Set {i + 1}
                          </span>
                          <button onClick={() => handleRemoveSet(set._originalIndex)} className="text-[var(--tsd-danger)] p-2 -mr-2 bg-[rgba(248,113,113,0.1)] rounded-lg">
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="flex gap-3 mb-2">
                           <div className="flex-1 flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--tsd-text)] text-center">Lbs</label>
                              <input 
                                type="number" 
                                inputMode="decimal"
                                className="gym-input bg-[var(--tsd-bg)] border-[var(--tsd-surface-dim)]" 
                                value={set.weight || ''} 
                                onChange={e => handleUpdateSet(set._originalIndex, 'weight', Number(e.target.value))} 
                              />
                           </div>
                           <div className="flex-1 flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--tsd-text)] text-center">Reps</label>
                              <input 
                                type="number" 
                                inputMode="decimal"
                                className="gym-input bg-[var(--tsd-bg)] border-[var(--tsd-surface-dim)]" 
                                value={set.reps || ''} 
                                onChange={e => handleUpdateSet(set._originalIndex, 'reps', Number(e.target.value))} 
                              />
                           </div>
                        </div>

                        <div className="flex flex-col gap-1.5 mt-1 border-t border-[var(--tsd-surface-dim)] pt-3">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--tsd-text)] text-center">RIR (Reps in Reserve)</label>
                          <div className="flex gap-2 items-center justify-between">
                             {[0, 1, 2, 3, 4].map(rir => (
                               <button 
                                 key={rir}
                                 className={`rir-btn flex-1 ${set.rir === rir ? 'selected' : ''}`}
                                 onClick={() => handleUpdateSet(set._originalIndex, 'rir', rir)}
                               >
                                 {rir}
                               </button>
                             ))}
                             <input 
                               type="number" 
                               inputMode="decimal"
                               className="rir-btn w-12 text-center bg-[var(--tsd-bg)] text-sm font-bold" 
                               placeholder="+" 
                               value={set.rir > 4 ? set.rir : ''} 
                               onChange={e => handleUpdateSet(set._originalIndex, 'rir', Number(e.target.value))} 
                             />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleAddSet(exName)}
                    className="w-full border-dashed border-2 text-[var(--tsd-text-dim)] border-[var(--tsd-surface-dim)] hover:text-[var(--tsd-forest)] hover:border-[var(--tsd-forest)] hover:bg-[rgba(74,222,128,0.05)] h-12 rounded-xl text-xs font-bold uppercase tracking-widest mt-1"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Set
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button
              variant="outline"
              onClick={() => handleAddSet('New Exercise')}
              className="w-full border-dashed border-2 text-[var(--tsd-text-dim)] border-[var(--tsd-surface-dim)] hover:text-[var(--tsd-forest)] hover:border-[var(--tsd-forest)] hover:bg-[rgba(74,222,128,0.05)] h-14 rounded-xl text-xs font-bold uppercase tracking-widest mt-4"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New Exercise
            </Button>
          </div>

          {/* Floating Save Button */}
          <div className="fixed bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-30">
            <Button
              onClick={handleSave}
              className="shadow-xl rounded-full h-14 px-8 font-bold tracking-wide uppercase text-xs flex items-center gap-2 transition-all hover:scale-105"
              style={{
                background: saved ? 'var(--tsd-forest-mid)' : 'var(--tsd-gold)',
                color: saved ? 'var(--tsd-forest-mid-text)' : '#0e1412'
              }}
            >
              {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Workout</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

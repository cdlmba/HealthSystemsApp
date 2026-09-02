import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WorkoutSession, WorkoutSet, Exercise } from '../types';
import { format, parseISO } from 'date-fns';
import { WorkoutSessionSchema } from '../lib/schemas';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dumbbell, Plus, Save, Trash2, CheckCircle2, ChevronLeft, ChevronRight, Trophy, Flame, TrendingUp, ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function WorkoutLogger({ user, plan }: { user: any, plan: any }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [templateName, setTemplateName] = useState('Upper Body');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savedExercises, setSavedExercises] = useState<Exercise[]>([]);
  const [prMap, setPrMap] = useState<Record<string, { weight: number; reps: number }>>({});
  // DTT: Track which exercises are ready for double progression
  const [progressionReady, setProgressionReady] = useState<Record<string, boolean>>({});;

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);

    if (user.isMock) {
      const raw = localStorage.getItem(`dean_tracker_workout_${user.uid}_${date}`);
      if (raw) {
        setSession(JSON.parse(raw));
        setTemplateName(JSON.parse(raw).templateName);
      } else {
        setSession(null);
      }
      const rawEx = localStorage.getItem(`dean_tracker_exercises_${user.uid}`);
      if (rawEx) setSavedExercises(JSON.parse(rawEx));
      
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'workoutSessions'),
      where('userId', '==', user.uid),
      where('date', '==', date)
    );
    
    const unsubSession = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docData = snap.docs[0].data() as WorkoutSession;
        setSession({ ...docData, id: snap.docs[0].id });
        setTemplateName(docData.templateName);
      } else {
        setSession(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading session:", error);
      setLoading(false);
    });

    const exQuery = query(collection(db, 'exercises'), where('userId', '==', user.uid));
    const unsubEx = onSnapshot(exQuery, (snap) => {
      setSavedExercises(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exercise)));
    });

    return () => {
      unsubSession();
      unsubEx();
    };
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

  // DTT: Generate Dean Turner's 3-tier warm-up protocol for an exercise
  const handleGenerateWarmups = (exerciseName: string) => {
    if (!session) return;
    // Find the heaviest working set logged for this exercise to base % on
    const workingSets = session.sets.filter(s => s.exerciseName === exerciseName && !s.isWarmup);
    const topWeight = workingSets.length > 0
      ? Math.max(...workingSets.map(s => s.weight).filter(w => w > 0))
      : 0;

    // If no working weight yet, use a placeholder of 100 (user will update)
    const baseWeight = topWeight > 0 ? topWeight : 100;

    const warmupSets: WorkoutSet[] = [
      { exerciseId: `wu_${Date.now()}_1`, exerciseName, setNumber: 1, weight: Math.round(baseWeight * 0.44 / 5) * 5, reps: 10, rir: 8, isWarmup: true },
      { exerciseId: `wu_${Date.now()}_2`, exerciseName, setNumber: 2, weight: Math.round(baseWeight * 0.68 / 5) * 5, reps: 5,  rir: 8, isWarmup: true },
      { exerciseId: `wu_${Date.now()}_3`, exerciseName, setNumber: 3, weight: Math.round(baseWeight * 0.86 / 5) * 5, reps: 2,  rir: 8, isWarmup: true },
    ];

    // Insert warm-ups before working sets for this exercise
    const otherSets = session.sets.filter(s => s.exerciseName !== exerciseName);
    const thisSets = session.sets.filter(s => s.exerciseName === exerciseName);
    const existingWarmups = thisSets.filter(s => s.isWarmup);
    const existingWorking = thisSets.filter(s => !s.isWarmup);

    // Remove any existing warmups for this exercise first, then prepend fresh ones
    const newSets = [...otherSets, ...warmupSets, ...existingWorking.filter(s => s.exerciseName === exerciseName)];
    // Re-insert in original order: find where this exercise starts
    const reordered = [
      ...session.sets.filter(s => s.exerciseName !== exerciseName && session.sets.findIndex(x => x.exerciseName === exerciseName) > session.sets.findIndex(x => x === s)),
      ...warmupSets,
      ...existingWorking,
      ...session.sets.filter(s => s.exerciseName !== exerciseName && session.sets.findIndex(x => x.exerciseName === exerciseName) < session.sets.findIndex(x => x === s)),
    ];

    // Simpler: place warmups + working sets for this exercise in correct order within existing list
    const finalSets = [
      ...session.sets.filter(s => s.exerciseName !== exerciseName && !s.isWarmup || (s.exerciseName !== exerciseName)),
    ];
    // Rebuild: preserve order of other exercises, insert warmups before working sets of this exercise
    const allOtherExNames = [...new Set(session.sets.filter(s => s.exerciseName !== exerciseName).map(s => s.exerciseName))];
    const ordered: WorkoutSet[] = [];
    let inserted = false;
    const seen = new Set<string>();
    for (const s of session.sets) {
      if (s.exerciseName === exerciseName) {
        if (!inserted) {
          ordered.push(...warmupSets, ...existingWorking);
          inserted = true;
        }
      } else {
        if (!seen.has(s.exerciseName + s.setNumber + s.weight)) {
          seen.add(s.exerciseName + s.setNumber + s.weight);
          ordered.push(s);
        }
      }
    }
    if (!inserted) ordered.push(...warmupSets);

    setSession({ ...session, sets: ordered });
    toast.success(`Warm-up sets generated for ${exerciseName} (DTT protocol)`);
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

    try {
      // Validate the session data
      WorkoutSessionSchema.parse(sessionToSave);
    } catch (error: any) {
      toast.error('Validation failed: ' + error.message);
      return;
    }

    const uniqueExercises: string[] = Array.from(new Set(sessionToSave.sets.map(s => s.exerciseName)));
    
    try {
      if (user.isMock) {
        localStorage.setItem(`dean_tracker_workout_${user.uid}_${date}`, JSON.stringify(sessionToSave));
        
        let list: Exercise[] = JSON.parse(localStorage.getItem(`dean_tracker_exercises_${user.uid}`) || '[]');
        let listChanged = false;
        for (const exName of uniqueExercises) {
          if (!list.find(e => e.name.toLowerCase() === exName.toLowerCase())) {
            list.push({
              id: `ex_${Date.now()}`,
              userId: user.uid,
              name: exName,
              category: 'push',
              defaultRepRange: [8, 12],
              targetRIR: 2
            });
            listChanged = true;
          }
        }
        if (listChanged) {
          localStorage.setItem(`dean_tracker_exercises_${user.uid}`, JSON.stringify(list));
          setSavedExercises(list);
        }
      } else {
        const docRef = session.id ? doc(db, 'workoutSessions', session.id) : doc(collection(db, 'workoutSessions'));
        await setDoc(docRef, sessionToSave, { merge: true });
        if (!session.id) setSession({ ...sessionToSave, id: docRef.id });
        
        for (const exName of uniqueExercises) {
          if (!savedExercises.find(e => e.name.toLowerCase() === exName.toLowerCase())) {
            const newEx: Exercise = {
              userId: user.uid,
              name: exName,
              category: 'push',
              defaultRepRange: [8, 12],
              targetRIR: 2
            };
            setDoc(doc(collection(db, 'exercises')), newEx);
          }
        }
      }
      
      setSaved(true);

      // 3A: Detect and celebrate PRs
      const newPRs: Record<string, { weight: number; reps: number }> = {};
      for (const exName of uniqueExercises) {
        const setsForEx = sessionToSave.sets.filter(s => s.exerciseName === exName);
        const bestSet = setsForEx.reduce((best, s) => {
          const score = s.weight * s.reps;
          return score > (best.weight * best.reps) ? s : best;
        }, setsForEx[0]);

        const prevEx = savedExercises.find(e => e.name.toLowerCase() === exName.toLowerCase());
        const prevBest = prevEx ? { weight: prevEx.lastLoad || 0, reps: prevEx.lastReps || 0 } : null;
        const prevScore = prevBest ? prevBest.weight * prevBest.reps : 0;
        const newScore = bestSet.weight * bestSet.reps;

        if (newScore > prevScore && bestSet.weight > 0) {
          newPRs[exName] = { weight: bestSet.weight, reps: bestSet.reps };
          toast.success(`🏆 New PR on ${exName}! ${bestSet.weight} lbs × ${bestSet.reps} reps`, { duration: 5000 });

          // Update exercise record with new PR
          const existingEx = savedExercises.find(e => e.name.toLowerCase() === exName.toLowerCase());
          if (existingEx?.id && !user.isMock) {
            setDoc(doc(db, 'exercises', existingEx.id), { lastLoad: bestSet.weight, lastReps: bestSet.reps }, { merge: true });
          }
        }
      }
      if (Object.keys(newPRs).length > 0) setPrMap(prev => ({ ...prev, ...newPRs }));

      // DTT: Double Progression — check if all working sets hit the top of rep range
      const newProgressionReady: Record<string, boolean> = {};
      for (const exName of uniqueExercises) {
        const workingSets = sessionToSave.sets.filter(s => s.exerciseName === exName && !s.isWarmup);
        if (workingSets.length === 0) continue;
        const exRecord = savedExercises.find(e => e.name.toLowerCase() === exName.toLowerCase());
        const repRange = exRecord?.defaultRepRange || [8, 12];
        const topOfRange = repRange[1];
        // Check if all working sets hit or exceeded the top of the rep range
        const allHitTop = workingSets.every(s => s.reps >= topOfRange);
        if (allHitTop) {
          newProgressionReady[exName] = true;
          toast.success(`↑ Ready to add weight on ${exName}! All sets hit ${topOfRange}+ reps. Add 2.5–5 lbs next session.`, { duration: 6000 });
          // Persist progressionReady to exercise document
          const existingEx = savedExercises.find(e => e.name.toLowerCase() === exName.toLowerCase());
          if (existingEx?.id && !user.isMock) {
            setDoc(doc(db, 'exercises', existingEx.id), { progressionReady: true }, { merge: true });
          }
        }
      }
      if (Object.keys(newProgressionReady).length > 0) {
        setProgressionReady(prev => ({ ...prev, ...newProgressionReady }));
      }

      toast.success('Workout saved successfully!');
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      toast.error('Failed to save workout: ' + error.message);
    }
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
                      list="exercise-suggestions"
                      value={exName}
                      onChange={e => {
                        (sets as any[]).forEach(s => handleUpdateSet(s._originalIndex, 'exerciseName', e.target.value));
                      }}
                      className="font-black text-lg bg-transparent focus:outline-none border-b-2 border-transparent focus:border-[var(--tsd-forest)] px-1 w-full text-[var(--tsd-text)]"
                    />
                    <button
                      onClick={() => handleGenerateWarmups(exName)}
                      title="Generate DTT 3-tier warm-up"
                      className="shrink-0 ml-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-[rgba(246,201,14,0.12)] text-[var(--tsd-gold)] border border-[rgba(246,201,14,0.3)] hover:bg-[rgba(246,201,14,0.22)] transition-colors"
                    >
                      <Flame className="w-3 h-3" /> DTT Warm-Up
                    </button>
                  </div>
                  
                  {/* Set Cards */}
                  <div className="flex flex-col gap-3">
                    {(sets as any[]).map((set, i) => {
                      const isWU = !!set.isWarmup;
                      const isLazySet = !isWU && set.rir >= 4 && set.rir !== undefined;
                      return (
                        <div key={set._originalIndex} className={`metric-card border-2 ${
                          isWU
                            ? 'border-[rgba(246,201,14,0.4)] bg-[rgba(246,201,14,0.05)]'
                            : 'border-[var(--tsd-surface-dim)] bg-[var(--tsd-surface-2)]'
                        }`}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              {isWU ? (
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[rgba(246,201,14,0.2)] text-[var(--tsd-gold)] border border-[rgba(246,201,14,0.4)]">
                                  WU · High RIR Zone
                                </span>
                              ) : (
                                <span className="font-bold uppercase text-[10px] text-[var(--tsd-text-dim)] tracking-widest">
                                  Set {(sets as any[]).filter(s => !s.isWarmup).indexOf(set) + 1}
                                </span>
                              )}
                              {isLazySet && (
                                <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">⚠ RIR too high</span>
                              )}
                            </div>
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
                            {isWU ? (
                              // Warm-up: show RIR 6-8+ picker
                              <>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--tsd-gold)] text-center">RIR — Warm-Up (keep 6–8+)</label>
                                <div className="flex gap-2 items-center justify-between">
                                  {[6, 7, 8].map(rir => (
                                    <button
                                      key={rir}
                                      className={`rir-btn flex-1 ${set.rir === rir ? 'bg-[var(--tsd-gold)] border-[var(--tsd-gold)] text-[#0e1412]' : ''}`}
                                      onClick={() => handleUpdateSet(set._originalIndex, 'rir', rir)}
                                    >
                                      {rir}
                                    </button>
                                  ))}
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    className="rir-btn w-12 text-center bg-[var(--tsd-bg)] text-sm font-bold"
                                    placeholder="9+"
                                    value={set.rir > 8 ? set.rir : ''}
                                    onChange={e => handleUpdateSet(set._originalIndex, 'rir', Number(e.target.value))}
                                  />
                                </div>
                              </>
                            ) : (
                              // Working set: 0-4 RIR + lazy warning
                              <>
                                <label className={`text-[9px] font-bold uppercase tracking-widest text-center ${
                                  isLazySet ? 'text-amber-500' : 'text-[var(--tsd-text)]'
                                }`}>RIR {isLazySet ? '⚠ Target 0–1 RIR' : '(Reps in Reserve)'}</label>
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
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* DTT: Double Progression Ready Banner */}
                  {progressionReady[exName] && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(74,222,128,0.12)] border border-[var(--tsd-forest)]">
                      <ArrowUp className="w-4 h-4 text-[var(--tsd-forest)] shrink-0" />
                      <span className="text-xs font-bold text-[var(--tsd-forest)]">
                        Progression Due — Add 2.5–5 lbs next session
                      </span>
                    </div>
                  )}
                  
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
          
          <datalist id="exercise-suggestions">
            {savedExercises.map(ex => (
              <option key={ex.id || ex.name} value={ex.name} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}

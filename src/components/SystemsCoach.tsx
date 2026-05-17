import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { HealthLog } from '../types';
import { startOfWeek, addDays, parseISO, format } from 'date-fns';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  Activity, 
  Terminal, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Flame, 
  MessageSquare,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Systems Coach Persona Instruction
const COACH_SYSTEM_INSTRUCTION = `You are a disciplined systems coach helping Christopher execute his Twin Focus vision (Health + MarginReset). You are direct, encouraging, and data-driven. Always reference his goals: 14/10 eating window, gym days, chair stand progress, writing output, 80/10/10 finances, spiritual rhythm, daily calls, etc. Keep your tone direct, punchy, tactical, and highly disciplined. Do not use corporate speak.`;

interface Message {
  role: 'user' | 'coach';
  text: string;
  timestamp: Date;
}

export default function SystemsCoach({ user }: { user: any }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Christopher's health logs
  useEffect(() => {
    if (!user) return;

    if (user.isMock) {
      const storageKey = `twin_focus_logs_${user.uid}`;
      const loadLogs = () => {
        const savedLogs = localStorage.getItem(storageKey);
        if (savedLogs) {
          setLogs(JSON.parse(savedLogs));
        }
      };

      loadLogs();

      // Listen for local changes to keep tabs synchronized in real-time
      const handleStorageChange = () => {
        loadLogs();
      };
      window.addEventListener('storage', handleStorageChange);
      const interval = setInterval(loadLogs, 1000);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }

    const q = query(
      collection(db, 'healthLogs'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => doc.data() as HealthLog));
    });
    return () => unsubscribe();
  }, [user, currentWeekStart]);

  const weekLogs = logs.filter(log => {
    const logDate = parseISO(log.date);
    return logDate >= currentWeekStart && logDate < addDays(currentWeekStart, 7);
  });

  // Calculate metrics for current week
  const getSum = (field: keyof HealthLog) => {
    return weekLogs.filter(log => log[field] === true).length;
  };

  const getAvg = (field: keyof HealthLog) => {
    const values = weekLogs.map(log => log[field]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getNumberSum = (field: keyof HealthLog) => {
    const values = weekLogs.map(log => log[field]).filter(v => typeof v === 'number') as number[];
    return values.reduce((a, b) => a + b, 0);
  };

  const gymDays = getSum('gymCompleted');
  const eatingWindowCount = getSum('eatingWindowAdherence');
  const writingOutput = getNumberSum('writingOutput');
  const spiritualDays = getSum('spiritualRhythm');
  const financialDays = getSum('finances801010');
  const relationalCalls = getNumberSum('dailyCalls');
  const chairStandEase = getAvg('chairStandEase');
  const sleepAvg = getAvg('sleepQuality');

  // Trigger welcome message on load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'coach',
          text: `Systems Coach active, Christopher. Twin Focus protocol: Health + MarginReset is loaded.\n\nI have compiled your performance telemetry. Gym sessions completed: ${gymDays}/3, Eating window adherence: ${eatingWindowCount}/7 days, Writing output: ${writingOutput} words, 80/10/10 financial alignment: ${financialDays}/7 check-ins. Daily relational calls: ${relationalCalls}.\n\nState your system variance or request a diagnostic below. Measure → Adjust → Improve. Let's go.`,
          timestamp: new Date()
        }
      ]);
    }
  }, [logs]);

  // Autoscroll chat
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Generate automated systems coaching response
  const generateSimulatedCoachResponse = (queryText: string): string => {
    const query = queryText.toLowerCase();

    // 14/10 Eating Window
    if (query.includes('eat') || query.includes('fast') || query.includes('window') || query.includes('diet') || query.includes('eggs')) {
      const windowPercent = Math.round((eatingWindowCount / 7) * 100);
      let feedback = `Your 14/10 eating window adherence is at ${eatingWindowCount}/7 days (${windowPercent}%). `;
      if (windowPercent < 80) {
        feedback += `Christopher, this is a system leak. Fasting for 14 hours and feeding for 10 is your biological baseline. Close the kitchen by 7:30 PM tonight, and wait until 9:30 AM for your egg meal. No exceptions.`;
      } else {
        feedback += `Excellent control on the eating window. You are defending the biological perimeter. Keep the 9:30 AM Egg meal structured, and eat until you are 80% full.`;
      }
      return feedback;
    }

    // Gym / Training / Chair Stand
    if (query.includes('gym') || query.includes('workout') || query.includes('train') || query.includes('chair') || query.includes('stand') || query.includes('mobility')) {
      let feedback = `Gym sessions logged: ${gymDays}/3 days. Chair stand ease: ${chairStandEase.toFixed(1)}/10. `;
      if (gymDays < 3) {
        feedback += `You are below threshold. Gym day protocol is 3-4 days a week. Building physical resilience directly fuels cognitive margin. Get the sit-to-stands done, and focus on fast, explosive mobility drills today.`;
      } else {
        feedback += `Strength protocols are on track. Daily mobility checks show active maintenance. If you did fasted training, review your fasted gym energy logs. Keep executing.`;
      }
      return feedback;
    }

    // Writing / Focus / MarginReset
    if (query.includes('write') || query.includes('output') || query.includes('word') || query.includes('focus') || query.includes('margin')) {
      let feedback = `Total writing output tracked: ${writingOutput} words. `;
      if (writingOutput < 2500) {
        feedback += `You are lagging on your core writing margin. Christopher, writing is the manifest of your intellectual leverage. Block 45 minutes of quiet time at the desk. Shut down notifications. Put the words on the screen. Let's go.`;
      } else {
        feedback += `Good volume. Output of ${writingOutput} words is solid. Ensure this writing margin translates directly to high-authority communication assets. Don't slow down.`;
      }
      return feedback;
    }

    // Finances / 80/10/10
    if (query.includes('finance') || query.includes('money') || query.includes('budget') || query.includes('80/10/10') || query.includes('allocation')) {
      let feedback = `80/10/10 budget check-ins: ${financialDays}/7. `;
      if (financialDays < 7) {
        feedback += `Daily financial alignment check is missing or incomplete. You must protect the margins: 80% expenses, 10% saving/investing, 10% tithing/giving. Treat this with extreme accounting discipline. Log it today.`;
      } else {
        feedback += `100% adherence to 80/10/10 framework this week. Excellent job defending capital structural boundaries.`;
      }
      return feedback;
    }

    // Spiritual / Spiritual Rhythm
    if (query.includes('spirit') || query.includes('meditation') || query.includes('quiet') || query.includes('prayer')) {
      let feedback = `Spiritual rhythm adherence: ${spiritualDays}/7 days. `;
      if (spiritualDays < 6) {
        feedback += `Your alignment window is slipping. Relational, intellectual, and physical stamina requires quiet, grounded meditation or scripture study. Lock in a 15-minute quiet margin tomorrow before checking any emails.`;
      } else {
        feedback += `Spiritual rhythm is intact. This is the root of your presence. Keep executing.`;
      }
      return feedback;
    }

    // Daily Calls
    if (query.includes('call') || query.includes('relation') || query.includes('phone')) {
      let feedback = `Total check-in calls logged: ${relationalCalls} calls. `;
      if (relationalCalls < 5) {
        feedback += `Relational check-ins are under-target. Christopher, a high-performance system coach does not isolate. Pick up the phone. Keep up the daily connection call with your family, friends, or high-intent clients.`;
      } else {
        feedback += `Active relational stewardship. Good check-in cadence.`;
      }
      return feedback;
    }

    // Sleep
    if (query.includes('sleep') || query.includes('wake') || query.includes('rest')) {
      let feedback = `Sleep quality averages ${sleepAvg.toFixed(1)}/10. `;
      if (sleepAvg < 8.0) {
        feedback += `Rest depth is suboptimal. Limit blue light exposure, shut down all screens by 8:30 PM, and defend your sleep room as a high-performance regeneration chamber.`;
      } else {
        feedback += `Regeneration protocol is excellent. Highly restorative sleep metrics.`;
      }
      return feedback;
    }

    // Default System Diagnostic
    return `Christopher, let's run a complete system audit:
1. **Health Focus**: 14/10 window adherence is ${eatingWindowCount}/7. Gym: ${gymDays}/3 days. Sleep: ${sleepAvg.toFixed(1)}/10.
2. **MarginReset**: Writing: ${writingOutput} words. Finances: ${financialDays}/7. Spiritual: ${spiritualDays}/7. Calls: ${relationalCalls}.

**Diagnostic**: ${
      eatingWindowCount >= 5 && gymDays >= 3 && writingOutput >= 2000
        ? "Systems are in green status. The Twin Focus is stable. Double down on writing output and increase relational call cadence."
        : "Operational variance detected. Review the system alerts. Tighten your eating windows, defend your quiet hour for writing, and execute the protocol with complete discipline."
    }

What specific protocol adjustments do you need help with?`;
  };

  // Call actual Gemini API or fallback
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    // Call Gemini API if Key is present
    const apiKey = process.env.GEMINI_API_KEY;
    const hasKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0;

    if (hasKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `${COACH_SYSTEM_INSTRUCTION}\n\nHere is Christopher's current weekly log data:\n- 14/10 eating window adherence: ${eatingWindowCount}/7 days\n- Gym sessions completed: ${gymDays}/3 days\n- Fasted gym energy avg: ${getAvg('fastedGymEnergy').toFixed(1)}/10\n- Chair stand ease avg: ${chairStandEase.toFixed(1)}/10\n- Sleep quality avg: ${sleepAvg.toFixed(1)}/10\n- Writing output total: ${writingOutput} words\n- 80/10/10 financial checks: ${financialDays}/7\n- Spiritual rhythm rate: ${spiritualDays}/7\n- Daily relational calls: ${relationalCalls}\n\nChristopher's query: "${currentInput}"`
                    }
                  ]
                }
              ],
              generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.2,
              }
            })
          }
        );

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (responseText) {
          setMessages(prev => [
            ...prev,
            {
              role: 'coach',
              text: responseText,
              timestamp: new Date()
            }
          ]);
          setIsTyping(false);
          return;
        }
      } catch (err) {
        console.error('Gemini API Error, falling back to local diagnostic engine:', err);
      }
    }

    // Simulate response delay for organic feel
    setTimeout(() => {
      const coachText = generateSimulatedCoachResponse(currentInput);
      setMessages(prev => [
        ...prev,
        {
          role: 'coach',
          text: coachText,
          timestamp: new Date()
        }
      ]);
      setIsTyping(false);
    }, 800);
  };

  // Compile active system alerts based on metric adherence
  const systemAlerts = [];
  if (eatingWindowCount < 5) {
    systemAlerts.push({
      pillar: 'Health',
      issue: 'Eating Window Leak',
      detail: `Only ${eatingWindowCount} days adhering to 14/10. Block dinner eating by 7:30 PM.`,
      severity: 'critical'
    });
  }
  if (gymDays < 3) {
    systemAlerts.push({
      pillar: 'Health',
      issue: 'Strength Under-Volume',
      detail: `Logged ${gymDays} gym sessions. Target is 3-4 days. Schedule your next workout now.`,
      severity: 'high'
    });
  }
  if (writingOutput < 2500) {
    systemAlerts.push({
      pillar: 'MarginReset',
      issue: 'Writing Deficit',
      detail: `Total output is ${writingOutput} words. Target is 2500w. Execute a 45m block.`,
      severity: 'high'
    });
  }
  if (spiritualDays < 6) {
    systemAlerts.push({
      pillar: 'MarginReset',
      issue: 'Spiritual De-alignment',
      detail: `Quiet time rate is ${spiritualDays}/7. Defend the early morning silence.`,
      severity: 'moderate'
    });
  }
  if (relationalCalls < 5) {
    systemAlerts.push({
      pillar: 'MarginReset',
      issue: 'Relational Presence Deficit',
      detail: `Only ${relationalCalls} check-in calls. Connect with 1 client/friend today.`,
      severity: 'moderate'
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Sidebar Command Console */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        {/* Coach Header Emblem */}
        <div className="geometric-card p-6 bg-slate-900 border-slate-800 text-white flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="font-extrabold text-white text-lg">Ω</span>
            </div>
            <div>
              <h3 className="font-bold tracking-tight text-sm leading-tight text-white">SYSTEMS COACH</h3>
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Online • Direct Diagnostics</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic border-l-2 border-emerald-500 pl-3 py-1 font-medium">
            "Measure → Adjust → Improve. No-BS accountability for Christopher's Twin Focus."
          </p>
        </div>

        {/* Real-time System Alerts */}
        <div className="geometric-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
              Active System Variances
            </span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {systemAlerts.length} Warnings
            </span>
          </div>

          <div className="flex flex-col gap-3 min-h-[120px]">
            {systemAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 animate-bounce" />
                <span className="text-xs font-bold text-emerald-700">Perfect Execution Mode</span>
                <span className="text-[10px] text-slate-400 mt-1">Zero leaks detected in your Twin Focus.</span>
              </div>
            ) : (
              systemAlerts.map((alert, idx) => (
                <div key={idx} className="p-3 rounded border border-rose-100 bg-rose-50/30 flex items-start gap-2.5">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    alert.severity === 'critical' ? 'bg-rose-600 animate-ping' : alert.severity === 'high' ? 'bg-orange-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
                      <span>{alert.issue}</span>
                      <span className="font-medium lowercase bg-rose-100 text-rose-700 px-1 rounded">{alert.pillar}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium leading-normal">{alert.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Accountability Milestones */}
        <div className="geometric-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              Target Checklist Metrics
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Cycle</span>
          </div>
          
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Eating Window (5+ days)</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${eatingWindowCount >= 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{eatingWindowCount}/7</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Gym Cadence (3 days)</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${gymDays >= 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{gymDays}/3</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Writing Margin (2.5kw)</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${writingOutput >= 2500 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{writingOutput}w</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">80/10/10 Audit Check (7)</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${financialDays >= 7 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{financialDays}/7</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Spiritual Rhythm (7 days)</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${spiritualDays >= 7 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{spiritualDays}/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive AI Terminal */}
      <div className="lg:col-span-2 geometric-card flex flex-col h-[580px] bg-slate-950 border-slate-800 shadow-2xl relative">
        {/* Terminal Header */}
        <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="text-emerald-500 w-4 h-4" />
            <span className="font-mono text-xs font-bold text-slate-300">TWIN_FOCUS_COACH_CLI_v1.08</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-mono text-slate-500">SECURE SHELL</span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs flex flex-col gap-4 bg-slate-950">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div className="text-[9px] text-slate-500 mb-1 flex gap-2">
                  <span>{msg.role === 'user' ? 'CHRISTOPHER' : 'SYSTEMS_COACH'}</span>
                  <span>•</span>
                  <span>{format(msg.timestamp, 'HH:mm:ss')}</span>
                </div>
                <div
                  className={`p-3 rounded-lg leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-900 text-emerald-400 border border-slate-800 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="self-start flex flex-col items-start max-w-[80%]"
              >
                <div className="text-[9px] text-slate-500 mb-1">SYSTEMS_COACH is analyzing telemetry...</div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollContainerRef} />
        </div>

        {/* Terminal Input Box */}
        <form onSubmit={sendMessage} className="h-16 bg-slate-900 border-t border-slate-800 flex items-center p-3 shrink-0">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 focus-within:ring-1 focus-within:ring-emerald-500/50">
            <span className="text-emerald-500 font-bold font-mono text-sm shrink-0">$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask coach: 'how is my window adherence?' or 'give me gym advice'..."
              className="flex-1 bg-transparent text-emerald-400 focus:outline-none font-mono text-xs placeholder:text-slate-700"
            />
          </div>
          <Button
            type="submit"
            className="ml-3 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 h-10 px-4 font-bold tracking-wider font-mono text-xs uppercase"
          >
            <Send className="w-3.5 h-3.5" />
            EXEC
          </Button>
        </form>
      </div>
    </div>
  );
}

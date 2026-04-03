import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { milestones as milestonesApi, plans, employees } from '@/lib/api';
import Navigation from '@/components/Navigation';
import ChatWidget from '@/components/ChatWidget';
import ProgressRing from '@/components/ProgressRing';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, Zap, BookOpen, Building, MapPin, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

const PHASES = [
  { key: 'day_0_7', label: 'Day 0-7', sublabel: 'Essentials & Access', color: '#10B981' },
  { key: 'week_2_4', label: 'Week 2-4', sublabel: 'Role Foundations', color: '#2563EB' },
  { key: 'day_30_60', label: 'Day 30-60', sublabel: 'Deeper Ownership', color: '#C9A84C' },
  { key: 'day_60_90', label: 'Day 60-90', sublabel: 'Autonomy & Impact', color: '#8B5CF6' },
];

const CAT_ICONS = { essentials: Zap, access: Building, training: BookOpen, culture: MapPin, deliverable: CheckCircle2, review: CalendarDays };

export default function PlanView() {
  const { user } = useAuth();
  const [emp, setEmp] = useState(null);
  const [allMilestones, setMilestones] = useState([]);
  const [activePhase, setActivePhase] = useState('day_0_7');

  const employeeId = user?.employee_id;
  const isEngineering = emp?.role?.toLowerCase().includes('engineer');
  const accentColor = isEngineering ? '#2563EB' : '#C9A84C';

  useEffect(() => {
    if (!employeeId) return;
    employees.get(employeeId).then(r => setEmp(r.data)).catch(() => {});
    milestonesApi.list(employeeId).then(r => setMilestones(r.data)).catch(() => {});
  }, [employeeId]);

  const handleToggle = async (mid) => {
    try {
      const res = await milestonesApi.toggle(mid);
      setMilestones(prev => prev.map(m => m.milestone_id === mid
        ? { ...m, is_completed: res.data.is_completed, completed_at: res.data.completed_at }
        : m
      ));
    } catch {}
  };

  const phaseStats = PHASES.map(p => {
    const items = allMilestones.filter(m => m.phase === p.key);
    const done = items.filter(m => m.is_completed).length;
    return { ...p, total: items.length, done, pct: items.length > 0 ? Math.round((done / items.length) * 100) : 0 };
  });

  const total = allMilestones.length;
  const completed = allMilestones.filter(m => m.is_completed).length;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const phaseMilestones = allMilestones.filter(m => m.phase === activePhase);

  if (!employeeId) return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Navigation />
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-[#A1A1AA]">No employee profile linked.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1E]" data-testid="plan-view">
      <Navigation />
      <ChatWidget />

      <main className="max-w-[1400px] mx-auto px-6 py-8 md:px-12 md:py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white mb-2">90-Day Plan</h1>
          <p className="text-base text-[#A1A1AA]">
            Your personalized onboarding journey as <span style={{ color: accentColor }}>{emp?.role}</span>
          </p>
        </motion.div>

        {/* Progress Rings */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <ProgressRing progress={overallPct} size={120} strokeWidth={8} color={accentColor} label="Overall" sublabel={`${completed}/${total} tasks`} />
          </motion.div>
          {phaseStats.map((p, i) => (
            <motion.div key={p.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
              data-testid={`progress-ring-${p.key}`}>
              <ProgressRing progress={p.pct} size={100} strokeWidth={6} color={p.color} label={p.label} sublabel={`${p.done}/${p.total}`} />
            </motion.div>
          ))}
        </div>

        {/* Phase Tabs */}
        <Tabs value={activePhase} onValueChange={setActivePhase} className="mt-10">
          <TabsList className="bg-[#111626] border border-white/[0.06] p-1 rounded-lg h-auto flex-wrap">
            {PHASES.map((p) => (
              <TabsTrigger
                key={p.key}
                value={p.key}
                data-testid={`phase-tab-${p.key}`}
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-[#A1A1AA] rounded-md px-4 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {PHASES.map((phase) => (
            <TabsContent key={phase.key} value={phase.key} className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">{phase.label}: {phase.sublabel}</h2>
              </div>
              <div className="space-y-3">
                {allMilestones.filter(m => m.phase === phase.key).map((ms, i) => {
                  const Icon = CAT_ICONS[ms.category] || Zap;
                  return (
                    <motion.div
                      key={ms.milestone_id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      data-testid={`milestone-${ms.milestone_id}`}
                      className={`glass-card rounded-xl p-5 flex items-start gap-4 hover:translate-y-[-2px] transition-transform duration-200 ${ms.is_completed ? 'opacity-60' : ''}`}
                      style={{ borderLeft: `3px solid ${phase.color}` }}
                    >
                      <Checkbox
                        checked={ms.is_completed}
                        onCheckedChange={() => handleToggle(ms.milestone_id)}
                        data-testid={`milestone-check-${ms.milestone_id}`}
                        className="mt-0.5 border-white/20 data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4" style={{ color: phase.color }} />
                          <span className={`text-sm font-semibold ${ms.is_completed ? 'line-through text-[#71717A]' : 'text-white'}`}>{ms.title}</span>
                        </div>
                        <p className="text-xs text-[#A1A1AA]">{ms.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-[10px] border-white/10 text-[#71717A] capitalize">{ms.category}</Badge>
                          <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due {new Date(ms.due_date).toLocaleDateString()}
                          </span>
                          {ms.is_completed && (
                            <span className="text-[10px] text-[#10B981] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

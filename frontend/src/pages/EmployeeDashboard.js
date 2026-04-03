import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { milestones as milestonesApi, nudges as nudgesApi, lms, calendar, employees } from '@/lib/api';
import Navigation from '@/components/Navigation';
import ChatWidget from '@/components/ChatWidget';
import ProgressRing from '@/components/ProgressRing';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Clock, AlertTriangle, Bell, BookOpen, CalendarDays, Zap, MapPin, Building } from 'lucide-react';
import { motion } from 'framer-motion';

const PHASE_LABELS = { day_0_7: 'Day 0-7', week_2_4: 'Week 2-4', day_30_60: 'Day 30-60', day_60_90: 'Day 60-90' };
const PHASE_COLORS = { day_0_7: '#10B981', week_2_4: '#2563EB', day_30_60: '#C9A84C', day_60_90: '#8B5CF6' };
const CAT_ICONS = { essentials: Zap, access: Building, training: BookOpen, culture: MapPin, deliverable: CheckCircle2, review: CalendarDays };

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [emp, setEmp] = useState(null);
  const [allMilestones, setMilestones] = useState([]);
  const [nudgeList, setNudges] = useState([]);
  const [lmsList, setLms] = useState([]);
  const [events, setEvents] = useState([]);

  const employeeId = user?.employee_id;
  const isEngineering = emp?.role?.toLowerCase().includes('engineer') || emp?.department?.toLowerCase() === 'engineering';
  const accentColor = isEngineering ? '#2563EB' : '#C9A84C';

  useEffect(() => {
    if (!employeeId) return;
    Promise.all([
      employees.get(employeeId).then(r => setEmp(r.data)).catch(() => {}),
      milestonesApi.list(employeeId).then(r => setMilestones(r.data)).catch(() => {}),
      nudgesApi.get(employeeId).then(r => setNudges(r.data)).catch(() => {}),
      lms.get(employeeId).then(r => setLms(r.data)).catch(() => {}),
      calendar.get(employeeId).then(r => setEvents(r.data)).catch(() => {}),
    ]);
  }, [employeeId]);

  if (!employeeId) return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Navigation />
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-[#A1A1AA]">No employee profile linked. Complete onboarding setup first.</p>
      </div>
    </div>
  );

  const total = allMilestones.length;
  const completed = allMilestones.filter(m => m.is_completed).length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const startDate = emp?.start_date ? new Date(emp.start_date) : new Date();
  const dayInJourney = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000));

  const todayTasks = allMilestones
    .filter(m => !m.is_completed && new Date(m.unlock_date) <= new Date())
    .slice(0, 3);

  const unreadNudges = nudgeList.filter(n => !n.is_read);
  const upcomingEvents = events.filter(e => new Date(e.start_time) >= new Date()).slice(0, 4);

  const handleToggle = async (mid) => {
    try {
      const res = await milestonesApi.toggle(mid);
      setMilestones(prev => prev.map(m => m.milestone_id === mid
        ? { ...m, is_completed: res.data.is_completed, completed_at: res.data.completed_at }
        : m
      ));
    } catch {}
  };

  const handleNudgeRead = async (nid) => {
    try {
      await nudgesApi.read(nid);
      setNudges(prev => prev.map(n => n.nudge_id === nid ? { ...n, is_read: true } : n));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E]" data-testid="employee-dashboard">
      <Navigation />
      <ChatWidget />

      <main className="max-w-[1400px] mx-auto px-6 py-8 md:px-12 md:py-12">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white" data-testid="welcome-heading">
            Welcome, {emp?.name?.split(' ')[0] || user.name}
          </h1>
          <p className="text-base text-[#A1A1AA] mt-2">
            Day <span className="text-white font-semibold">{dayInJourney}</span> of your onboarding journey
            <span className="mx-2 text-[#71717A]">|</span>
            <span style={{ color: accentColor }}>{emp?.role}</span>
          </p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-6 flex items-center gap-4" data-testid="stat-progress">
            <ProgressRing progress={progressPct} size={80} strokeWidth={6} color={accentColor} label="" />
            <div>
              <p className="text-2xl font-bold text-white">{completed}/{total}</p>
              <p className="text-sm text-[#A1A1AA]">Tasks Complete</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card rounded-xl p-6" data-testid="stat-day">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#71717A]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Day in Journey</span>
            </div>
            <p className="text-3xl font-bold text-white">{dayInJourney}</p>
            <p className="text-xs text-[#71717A] mt-1">Started {startDate.toLocaleDateString()}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-6" data-testid="stat-training">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-[#71717A]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Training</span>
            </div>
            <p className="text-3xl font-bold text-white">{lmsList.filter(l => l.status === 'completed').length}/{lmsList.length}</p>
            <p className="text-xs text-[#71717A] mt-1">Modules completed</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="glass-card rounded-xl p-6" data-testid="stat-nudges">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-[#71717A]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Nudges</span>
            </div>
            <p className="text-3xl font-bold text-white">{unreadNudges.length}</p>
            <p className="text-xs text-[#71717A] mt-1">Unread reminders</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Top 3 */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-4" data-testid="todays-tasks-heading">
              Today's Top Tasks
            </h2>
            <div className="space-y-3">
              {todayTasks.length === 0 && (
                <div className="glass-card rounded-xl p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-[#10B981]/30 mb-3" />
                  <p className="text-[#A1A1AA]">All caught up! No pending tasks for today.</p>
                </div>
              )}
              {todayTasks.map((task, i) => {
                const Icon = CAT_ICONS[task.category] || Zap;
                const phaseColor = PHASE_COLORS[task.phase] || '#2563EB';
                return (
                  <motion.div
                    key={task.milestone_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    data-testid={`today-task-${i + 1}`}
                    className="glass-card rounded-xl p-5 flex items-start gap-4 hover:translate-y-[-2px] transition-transform duration-200"
                    style={{ borderLeft: `3px solid ${accentColor}` }}
                  >
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleToggle(task.milestone_id)}
                      data-testid={`task-checkbox-${task.milestone_id}`}
                      className="mt-0.5 border-white/20 data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" style={{ color: phaseColor }} />
                        <span className="text-sm font-semibold text-white">{task.title}</span>
                      </div>
                      <p className="text-xs text-[#A1A1AA]">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] border-white/10" style={{ color: phaseColor }}>
                          {PHASE_LABELS[task.phase]}
                        </Badge>
                        <span className="text-[10px] text-[#71717A]">Due {new Date(task.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Nudges */}
            {unreadNudges.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold tracking-tight text-white/90 mb-4" data-testid="nudges-heading">Reminders</h2>
                <div className="space-y-2">
                  {unreadNudges.map((nudge, i) => (
                    <motion.div
                      key={nudge.nudge_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      data-testid={`nudge-${i}`}
                      className="glass-card rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                      onClick={() => handleNudgeRead(nudge.nudge_id)}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${nudge.trigger_type === 'dependency' ? 'bg-[#EF4444]/10' : 'bg-[#C9A84C]/10'}`}>
                        {nudge.trigger_type === 'dependency'
                          ? <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                          : <Bell className="w-4 h-4 text-[#C9A84C]" />}
                      </div>
                      <p className="text-sm text-[#E4E4E7] flex-1">{nudge.message}</p>
                      <span className="text-[10px] text-[#71717A] capitalize">{nudge.trigger_type.replace('_', ' ')}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="glass-card rounded-xl p-6" data-testid="upcoming-events">
              <h3 className="text-xl font-semibold tracking-tight text-white/90 mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#71717A]" /> Upcoming
              </h3>
              {upcomingEvents.length === 0 && <p className="text-sm text-[#71717A]">No upcoming events</p>}
              <div className="space-y-3">
                {upcomingEvents.map((evt) => (
                  <div key={evt.event_id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]" data-testid={`event-${evt.event_id}`}>
                    <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex flex-col items-center justify-center text-[#2563EB]">
                      <span className="text-[10px] font-bold">{new Date(evt.start_time).toLocaleDateString('en', { month: 'short' })}</span>
                      <span className="text-sm font-bold leading-none">{new Date(evt.start_time).getDate()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{evt.title}</p>
                      <p className="text-[10px] text-[#71717A]">
                        {new Date(evt.start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Training */}
            <div className="glass-card rounded-xl p-6" data-testid="training-progress">
              <h3 className="text-xl font-semibold tracking-tight text-white/90 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#71717A]" /> Training
              </h3>
              <div className="space-y-3">
                {lmsList.map((module) => (
                  <div key={module.assignment_id} className="flex items-center gap-3" data-testid={`lms-${module.assignment_id}`}>
                    <div className={`w-2 h-2 rounded-full ${module.status === 'completed' ? 'bg-[#10B981]' : module.status === 'in_progress' ? 'bg-[#2563EB]' : 'bg-[#71717A]'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-white">{module.module_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${module.module_type === 'mandatory' ? 'border-[#EF4444]/20 text-[#EF4444]' : 'border-white/10 text-[#71717A]'}`}>
                          {module.module_type}
                        </Badge>
                        <span className={`text-[10px] capitalize ${module.status === 'completed' ? 'text-[#10B981]' : module.status === 'in_progress' ? 'text-[#2563EB]' : 'text-[#71717A]'}`}>
                          {module.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

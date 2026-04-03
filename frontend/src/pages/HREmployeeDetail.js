import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employees, milestones as milestonesApi, lms, calendar, nudges as nudgesApi, notes as notesApi, hr } from '@/lib/api';
import Navigation from '@/components/Navigation';
import ProgressRing from '@/components/ProgressRing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, BookOpen, CalendarDays, MapPin,
  Pencil, PauseCircle, StickyNote, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';

const PHASE_LABELS = { day_0_7: 'Day 0-7', week_2_4: 'Week 2-4', day_30_60: 'Day 30-60', day_60_90: 'Day 60-90' };
const PHASE_COLORS = { day_0_7: '#10B981', week_2_4: '#2563EB', day_30_60: '#C9A84C', day_60_90: '#8B5CF6' };

export default function HREmployeeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [allMilestones, setMilestones] = useState([]);
  const [lmsList, setLms] = useState([]);
  const [events, setEvents] = useState([]);
  const [nudgeList, setNudges] = useState([]);
  const [noteList, setNotes] = useState([]);

  // Override form
  const [overrideAction, setOverrideAction] = useState('');
  const [overrideMilestone, setOverrideMilestone] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    employees.get(id).then(r => setEmp(r.data)).catch(() => {});
    milestonesApi.list(id).then(r => setMilestones(r.data)).catch(() => {});
    lms.get(id).then(r => setLms(r.data)).catch(() => {});
    calendar.get(id).then(r => setEvents(r.data)).catch(() => {});
    nudgesApi.get(id).then(r => setNudges(r.data)).catch(() => {});
    notesApi.get(id).then(r => setNotes(r.data)).catch(() => {});
  }, [id]);

  const isEng = emp?.role?.toLowerCase().includes('engineer');
  const accentColor = isEng ? '#2563EB' : '#C9A84C';
  const total = allMilestones.length;
  const completed = allMilestones.filter(m => m.is_completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const startDate = emp?.start_date ? new Date(emp.start_date) : new Date();
  const dayInJourney = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000));
  const incompleteMilestones = allMilestones.filter(m => !m.is_completed);

  const handleOverride = async () => {
    if (!overrideAction || !overrideReason) return;
    setSubmitting(true);
    try {
      await hr.override({
        employee_id: id,
        action: overrideAction,
        milestone_id: overrideMilestone || null,
        reason: overrideReason,
        new_due_date: overrideDate || null,
        note: overrideNote || null,
      });
      // Refresh data
      milestonesApi.list(id).then(r => setMilestones(r.data));
      notesApi.get(id).then(r => setNotes(r.data));
      setOverrideAction(''); setOverrideMilestone(''); setOverrideReason(''); setOverrideNote(''); setOverrideDate('');
    } catch {}
    setSubmitting(false);
  };

  if (!emp) return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Navigation />
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1E]" data-testid="hr-employee-detail">
      <Navigation />

      <main className="max-w-[1400px] mx-auto px-6 py-8 md:px-12 md:py-12">
        <Button variant="ghost" onClick={() => navigate('/hr')} className="text-[#A1A1AA] hover:text-white mb-4" data-testid="back-to-hr">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${accentColor}20`, color: accentColor }}>
            {emp.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-black tracking-tighter text-white">{emp.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span style={{ color: accentColor }} className="font-medium">{emp.role}</span>
              <span className="text-[#71717A]">|</span>
              <span className="text-[#A1A1AA] text-sm">{emp.department}</span>
              <span className="text-[#71717A]">|</span>
              <span className="text-[#A1A1AA] text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{emp.location}</span>
              <span className="text-[#71717A]">|</span>
              <span className="text-[#A1A1AA] text-sm">Day {dayInJourney}/90</span>
            </div>
          </div>
          <ProgressRing progress={pct} size={100} strokeWidth={8} color={accentColor} label="Progress" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Milestones & Training */}
          <div className="lg:col-span-2 space-y-6">
            {/* Milestones by phase */}
            {Object.entries(PHASE_LABELS).map(([phase, label]) => {
              const items = allMilestones.filter(m => m.phase === phase);
              if (items.length === 0) return null;
              const done = items.filter(m => m.is_completed).length;
              return (
                <div key={phase} className="glass-card rounded-xl overflow-hidden" data-testid={`phase-section-${phase}`}>
                  <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PHASE_COLORS[phase] }} />
                      <h3 className="text-sm font-semibold text-white">{label}</h3>
                    </div>
                    <span className="text-xs text-[#A1A1AA]">{done}/{items.length} completed</span>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {items.map((ms) => (
                      <div key={ms.milestone_id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02]" data-testid={`hr-milestone-${ms.milestone_id}`}>
                        {ms.is_completed
                          ? <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                          : <Clock className="w-4 h-4 text-[#71717A] shrink-0" />
                        }
                        <div className="flex-1">
                          <p className={`text-sm ${ms.is_completed ? 'text-[#71717A] line-through' : 'text-white'}`}>{ms.title}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-white/10 text-[#71717A] capitalize">{ms.category}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* LMS */}
            <div className="glass-card rounded-xl p-5" data-testid="hr-lms-section">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#71717A]" />Training Modules</h3>
              <div className="space-y-2">
                {lmsList.map((m) => (
                  <div key={m.assignment_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                    <div className={`w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-[#10B981]' : m.status === 'in_progress' ? 'bg-[#2563EB]' : 'bg-[#71717A]'}`} />
                    <span className="text-sm text-white flex-1">{m.module_name}</span>
                    <Badge className={`text-[10px] ${m.module_type === 'mandatory' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-white/5 text-[#71717A]'}`}>{m.module_type}</Badge>
                    <span className={`text-[10px] capitalize ${m.status === 'completed' ? 'text-[#10B981]' : m.status === 'in_progress' ? 'text-[#2563EB]' : 'text-[#71717A]'}`}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Override Panel + Events + Notes */}
          <div className="space-y-6">
            {/* Override Panel - HR Admin only */}
            {user?.role === 'hr_admin' && (
              <div className="glass-card rounded-xl p-5" data-testid="override-panel" style={{ borderTop: `2px solid ${accentColor}` }}>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#C9A84C]" /> Human Override
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[#A1A1AA] text-xs">Action</Label>
                    <Select value={overrideAction} onValueChange={setOverrideAction}>
                      <SelectTrigger data-testid="override-action-select" className="bg-[#111626] border-white/10 text-white mt-1">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111626] border-white/10">
                        <SelectItem value="complete_task" className="text-white">Mark Task Complete</SelectItem>
                        <SelectItem value="update_due_date" className="text-white">Update Due Date</SelectItem>
                        <SelectItem value="add_note" className="text-white">Add Note</SelectItem>
                        <SelectItem value="pause_plan" className="text-white">Pause AI Plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(overrideAction === 'complete_task' || overrideAction === 'update_due_date') && (
                    <div>
                      <Label className="text-[#A1A1AA] text-xs">Milestone</Label>
                      <Select value={overrideMilestone} onValueChange={setOverrideMilestone}>
                        <SelectTrigger data-testid="override-milestone-select" className="bg-[#111626] border-white/10 text-white mt-1">
                          <SelectValue placeholder="Select milestone" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111626] border-white/10 max-h-[200px]">
                          {incompleteMilestones.map(m => (
                            <SelectItem key={m.milestone_id} value={m.milestone_id} className="text-white text-xs">{m.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {overrideAction === 'update_due_date' && (
                    <div>
                      <Label className="text-[#A1A1AA] text-xs">New Due Date</Label>
                      <Input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)}
                        data-testid="override-date-input"
                        className="bg-[#111626] border-white/10 text-white mt-1" />
                    </div>
                  )}

                  {overrideAction === 'add_note' && (
                    <div>
                      <Label className="text-[#A1A1AA] text-xs">Note</Label>
                      <textarea value={overrideNote} onChange={e => setOverrideNote(e.target.value)}
                        data-testid="override-note-input"
                        className="w-full bg-[#111626] border border-white/10 rounded-md text-white text-sm p-2 mt-1 min-h-[80px] focus:outline-none focus:border-[#2563EB]"
                        placeholder="Add a note to the employee's timeline..." />
                    </div>
                  )}

                  <div>
                    <Label className="text-[#A1A1AA] text-xs">Reason (required)</Label>
                    <Input value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                      data-testid="override-reason-input"
                      placeholder="Why is this override needed?"
                      className="bg-[#111626] border-white/10 text-white mt-1" />
                  </div>

                  <Button
                    onClick={handleOverride}
                    disabled={!overrideAction || !overrideReason || submitting}
                    data-testid="override-submit-button"
                    className="w-full bg-[#C9A84C] hover:bg-[#B8973E] text-[#0A0F1E] font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit Override'}
                  </Button>
                </div>
              </div>
            )}

            {/* Calendar Events */}
            <div className="glass-card rounded-xl p-5" data-testid="hr-calendar-section">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#71717A]" /> Calendar Events
              </h3>
              <div className="space-y-2">
                {events.slice(0, 6).map(evt => (
                  <div key={evt.event_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                    <div className="w-8 h-8 rounded-md bg-[#2563EB]/10 flex flex-col items-center justify-center text-[#2563EB] text-[10px]">
                      <span className="font-bold">{new Date(evt.start_time).getDate()}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white">{evt.title}</p>
                      <p className="text-[10px] text-[#71717A]">{new Date(evt.start_time).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {noteList.length > 0 && (
              <div className="glass-card rounded-xl p-5" data-testid="hr-notes-section">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-[#71717A]" /> Notes
                </h3>
                <div className="space-y-2">
                  {noteList.map(n => (
                    <div key={n.note_id} className="p-3 rounded-lg bg-white/[0.02] border-l-2 border-[#C9A84C]">
                      <p className="text-sm text-white">{n.note}</p>
                      <p className="text-[10px] text-[#71717A] mt-1">by {n.author_name} - {new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nudges */}
            <div className="glass-card rounded-xl p-5" data-testid="hr-nudges-section">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#71717A]" /> Active Nudges
              </h3>
              <div className="space-y-2">
                {nudgeList.filter(n => !n.is_read).map(n => (
                  <div key={n.nudge_id} className="p-2 rounded-lg bg-white/[0.02] text-sm text-[#E4E4E7]">
                    {n.message}
                  </div>
                ))}
                {nudgeList.filter(n => !n.is_read).length === 0 && (
                  <p className="text-xs text-[#71717A]">No active nudges</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

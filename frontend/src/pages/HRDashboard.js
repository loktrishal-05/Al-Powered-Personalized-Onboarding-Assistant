import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hr } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle2, AlertTriangle, Clock, TrendingUp, BookOpen, MessageCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_STYLES = {
  on_track: { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', label: 'On Track' },
  at_risk: { bg: 'bg-[#C9A84C]/10', text: 'text-[#C9A84C]', label: 'At Risk' },
  behind: { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', label: 'Behind' },
};

export default function HRDashboard() {
  const navigate = useNavigate();
  const [cohort, setCohort] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      hr.cohort().then(r => setCohort(r.data)),
      hr.stats().then(r => setStats(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Navigation />
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const statCards = stats ? [
    { label: 'Total Hires', value: stats.total_employees, icon: Users, color: '#2563EB' },
    { label: 'Completion Rate', value: `${stats.completion_rate}%`, icon: TrendingUp, color: '#10B981' },
    { label: 'Overdue Tasks', value: stats.overdue_tasks, icon: AlertTriangle, color: '#EF4444' },
    { label: 'LMS Completion', value: `${stats.lms_rate}%`, icon: BookOpen, color: '#C9A84C' },
    { label: 'Pending Access', value: stats.pending_access, icon: Clock, color: '#8B5CF6' },
  ] : [];

  return (
    <div className="min-h-screen bg-[#0A0F1E]" data-testid="hr-dashboard">
      <Navigation />

      <main className="max-w-[1400px] mx-auto px-6 py-8 md:px-12 md:py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">HR Dashboard</h1>
          <p className="text-base text-[#A1A1AA] mt-2">Onboarding cohort overview and compliance tracking</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-card rounded-xl p-5" data-testid={`hr-stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-[#A1A1AA] mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Cohort Table */}
        <div className="mt-8 glass-card rounded-xl overflow-hidden" data-testid="cohort-table">
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-xl font-semibold text-white">Active Onboarding Cohort</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Employee', 'Role', 'Day', 'Progress', 'LMS', 'Access', 'Activity', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#A1A1AA]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohort.map((emp, i) => {
                  const st = STATUS_STYLES[emp.status] || STATUS_STYLES.on_track;
                  const isEng = emp.role?.toLowerCase().includes('engineer');
                  const roleColor = isEng ? '#2563EB' : '#C9A84C';
                  return (
                    <motion.tr
                      key={emp.employee_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => navigate(`/hr/employee/${emp.employee_id}`)}
                      data-testid={`cohort-row-${emp.employee_id}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${roleColor}20`, color: roleColor }}>
                            {emp.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{emp.name}</p>
                            <p className="text-[10px] text-[#71717A]">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium" style={{ color: roleColor }}>{emp.role}</span>
                        <p className="text-[10px] text-[#71717A]">{emp.department}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-white font-semibold">{emp.day_in_journey}</span>
                        <span className="text-[10px] text-[#71717A] ml-1">/ 90</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${emp.progress_pct}%`, background: roleColor }} />
                          </div>
                          <span className="text-xs text-white">{emp.progress_pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-white">{emp.lms_completed}/{emp.lms_total}</span>
                      </td>
                      <td className="px-5 py-4">
                        {emp.pending_access > 0
                          ? <Badge className="bg-[#EF4444]/10 text-[#EF4444] text-[10px] hover:bg-[#EF4444]/20">{emp.pending_access} pending</Badge>
                          : <Badge className="bg-[#10B981]/10 text-[#10B981] text-[10px] hover:bg-[#10B981]/20">All clear</Badge>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-xs text-[#A1A1AA]">
                          <MessageCircle className="w-3 h-3" /> {emp.chat_count}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={`${st.bg} ${st.text} text-[10px] hover:opacity-80`}>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight className="w-4 h-4 text-[#71717A]" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

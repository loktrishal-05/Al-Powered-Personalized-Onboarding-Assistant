import React, { useState, useEffect } from 'react';
import { audit } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Shield, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const ACTION_COLORS = {
  plan_generated: '#2563EB',
  milestone_completed: '#10B981',
  milestone_toggled: '#C9A84C',
  override_complete_task: '#8B5CF6',
  override_update_due_date: '#C9A84C',
  override_add_note: '#71717A',
  override_pause_plan: '#EF4444',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    audit.list().then(r => setLogs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? logs.filter(l => l.action.includes(filter.toLowerCase()) || l.actor_name.toLowerCase().includes(filter.toLowerCase()) || l.target_id.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="min-h-screen bg-[#0A0F1E]" data-testid="audit-log-page">
      <Navigation />

      <main className="max-w-[1400px] mx-auto px-6 py-8 md:px-12 md:py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white flex items-center gap-3">
              <Shield className="w-10 h-10 text-[#2563EB]" /> Audit Log
            </h1>
            <p className="text-base text-[#A1A1AA] mt-2">All system actions and overrides are recorded here</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              data-testid="audit-filter-input"
              className="pl-9 bg-[#111626] border-white/10 text-white placeholder:text-[#71717A]"
            />
          </div>
        </motion.div>

        <div className="glass-card rounded-xl overflow-hidden" data-testid="audit-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Timestamp', 'Actor', 'Action', 'Target', 'Details'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#A1A1AA] font-sans">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-[#71717A]">Loading...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-[#71717A]">No logs found</td></tr>
                )}
                {filtered.map((log, i) => {
                  const color = ACTION_COLORS[log.action] || '#71717A';
                  return (
                    <motion.tr
                      key={log.log_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                      data-testid={`audit-row-${log.log_id}`}
                    >
                      <td className="px-5 py-3 text-xs text-[#A1A1AA] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-sm text-white">{log.actor_name}</td>
                      <td className="px-5 py-3">
                        <Badge className="text-[10px]" style={{ background: `${color}15`, color }}>{log.action.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#A1A1AA]">
                        <span className="text-[#71717A]">{log.target_type}:</span> {log.target_id}
                      </td>
                      <td className="px-5 py-3 text-xs text-[#71717A] max-w-[200px] truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
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

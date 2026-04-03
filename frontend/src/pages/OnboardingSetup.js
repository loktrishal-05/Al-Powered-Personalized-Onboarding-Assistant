import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { onboarding } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnboardingSetup() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '',
    role: '', department: '', seniority: '',
    location: '', start_date: new Date().toISOString().split('T')[0],
    manager_name: '', team: '', timezone_str: 'UTC', is_remote: false
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onboarding.intake(form);
      await checkAuth();
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E]" data-testid="onboarding-setup">
      <Navigation />
      <main className="max-w-[800px] mx-auto px-6 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#2563EB]/10 flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-7 h-7 text-[#2563EB]" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">Onboarding Setup</h1>
          <p className="text-base text-[#A1A1AA] mt-2">Tell us about yourself and we'll create your personalized 90-day plan</p>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={handleSubmit} className="glass-card rounded-xl p-8 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-[#A1A1AA] text-xs">Full Name</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required
                data-testid="intake-name" className="bg-[#111626] border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-[#A1A1AA] text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                data-testid="intake-email" className="bg-[#111626] border-white/10 text-white mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-[#A1A1AA] text-xs">Role</Label>
              <Select value={form.role} onValueChange={v => set('role', v)}>
                <SelectTrigger data-testid="intake-role" className="bg-[#111626] border-white/10 text-white mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#111626] border-white/10">
                  <SelectItem value="Software Engineer" className="text-white">Software Engineer</SelectItem>
                  <SelectItem value="Marketing Manager" className="text-white">Marketing Manager</SelectItem>
                  <SelectItem value="Sales Representative" className="text-white">Sales Representative</SelectItem>
                  <SelectItem value="Product Manager" className="text-white">Product Manager</SelectItem>
                  <SelectItem value="Data Analyst" className="text-white">Data Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#A1A1AA] text-xs">Department</Label>
              <Select value={form.department} onValueChange={v => set('department', v)}>
                <SelectTrigger data-testid="intake-department" className="bg-[#111626] border-white/10 text-white mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-[#111626] border-white/10">
                  <SelectItem value="Engineering" className="text-white">Engineering</SelectItem>
                  <SelectItem value="Marketing" className="text-white">Marketing</SelectItem>
                  <SelectItem value="Sales" className="text-white">Sales</SelectItem>
                  <SelectItem value="Product" className="text-white">Product</SelectItem>
                  <SelectItem value="Data" className="text-white">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <Label className="text-[#A1A1AA] text-xs">Seniority</Label>
              <Select value={form.seniority} onValueChange={v => set('seniority', v)}>
                <SelectTrigger data-testid="intake-seniority" className="bg-[#111626] border-white/10 text-white mt-1">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent className="bg-[#111626] border-white/10">
                  <SelectItem value="L1" className="text-white">L1 - Junior</SelectItem>
                  <SelectItem value="L2" className="text-white">L2 - Mid</SelectItem>
                  <SelectItem value="L3" className="text-white">L3 - Senior</SelectItem>
                  <SelectItem value="L4" className="text-white">L4 - Staff</SelectItem>
                  <SelectItem value="L5" className="text-white">L5 - Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#A1A1AA] text-xs">Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} required
                placeholder="e.g., Remote - Bangalore"
                data-testid="intake-location" className="bg-[#111626] border-white/10 text-white mt-1 placeholder:text-[#71717A]" />
            </div>
            <div>
              <Label className="text-[#A1A1AA] text-xs">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required
                data-testid="intake-start-date" className="bg-[#111626] border-white/10 text-white mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-[#A1A1AA] text-xs">Manager Name</Label>
              <Input value={form.manager_name} onChange={e => set('manager_name', e.target.value)} required
                data-testid="intake-manager" className="bg-[#111626] border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-[#A1A1AA] text-xs">Team</Label>
              <Input value={form.team} onChange={e => set('team', e.target.value)} required
                data-testid="intake-team" className="bg-[#111626] border-white/10 text-white mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-[#A1A1AA] text-xs">Timezone</Label>
              <Select value={form.timezone_str} onValueChange={v => set('timezone_str', v)}>
                <SelectTrigger data-testid="intake-timezone" className="bg-[#111626] border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111626] border-white/10">
                  <SelectItem value="Asia/Kolkata" className="text-white">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="Europe/London" className="text-white">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York" className="text-white">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles" className="text-white">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="UTC" className="text-white">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2 pb-2">
                <Checkbox
                  checked={form.is_remote}
                  onCheckedChange={v => set('is_remote', v)}
                  data-testid="intake-remote"
                  className="border-white/20"
                />
                <Label className="text-white text-sm">Remote Employee</Label>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading || !form.role || !form.department}
            data-testid="intake-submit-button"
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium h-12 text-base">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Generating your plan...</> : 'Create My 90-Day Plan'}
          </Button>
        </motion.form>
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { seed } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      if (data.role === 'hr_admin') navigate('/hr');
      else if (data.employee_id) navigate('/dashboard');
      else navigate('/onboarding/setup');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seed();
      setError('');
      alert('Demo data seeded! You can now login with demo accounts.');
    } catch {
      setError('Seed failed');
    }
    setSeeding(false);
  };

  const demoAccounts = [
    { label: 'Priya (SWE)', email: 'priya@example.com', color: '#2563EB' },
    { label: 'Marcus (Marketing)', email: 'marcus@example.com', color: '#C9A84C' },
    { label: 'HR Admin', email: 'admin@example.com', color: '#10B981' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#2563EB]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#C9A84C]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md" data-testid="login-page">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-['Plus_Jakarta_Sans'] font-black text-4xl text-white tracking-tight">
            Copilot<span className="text-[#2563EB]">.</span>
          </h1>
          <p className="text-[#A1A1AA] mt-2 text-base">Employee Onboarding Assistant</p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                placeholder="Enter your email"
                className="bg-[#111626] border-white/10 text-white placeholder:text-[#71717A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-sm">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                placeholder="Enter your password"
                className="bg-[#111626] border-white/10 text-white placeholder:text-[#71717A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            {error && <p className="text-[#EF4444] text-sm" data-testid="login-error">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium h-11"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-[#13192B] px-3 text-[#71717A]">or</span></div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            data-testid="google-login-button"
            className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 h-11"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>
        </div>

        {/* Demo Accounts */}
        <div className="mt-6 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">Demo Accounts</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeed}
              disabled={seeding}
              data-testid="seed-button"
              className="text-xs border-white/10 bg-white/5 text-[#A1A1AA] hover:text-white hover:bg-white/10 h-7"
            >
              {seeding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Seed Data
            </Button>
          </div>
          <div className="space-y-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => { setEmail(acc.email); setPassword('demo123'); }}
                data-testid={`demo-account-${acc.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/5 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: `${acc.color}20`, color: acc.color }}>
                  {acc.label.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white group-hover:text-white">{acc.label}</p>
                  <p className="text-xs text-[#71717A]">{acc.email}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#71717A] mt-3 text-center">Password for all: demo123</p>
        </div>
      </div>
    </div>
  );
}

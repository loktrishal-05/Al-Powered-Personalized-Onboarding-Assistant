import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setUserData } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');

    if (!sessionId) {
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await auth.session(sessionId);
        const data = res.data;
        if (data.token) localStorage.setItem('auth_token', data.token);
        setUserData(data);

        window.history.replaceState(null, '', '/dashboard');
        if (data.role === 'hr_admin') navigate('/hr', { replace: true, state: { user: data } });
        else if (data.employee_id) navigate('/dashboard', { replace: true, state: { user: data } });
        else navigate('/onboarding/setup', { replace: true, state: { user: data } });
      } catch {
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, setUserData]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1E]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <p className="text-[#A1A1AA] text-sm">Authenticating...</p>
      </div>
    </div>
  );
}

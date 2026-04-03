import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, CalendarRange, Users, Shield, LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (!user) return null;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const employeeLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/plan', label: '90-Day Plan', icon: CalendarRange },
  ];

  const hrLinks = [
    { path: '/hr', label: 'HR Dashboard', icon: Users },
    { path: '/admin/audit', label: 'Audit Log', icon: Shield },
  ];

  const links = user.role === 'hr_admin'
    ? [...hrLinks, ...employeeLinks]
    : user.role === 'manager'
    ? [...employeeLinks, { path: '/hr', label: 'Team View', icon: Users }]
    : employeeLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="glass-header sticky top-0 z-50" data-testid="main-navigation">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
            <span className="font-['Plus_Jakarta_Sans'] font-black text-xl text-white tracking-tight">
              Copilot<span className="text-[#2563EB]">.</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive(link.path)
                    ? 'bg-[#2563EB]/10 text-[#2563EB]'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'}`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-[#71717A] capitalize">{user.role?.replace('_', ' ')}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/20 flex items-center justify-center text-[#2563EB] font-semibold text-sm">
              {user.name?.charAt(0)}
            </div>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={handleLogout}
            data-testid="logout-button"
            className="text-[#A1A1AA] hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="md:hidden text-[#A1A1AA]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0A0F1E] px-6 py-4">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between py-3 text-sm ${isActive(link.path) ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`}
            >
              <span className="flex items-center gap-2"><link.icon className="w-4 h-4" />{link.label}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

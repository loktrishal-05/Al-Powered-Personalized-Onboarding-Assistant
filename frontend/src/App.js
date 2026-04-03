import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import AuthCallback from '@/pages/AuthCallback';
import EmployeeDashboard from '@/pages/EmployeeDashboard';
import PlanView from '@/pages/PlanView';
import HRDashboard from '@/pages/HRDashboard';
import HREmployeeDetail from '@/pages/HREmployeeDetail';
import AuditLog from '@/pages/AuditLog';
import OnboardingSetup from '@/pages/OnboardingSetup';
import { Toaster } from '@/components/ui/sonner';

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/plan" element={<ProtectedRoute><PlanView /></ProtectedRoute>} />
      <Route path="/onboarding/setup" element={<ProtectedRoute><OnboardingSetup /></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute roles={['hr_admin', 'manager']}><HRDashboard /></ProtectedRoute>} />
      <Route path="/hr/employee/:id" element={<ProtectedRoute roles={['hr_admin', 'manager']}><HREmployeeDetail /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute roles={['hr_admin']}><AuditLog /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

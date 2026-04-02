import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/auth';

export function Protected({ children }: { children: React.ReactNode }) {
  const { token, isReady } = useAuth();
  const loc = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="glass rounded-2xl p-6 text-slate-200">تحميل…</div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  return <>{children}</>;
}

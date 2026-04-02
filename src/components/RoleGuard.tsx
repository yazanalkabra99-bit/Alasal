import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, Role, hasAnyRole } from '../state/auth';

export function RoleGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { user, isReady } = useAuth();

  if (!isReady) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Use hasAnyRole which handles multi-role users and admin check
  if (!hasAnyRole(user, allow)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

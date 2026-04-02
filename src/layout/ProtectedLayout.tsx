import React from 'react';
import { Outlet } from 'react-router-dom';
import { Protected } from '../components/Protected';
import { AppShell } from './AppShell';

export function ProtectedLayout() {
  return (
    <Protected>
      <AppShell>
        <Outlet />
      </AppShell>
    </Protected>
  );
}

import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { api } from '../utils/api';

export type Role = 'employee' | 'visa_admin' | 'visa_admin_2' | 'sub_visa_admin' | 'passport_admin' | 'airline_admin' | 'accounting' | 'admin';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;      // Primary role (backward compat)
  roles: Role[];   // All user roles
};

type AuthState = {
  token: string | null;
  user: User | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'asel_token';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function normalizeToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let t = raw.trim();
  if (!t) return null;

  if (t === 'undefined' || t === 'null') return null;

  // Strip quotes if someone stored JSON.stringify(token)
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }

  // Strip Bearer prefix if stored by mistake
  if (t.toLowerCase().startsWith('bearer ')) {
    t = t.slice(7).trim();
  }

  // Reject JSON/object values accidentally stored
  if (t.startsWith('{') || t.startsWith('[')) return null;

  // JWT sanity (3 segments)
  if (t.split('.').length !== 3) return null;

  return t || null;
}

// Backward-compatible extraction (old API shape + new contract shape)
function extractTokenFromLoginBody(body: any): string | null {
  return normalizeToken(body?.data?.token ?? body?.token);
}

function extractUserFromMeBody(body: any): User | null {
  const userData = body?.data ?? body?.user ?? null;
  if (!userData) return null;
  
  // Ensure roles array exists and is non-empty (backward compat)
  let roles = userData.roles;
  if (!Array.isArray(roles) || roles.length === 0) {
    roles = userData.role ? [userData.role] : ['employee'];
  }
  return {
    ...userData,
    roles,
  } as User;
}

function makeClientError(message: string) {
  const e: any = new Error(message);
  // Match Axios-style error shape so LoginPage can show `err.response.data.error`
  e.response = { data: { error: message } };
  return e;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const raw = localStorage.getItem(TOKEN_KEY);
    const t = normalizeToken(raw);
    // Clean up bad values left behind by older builds (e.g. "undefined")
    if (raw && !t) localStorage.removeItem(TOKEN_KEY);
    return t;
  });
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        if (!token) {
          setUser(null);
          return;
        }
        // Token must be applied BEFORE calling /auth/me (important on page refresh)
        const res = await api.get('/auth/me');
        setUser(extractUserFromMeBody(res.data));
      } catch {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, [token]);

  // --- Idle timeout: auto-logout after 30 min of inactivity ---
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLogout = useCallback(() => {
    api.setToken(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return;

    function resetTimer() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer(); // start on mount

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [token, doLogout]);

  const value = useMemo<AuthState>(() => ({
    token,
    user,
    isReady,
    login: async (email, password) => {
      const res = await api.post('/auth/login', { email, password });
      const t = extractTokenFromLoginBody(res.data);
      if (!t) throw makeClientError('مشكلة في استجابة تسجيل الدخول: token مفقود');

      // مهم: حدّث ApiClient فوراً حتى ما يضل يستعمل توكن قديم
      // (الـ interceptor كان يطغى على Authorization المرسل في config)
      api.setToken(t);

      setToken(t);
      localStorage.setItem(TOKEN_KEY, t);

      const me = await api.get('/auth/me');
      setUser(extractUserFromMeBody(me.data));
    },
    logout: () => {
      api.setToken(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    },
    /**
     * Check if current user has ANY of the specified roles
     */
    hasRole: (...roles: Role[]) => {
      if (!user) return false;
      const userRoles = (Array.isArray(user.roles) && user.roles.length > 0) 
        ? user.roles 
        : (user.role ? [user.role] : []);
      
      // Admin has all permissions
      if (userRoles.includes('admin')) return true;
      
      // Check if user has any of the allowed roles
      return roles.some(r => userRoles.includes(r));
    },
  }), [token, user, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// -----------------------------
// Role helpers (UI convenience)
// -----------------------------

// Useful for dropdowns / filters
export const userRoles: Role[] = [
  'employee',
  'visa_admin',
  'visa_admin_2',
  'sub_visa_admin',
  'passport_admin',
  'airline_admin',
  'accounting',
  'admin',
];

export const roleLabels: Record<Role, string> = {
  employee: 'موظف',
  visa_admin: 'مدير فيزا',
  visa_admin_2: 'مدير فيزا ثاني',
  sub_visa_admin: 'مدير فيزا فرعي',
  passport_admin: 'مدير جوازات',
  airline_admin: 'مدير تذاكر',
  accounting: 'محاسبة',
  admin: 'مدير النظام',
};

export const roleDescriptions: Record<Role, string> = {
  employee: 'إدخال طلبات فيزا وجوازات وتذاكر',
  visa_admin: 'إدارة أنواع الفيز المخصصة له',
  visa_admin_2: 'إدارة أنواع فيز محددة فقط',
  sub_visa_admin: 'إدارة أنواع فيز محددة فقط',
  passport_admin: 'إدارة أنواع الجوازات وتحديد المصادر',
  airline_admin: 'إدارة شركات الطيران والموافقة على التذاكر',
  accounting: 'إدارة الحسابات والتحصيل والتقارير المالية',
  admin: 'صلاحيات كاملة على النظام',
};

/**
 * Returns true if the user (or role string) matches ANY of the allowed roles.
 * Supports multi-role users.
 */
export function hasAnyRole(
  roleOrUser: Role | User | null | undefined,
  ...allowed: Array<Role | Role[]>
): boolean {
  // Flatten allowed roles
  const allowedList: Role[] = [];
  for (const item of allowed) {
    if (Array.isArray(item)) allowedList.push(...item);
    else allowedList.push(item);
  }
  
  // Get user roles
  let userRolesList: Role[] = [];
  if (typeof roleOrUser === 'string') {
    userRolesList = [roleOrUser];
  } else if (roleOrUser) {
    const roles = roleOrUser.roles;
    if (Array.isArray(roles) && roles.length > 0) {
      userRolesList = roles;
    } else if (roleOrUser.role) {
      userRolesList = [roleOrUser.role];
    }
  }
  
  if (userRolesList.length === 0) return false;
  
  // Admin has all permissions
  if (userRolesList.includes('admin')) return true;
  
  // Check if user has any of the allowed roles
  return allowedList.some(r => userRolesList.includes(r));
}

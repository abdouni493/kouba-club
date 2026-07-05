import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface SessionUser {
  id: string; // profiles.id === auth.users.id
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'worker' | 'doctor';
  workerId?: string; // workers.id, only set when role === 'worker'
  doctorId?: string; // doctors.id, only set when role === 'doctor'
}

interface Result {
  ok: boolean;
  error?: string;
}

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<Result>;
  register: (a: { name: string; username: string; email: string; password: string }) => Promise<Result>;
  logout: () => Promise<void>;
  updateProfile: (patch: { name?: string; username?: string; email?: string }) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadSessionUser(): Promise<SessionUser | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  
  if (!session) {
    return null;
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, username, email')
      .eq('id', authUser.id)
      .maybeSingle();
    if (!profile) return null;

    if (profile.role === 'worker') {
      const { data: worker } = await supabase
        .from('workers')
        .select('id, account_active')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (!worker || !worker.account_active) {
        await supabase.auth.signOut();
        return null;
      }
      return { id: profile.id, name: profile.full_name, username: profile.username, email: profile.email, role: 'worker', workerId: worker.id };
    }

    if (profile.role === 'doctor') {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id, account_active')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (!doctor || !doctor.account_active) {
        await supabase.auth.signOut();
        return null;
      }
      return { id: profile.id, name: profile.full_name, username: profile.username, email: profile.email, role: 'doctor', doctorId: doctor.id };
    }

    return { id: profile.id, name: profile.full_name, username: profile.username, email: profile.email, role: 'admin' };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    loadSessionUser().then((u) => { if (active) { setUser(u); setLoading(false); } });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') { if (active) setUser(null); return; }
      const u = await loadSessionUser();
      if (active) setUser(u);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user,
    loading,
    login: async (identifier, password) => {
      const id = identifier.trim();
      const { data: resolved, error: resolveError } = await supabase.rpc('resolve_login_email', { p_identifier: id });

      // Fall back to using the typed value directly as an email if we couldn't
      // resolve it via the profiles table (e.g. profile row missing/out of
      // sync) — this keeps email-based login working even if that lookup fails.
      const email = resolved || (id.includes('@') ? id : null);
      if (!email) {
        console.error('resolve_login_email failed:', resolveError?.message || 'no matching profile for', id);
        return { ok: false, error: resolveError ? `resolve_login_email: ${resolveError.message}` : 'invalid' };
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };

      const u = await loadSessionUser();
      if (!u) return { ok: false, error: 'inactive' };
      setUser(u);
      return { ok: true };
    },
    register: async ({ name, username, email, password }) => {
      const { data: available } = await supabase.rpc('identifier_available', { p_username: username, p_email: email });
      if (available === false) return { ok: false, error: 'exists' };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, username, role: 'admin' } },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.session) return { ok: false, error: 'confirm_email' };

      const u = await loadSessionUser();
      setUser(u);
      return { ok: true };
    },
    logout: async () => {
      await supabase.auth.signOut();
      setUser(null);
    },
    updateProfile: async (patch) => {
      if (!user) return { ok: false, error: 'not_authenticated' };
      const updates: Record<string, string> = {};
      if (patch.name !== undefined) updates.full_name = patch.name;
      if (patch.username !== undefined) updates.username = patch.username;
      if (patch.email !== undefined) updates.email = patch.email;

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) return { ok: false, error: error.message };

      if (patch.email && patch.email !== user.email) {
        await supabase.auth.updateUser({ email: patch.email });
      }
      setUser({ ...user, ...patch });
      return { ok: true };
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    refresh: async () => { setUser(await loadSessionUser()); },
  }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}

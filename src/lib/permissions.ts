import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Worker } from './types';

// Worker/HR data (accounts, salaries, permissions themselves) is a hard
// admin-only boundary — this mirrors the RLS policies in supabase/schema.sql
// (workers_read/workers_write and doctors_read/doctors_write are admin-or-self
// only), so a worker can never see or manage the "Employés" / "Médecins"
// screens even if the flag were mistakenly set.
const HARD_ADMIN_ONLY_PAGES = new Set(['workers', 'doctors']);

export interface Permissions {
  isAdmin: boolean;
  worker: Worker | null;
  /** Can this user see the given sidebar page / navigate to its route? */
  canView: (page: string) => boolean;
  /** Can this user use the given action button on the given page? */
  canDo: (page: string, action: string) => boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const { data } = useData();

  const worker = user?.role === 'worker' ? data.workers.find((w) => w.id === user.workerId) || null : null;
  const isAdmin = user?.role === 'admin';

  const canView = (page: string) => {
    if (isAdmin) return true;
    if (HARD_ADMIN_ONLY_PAGES.has(page)) return false;
    if (!worker) return false;
    return page === 'dashboard' || worker.permissions.pages.includes(page);
  };

  const canDo = (page: string, action: string) => {
    if (isAdmin) return true;
    if (HARD_ADMIN_ONLY_PAGES.has(page)) return false;
    if (!worker) return false;
    if (!worker.permissions.pages.includes(page)) return false;
    return (worker.permissions.actions[page] || []).includes(action);
  };

  return { isAdmin, worker, canView, canDo };
}

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { daysUntil } from './utils';
import type { Player } from './types';

export function useLookups() {
  const { data } = useData();
  return useMemo(() => {
    const map = <T extends { id: string }>(arr: T[]) => Object.fromEntries(arr.map((x) => [x.id, x]));
    const cat = map(data.categories), grp = map(data.groups), sp = map(data.sports),
      st = map(data.stadiums), tr = map(data.trainers), tm = map(data.timings),
      sub = map(data.subscriptions), pl = map(data.players), par = map(data.parents),
      role = map(data.roles), ec = map(data.expenseCategories);

    const playerName = (p?: Player) => (p ? `${p.firstName} ${p.lastName}` : '—');
    const playersOfTiming = (timingId: string) =>
      data.players.filter((p) => p.assignedSubscription?.timingId === timingId);
    const playersOfTrainer = (trainerId: string) => {
      const timingIds = data.timings.filter((t) => t.trainerId === trainerId).map((t) => t.id);
      return data.players.filter((p) => p.assignedSubscription && timingIds.includes(p.assignedSubscription.timingId));
    };

    const totalRevenue = data.players.reduce(
      (s, p) => s + p.payments.reduce((a, x) => a + x.amount, 0), 0);
    const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
    const totalMatchExpenses = data.matches.reduce((s, m) => s + m.expenses.reduce((a, x) => a + x.amount, 0), 0);
    const cashDeposits = data.transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const cashWithdraws = data.transactions.filter((t) => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
    const cashBalance = cashDeposits - cashWithdraws + totalRevenue - totalExpenses - totalMatchExpenses;
    const totalDebt = data.players.reduce((s, p) => s + (p.assignedSubscription?.rest || 0), 0);

    const activeSubs = data.players.filter((p) => p.assignedSubscription && daysUntil(p.assignedSubscription.expiryDate) >= 0).length;
    const expiringSoon = data.players.filter((p) => {
      const d = p.assignedSubscription ? daysUntil(p.assignedSubscription.expiryDate) : -999;
      return d >= 0 && d <= 7;
    });
    const expired = data.players.filter((p) => p.assignedSubscription && daysUntil(p.assignedSubscription.expiryDate) < 0);

    return {
      cat, grp, sp, st, tr, tm, sub, pl, par, role, ec,
      catName: (id?: string) => (id && cat[id]?.name) || '—',
      grpName: (id?: string) => (id && grp[id]?.name) || '—',
      spName: (id?: string) => (id && sp[id]?.name) || '—',
      stName: (id?: string) => (id && st[id]?.name) || '—',
      trName: (id?: string) => (id && tr[id]?.fullName) || '—',
      roleName: (id?: string) => (id && role[id]?.name) || '—',
      ecName: (id?: string) => (id && ec[id]?.name) || '—',
      timingName: (id?: string) => (id && tm[id]?.name) || '—',
      subName: (id?: string) => (id && sub[id]?.name) || '—',
      playerName, playersOfTiming, playersOfTrainer,
      totalRevenue, totalExpenses, totalMatchExpenses, cashBalance, totalDebt, activeSubs, expiringSoon, expired,
    };
  }, [data]);
}

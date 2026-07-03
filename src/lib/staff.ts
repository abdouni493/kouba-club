import dayjs from 'dayjs';
import type { MoneyEntry, StaffPayment } from './types';

export function monthsBetween(start: string, end = dayjs().format('YYYY-MM-DD')): string[] {
  const out: string[] = [];
  let cur = dayjs(start).startOf('month');
  const last = dayjs(end).startOf('month');
  let guard = 0;
  while ((cur.isBefore(last) || cur.isSame(last)) && guard < 60) { out.push(cur.format('YYYY-MM')); cur = cur.add(1, 'month'); guard++; }
  return out;
}

export function monthLabel(m: string) {
  return dayjs(m + '-01').format('MMMM YYYY');
}

/** Compute what is still owed for a month/day-based staff member. */
export function computeUnpaid(opts: {
  startDate: string; payType: 'day' | 'month'; amount: number;
  acomptes: MoneyEntry[]; absences: MoneyEntry[]; payments: StaffPayment[];
}) {
  const coveredMonths = new Set(opts.payments.flatMap((p) => p.monthsCovered));
  const coveredAcomptes = new Set(opts.payments.flatMap((p) => p.acompteIds));
  const coveredAbsences = new Set(opts.payments.flatMap((p) => p.absenceIds));

  const allMonths = monthsBetween(opts.startDate);
  const unpaidMonths = allMonths.filter((m) => !coveredMonths.has(m));
  const unpaidAcomptes = opts.acomptes.filter((a) => !coveredAcomptes.has(a.id));
  const unpaidAbsences = opts.absences.filter((a) => !coveredAbsences.has(a.id));

  const gross = opts.payType === 'day'
    ? opts.amount * unpaidMonths.length * 26 // ~26 working days per unpaid month
    : opts.amount * unpaidMonths.length;
  const acomptesTotal = unpaidAcomptes.reduce((s, a) => s + a.amount, 0);
  const absencesTotal = unpaidAbsences.reduce((s, a) => s + a.amount, 0);
  const net = Math.max(0, gross - acomptesTotal - absencesTotal);

  return { unpaidMonths, unpaidAcomptes, unpaidAbsences, gross, acomptesTotal, absencesTotal, net };
}

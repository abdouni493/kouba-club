// ============ Player insurance (assurance) helpers ============
// "Current" insurance for a player = the player_insurances row with the
// latest end_date. It is 'soon' when it expires within 30 days.

import dayjs from 'dayjs';
import type { Player, PlayerInsurance } from './types';

export const INSURANCE_SOON_DAYS = 30;

export type InsuranceStatus = 'none' | 'valid' | 'soon' | 'expired';

export function currentInsurance(p: Player): PlayerInsurance | undefined {
  if (!p.insurances || p.insurances.length === 0) return undefined;
  return [...p.insurances].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
}

export function insuranceStatus(p: Player): { status: InsuranceStatus; current?: PlayerInsurance; days: number } {
  const current = currentInsurance(p);
  if (!current) return { status: 'none', days: 0 };
  const days = dayjs(current.endDate).diff(dayjs(), 'day');
  const status: InsuranceStatus = days < 0 ? 'expired' : days <= INSURANCE_SOON_DAYS ? 'soon' : 'valid';
  return { status, current, days };
}

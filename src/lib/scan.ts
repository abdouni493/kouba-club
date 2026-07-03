// ============ Player card scanning helpers ============
// Player cards encode the player id two ways (see Players → CardPrintModal):
//   - QR code:   `OFC-<player.id>`            e.g. "OFC-pl_1"
//   - Barcode:   <player.id>.slice(-10).toUpperCase()   e.g. "PL_1"
// This module turns any scanned/typed string back into the matching player.

import type { Player } from './types';
import { daysUntil } from './utils';

/** Resolve a scanned (QR/barcode) or manually typed code to a player. */
export function resolvePlayerByCode(raw: string, players: Player[]): Player | undefined {
  const code = (raw || '').trim();
  if (!code) return undefined;

  // Strip the QR prefix ("OFC-") if present, case-insensitive.
  const stripped = code.replace(/^ofc[-_\s]*/i, '');
  const upper = stripped.toUpperCase();
  const rawUpper = code.toUpperCase();

  return (
    players.find((p) => p.id === stripped) ||
    players.find((p) => p.id.toUpperCase() === upper) ||
    players.find((p) => p.id.slice(-10).toUpperCase() === upper) ||
    players.find((p) => p.id.slice(-10).toUpperCase() === rawUpper)
  );
}

export type SubStatus = 'active' | 'soon' | 'expired' | 'none';

/** Subscription state of a player: none / active / soon (≤7d) / expired. */
export function subStatus(player: Player): { status: SubStatus; days: number } {
  const a = player.assignedSubscription;
  if (!a) return { status: 'none', days: 0 };
  const days = daysUntil(a.expiryDate);
  const status: SubStatus = days < 0 ? 'expired' : days <= 7 ? 'soon' : 'active';
  return { status, days };
}

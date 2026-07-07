// ============ Presence / attendance helpers ============
// A player's schedule comes from their assignedSubscription.timingId; the
// timing's `days` array (lowercase 'monday'..'sunday') says which weekdays
// they train. Attendance is one attendance_records row per (player, timing,
// date) — 'present' when scanned/marked, 'absent' when the day is closed.

import dayjs from 'dayjs';
import { WEEK_DAYS, fmtDate } from './utils';
import { sendClubEmail } from './email';
import { sendClubSms, normalizePhoneE164 } from './sms';
import type { AttendanceRecord, ClubInfo, Parent, Player, Timing } from './types';

/** Lowercase weekday name ('monday'..'sunday') of a YYYY-MM-DD date. */
export function weekdayOf(date: string): string {
  return WEEK_DAYS[(dayjs(date).day() + 6) % 7]; // dayjs: 0 = Sunday
}

/** Is this player scheduled to train on the given date (via their assigned timing)? */
export function isScheduledOn(player: Player, timing: Timing | undefined, date: string): boolean {
  if (!player.assignedSubscription || !timing) return false;
  return timing.days.includes(weekdayOf(date));
}

/** The attendance record of a player for a given timing + date, if any. */
export function attendanceOn(player: Player, timingId: string, date: string): AttendanceRecord | undefined {
  return player.attendanceRecords.find((a) => a.timingId === timingId && a.date === date);
}

/**
 * Best-effort e-mail to the player's parent after an attendance record is
 * saved. Never throws — callers count successes/failures for a summary toast.
 */
export async function notifyAttendanceEmail(
  club: ClubInfo, player: Player, parent: Parent | undefined, record: AttendanceRecord, timingName: string,
): Promise<boolean> {
  if (!parent?.email) return false;
  const present = record.status === 'present';
  const subject = `${present ? 'Présence' : 'Absence'} de ${player.firstName} ${player.lastName} — ${fmtDate(record.date)}`;
  const html = `<p>Bonjour ${parent.firstName},</p>
<p>${player.firstName} ${player.lastName} a été marqué(e) <strong>${present ? 'présent(e)' : 'absent(e)'}</strong> à la séance
« ${timingName} » du ${fmtDate(record.date)}.</p>
<p>Cordialement,<br/>${club.name || 'Le club'}</p>`;
  try {
    await sendClubEmail(club, [{ email: parent.email, name: `${parent.firstName} ${parent.lastName}` }], subject, html);
    return true;
  } catch (err) {
    console.error('attendance email failed:', err);
    return false;
  }
}

/**
 * Best-effort SMS to the player's parent after an attendance record is
 * saved, parallel to notifyAttendanceEmail. Never throws.
 */
export async function notifyAttendanceSms(
  player: Player, parent: Parent | undefined, record: AttendanceRecord, timingName: string,
): Promise<boolean> {
  const phone = parent?.phone ? normalizePhoneE164(parent.phone) : null;
  if (!phone) return false;
  const present = record.status === 'present';
  const text = `${present ? 'Présence' : 'Absence'} de ${player.firstName} ${player.lastName} à la séance "${timingName}" du ${fmtDate(record.date)}.`;
  try {
    await sendClubSms(phone, text);
    return true;
  } catch (err) {
    console.error('attendance sms failed:', err);
    return false;
  }
}

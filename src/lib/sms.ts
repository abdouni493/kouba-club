import { supabase } from './supabaseClient';

const SMS_API_URL = '/api/send-sms';
const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * Normalizes a locally-entered phone number to E.164 for Twilio.
 * Numbers without a country code are assumed Algerian (+213), since phone
 * numbers in this app are stored as free text with no country code field.
 */
export function normalizePhoneE164(raw: string): string | null {
  const trimmed = (raw || '').replace(/[\s().-]/g, '');
  if (!trimmed) return null;
  let candidate = trimmed;
  if (candidate.startsWith('00')) candidate = `+${candidate.slice(2)}`;
  else if (candidate.startsWith('0')) candidate = `+213${candidate.slice(1)}`;
  else if (!candidate.startsWith('+')) candidate = `+213${candidate}`;
  return E164.test(candidate) ? candidate : null;
}

/** Sends an SMS through the /api/send-sms proxy (Twilio credentials stay server-side). */
export async function sendClubSms(to: string, body: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous');

  const res = await fetch(SMS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, body }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `Échec de l'envoi du SMS (${res.status})`);
  }
}

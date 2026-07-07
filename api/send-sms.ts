// Vercel serverless function: proxies outbound SMS through Twilio.
// The Twilio Account SID / Auth Token are read from process.env (server-side
// only, no VITE_ prefix) so they never reach the browser bundle, unlike the
// Brevo email key which is already client-exposed today.
import { createClient } from '@supabase/supabase-js';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const E164 = /^\+[1-9]\d{6,14}$/;

interface VercelLikeRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    res.status(500).json({ error: 'Configuration Twilio manquante côté serveur' });
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'Configuration Supabase manquante côté serveur' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: 'Session invalide' });
    return;
  }

  const { to, body } = (req.body || {}) as { to?: string; body?: string };
  if (!to || !E164.test(to)) {
    res.status(400).json({ error: 'Numéro de téléphone invalide (format international requis)' });
    return;
  }
  if (!body || !body.trim()) {
    res.status(400).json({ error: 'Message vide' });
    return;
  }

  try {
    const params = new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body });
    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const json = await twilioRes.json().catch(() => null);
    if (!twilioRes.ok) {
      res.status(twilioRes.status).json({ error: json?.message || `Échec de l'envoi du SMS (${twilioRes.status})` });
      return;
    }
    res.status(200).json({ sid: json?.sid });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' });
  }
}

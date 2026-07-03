import type { ClubInfo } from './types';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY as string | undefined;

export interface EmailRecipient {
  email: string;
  name?: string;
}

/** Sends an HTML email through Brevo, using the club's own address (Settings → Club) as the sender. */
export async function sendClubEmail(club: ClubInfo, to: EmailRecipient[], subject: string, htmlContent: string): Promise<void> {
  if (!BREVO_API_KEY) throw new Error('Clé API Brevo manquante (VITE_BREVO_API_KEY)');
  const recipients = to.filter((r) => r.email);
  if (recipients.length === 0) throw new Error('Aucun destinataire avec e-mail');
  const senderEmail = club.email?.trim();
  if (!senderEmail) throw new Error("Configurez l'e-mail du club dans Paramètres → Club");

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { name: club.name || 'Club', email: senderEmail }, to: recipients, subject, htmlContent }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Échec de l'envoi (${res.status})`);
  }
}

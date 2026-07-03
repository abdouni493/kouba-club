import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ClubInfo, Player, Parent } from './types';
import type { useLookups } from './selectors';
import { money, fmtDate } from './utils';

type Lookups = ReturnType<typeof useLookups>;

// Hardcoded light-theme brand hexes (not the CSS var, which shifts in dark theme) —
// PDFs/print output must look the same regardless of the viewer's app theme.
const ACCENT: [number, number, number] = [234, 88, 12];        // #EA580C
const ACCENT_SOFT: [number, number, number] = [249, 115, 22];  // #F97316
const ACCENT_STRONG: [number, number, number] = [194, 65, 12]; // #C2410C

async function fetchLogoBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface PdfResult {
  base64: string;
  filename: string;
}

export async function buildPlayerSubscriptionPdf(club: ClubInfo, player: Player, parent: Parent | undefined, L: Lookups): Promise<PdfResult> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- header band ----
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageWidth, 90, 'F');
  const logo = club.logo ? await fetchLogoBase64(club.logo) : null;
  if (logo) {
    try { doc.addImage(logo, 40, 20, 50, 50); } catch { /* unsupported/corrupt image — skip silently */ }
  }
  const textX = logo ? 100 : 40;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(club.name || 'Club', textX, 40);
  doc.setFontSize(9);
  const line2 = [club.address, [club.phone, club.email].filter(Boolean).join('  ·  ')].filter(Boolean).join('   ');
  const idBits = [club.nif && `NIF: ${club.nif}`, club.nis && `NIS: ${club.nis}`, club.rc && `RC: ${club.rc}`].filter(Boolean).join('   ');
  doc.text(line2, textX, 58);
  if (idBits) doc.text(idBits, textX, 70);

  // ---- player info ----
  doc.setTextColor(20, 20, 20);
  let y = 120;
  doc.setFontSize(14);
  doc.text(L.playerName(player), 40, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(`${fmtDate(player.birthDate)}  ·  ${player.birthPlace || '—'}`, 40, y);
  y += 14;
  const contactLine = `Tel: ${player.phone || '—'}` + (parent ? `   ·   Parent: ${parent.firstName} ${parent.lastName} (${parent.phone || '—'})` : '');
  doc.text(contactLine, 40, y);
  y += 14;
  doc.text(`Frais d'inscription: ${player.subscriptionCostPaid ? 'Payés' : 'Non payés'}`, 40, y);
  y += 22;

  // ---- subscription section ----
  const a = player.assignedSubscription;
  doc.setFillColor(...ACCENT_SOFT);
  doc.rect(40, y, pageWidth - 80, 2, 'F');
  y += 16;
  if (a) {
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT_STRONG);
    doc.text(L.timingName(a.timingId), 40, y);
    y += 16;
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10);
    doc.text(`${fmtDate(a.startDate)}  →  ${fmtDate(a.expiryDate)}`, 40, y);
    y += 14;
    doc.text(`Prix: ${money(a.price)}    Payé: ${money(a.amountPaid)}    Reste: ${money(a.rest)}`, 40, y);
    y += 20;
  } else {
    doc.setFontSize(10);
    doc.text('Aucun abonnement actif', 40, y);
    y += 20;
  }

  // ---- payment history ----
  const rows = [...player.payments]
    .sort((x, z) => z.date.localeCompare(x.date))
    .map((p) => [fmtDate(p.date), p.note || '—', p.kind, money(p.amount)]);
  autoTable(doc, {
    startY: y + 6,
    head: [['Date', 'Description', 'Type', 'Montant']],
    body: rows,
    headStyles: { fillColor: ACCENT_STRONG },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });

  const raw = doc.output('datauristring');
  const base64 = raw.substring(raw.indexOf('base64,') + 'base64,'.length);
  const filename = `fiche-${player.lastName}-${player.firstName}.pdf`.replace(/\s+/g, '-');
  return { base64, filename };
}

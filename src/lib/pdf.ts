import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ClubInfo, Player, Parent } from './types';
import type { useLookups } from './selectors';
import { money, fmtDate, today } from './utils';

type Lookups = ReturnType<typeof useLookups>;

// Custom premium orange palette for PDF matching the application theme
const ACCENT: [number, number, number] = [255, 90, 0];        // #FF5A00
const ACCENT_SOFT: [number, number, number] = [249, 115, 22];  // #F97316
const ACCENT_STRONG: [number, number, number] = [212, 56, 0];  // #D43800

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

function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, accentColor: [number, number, number]) {
  // Draw light grey background
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(x, y, w, h, 8, 8, 'F');

  // Draw light border
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(1);
  doc.roundedRect(x, y, w, h, 8, 8, 'S');

  // Draw vertical accent bar on the left edge
  doc.setFillColor(...accentColor);
  doc.rect(x + 1, y + 2, 4, h - 4, 'F');

  // Draw title in uppercase bold accent color
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accentColor);
  doc.text(title.toUpperCase(), x + 15, y + 18);
}

export interface PdfResult {
  base64: string;
  filename: string;
}

export async function buildPlayerSubscriptionPdf(club: ClubInfo, player: Player, parent: Parent | undefined, L: Lookups): Promise<PdfResult> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- Decorative Top Accent Bar ----
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // ---- Header Brand Area ----
  const logo = club.logo ? await fetchLogoBase64(club.logo) : null;
  if (logo) {
    try { doc.addImage(logo, 40, 25, 45, 45); } catch { /* skip */ }
  }
  
  const textX = logo ? 95 : 40;
  
  // Club Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(28, 25, 23);
  doc.text(club.name || 'Club', textX, 45);
  
  // Subtitle / tag
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108);
  doc.text(club.address || 'Club de Football', textX, 60);

  // Document Title (Right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...ACCENT);
  doc.text("FICHE DE MEMBRE & ABONNEMENT", pageWidth - 40, 45, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108);
  doc.text(`Éditée le ${fmtDate(today())}`, pageWidth - 40, 60, { align: 'right' });

  // Elegant divider line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(1);
  doc.line(40, 85, pageWidth - 40, 85);

  // ---- Grid Cards: Player Info & Club Info ----
  const cardY = 100;
  const cardH = 120;
  const cardW = 245;

  // 1. Member/Player Card
  drawCard(doc, 40, cardY, cardW, cardH, "Informations du Joueur", ACCENT);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(L.playerName(player), 55, cardY + 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108);
  doc.text(`Né(e) le : ${fmtDate(player.birthDate)} à ${player.birthPlace || '—'}`, 55, cardY + 56);
  doc.text(`Tél : ${player.phone || '—'}`, 55, cardY + 72);
  doc.text(`Email : ${player.email || '—'}`, 55, cardY + 88);

  // Registration Fee Badge inside Player card
  if (player.subscriptionCostPaid) {
    doc.setFillColor(220, 252, 231); // green background
    doc.roundedRect(55, cardY + 97, 135, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61); // dark green
    doc.text("✓ FRAIS D'INSCRIPTION RÉGLÉS", 60, cardY + 107);
  } else {
    doc.setFillColor(254, 226, 226); // red background
    doc.roundedRect(55, cardY + 97, 155, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28); // dark red
    doc.text("✗ FRAIS D'INSCRIPTION NON PAYÉS", 60, cardY + 107);
  }

  // 2. Club Info Card or Parent details if present
  if (parent) {
    drawCard(doc, 310, cardY, cardW, cardH, "Informations du Parent", ACCENT_SOFT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(28, 25, 23);
    doc.text(`${parent.firstName} ${parent.lastName}`, 325, cardY + 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text(`Relation : Parent / Tuteur`, 325, cardY + 56);
    doc.text(`Tél : ${parent.phone || '—'}`, 325, cardY + 72);
    doc.text(`Email : ${parent.email || '—'}`, 325, cardY + 88);
    doc.text(`Adresse : ${parent.address || '—'}`, 325, cardY + 104);
  } else {
    // Show Club Details card if parent is not linked
    drawCard(doc, 310, cardY, cardW, cardH, "Coordonnées du Club", ACCENT_SOFT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(28, 25, 23);
    doc.text(club.name || 'Club de Football', 325, cardY + 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    const addrLines = doc.splitTextToSize(club.address || '—', 210);
    doc.text(addrLines, 325, cardY + 56);
    
    const nextY = cardY + 56 + (addrLines.length * 12);
    doc.text(`Tél : ${club.phone || '—'}`, 325, nextY);
    doc.text(`Email : ${club.email || '—'}`, 325, nextY + 14);
    
    const idList = [club.nif && `NIF: ${club.nif}`, club.rc && `RC: ${club.rc}`].filter(Boolean);
    if (idList.length > 0) {
      doc.setFontSize(8);
      doc.text(idList.join('   '), 325, nextY + 28);
    }
  }

  // ---- Subscription Card ----
  const a = player.assignedSubscription;
  const subY = cardY + cardH + 15;
  const subH = a ? 85 : 60;
  
  if (a) {
    drawCard(doc, 40, subY, pageWidth - 80, subH, "Statut de l'Abonnement Actif", ACCENT_STRONG);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(28, 25, 23);
    doc.text(L.timingName(a.timingId), 55, subY + 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text(`Période de validité : ${fmtDate(a.startDate)} au ${fmtDate(a.expiryDate)}`, 55, subY + 54);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(`Tarif : ${money(a.price)}`, 55, subY + 72);
    doc.setTextColor(21, 128, 61);
    doc.text(`Payé : ${money(a.amountPaid)}`, 160, subY + 72);
    
    if (a.rest > 0) {
      doc.setTextColor(185, 28, 28);
      doc.text(`Reste à régler : ${money(a.rest)}`, 260, subY + 72);
    } else {
      doc.setTextColor(21, 128, 61);
      doc.text(`Solde : Entièrement Réglé ✓`, 260, subY + 72);
    }

    // Badge on the right
    const badgeX = pageWidth - 130;
    const badgeY = subY + 22;
    if (a.status === 'payed') {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(badgeX, badgeY, 90, 20, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(21, 128, 61);
      doc.text("SOLDE PAYÉ", badgeX + 16, badgeY + 13);
    } else {
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(badgeX, badgeY, 90, 20, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28);
      doc.text("CRÉANCE DUE", badgeX + 13, badgeY + 13);
    }
  } else {
    drawCard(doc, 40, subY, pageWidth - 80, subH, "Statut de l'Abonnement", [120, 113, 108]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(120, 113, 108);
    doc.text("Aucun abonnement actif enregistré", 55, subY + 40);
  }

  // ---- Payment History Section ----
  const tableY = subY + subH + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text("HISTORIQUE DES PAIEMENTS", 40, tableY);
  
  doc.setFillColor(...ACCENT);
  doc.rect(40, tableY + 4, 150, 2, 'F');

  const rows = [...player.payments]
    .sort((x, z) => z.date.localeCompare(x.date))
    .map((p) => {
      let typeLabel = '';
      if (p.kind === 'subscription') typeLabel = 'Abonnement';
      else if (p.kind === 'fee') typeLabel = 'Frais d\'inscription';
      else if (p.kind === 'debt') typeLabel = 'Créance';
      else typeLabel = p.kind;
      
      return [
        fmtDate(p.date),
        p.note || '—',
        typeLabel,
        `+${money(p.amount)}`
      ];
    });

  autoTable(doc, {
    startY: tableY + 15,
    head: [['Date', 'Description / Note', 'Type de paiement', 'Montant']],
    body: rows,
    headStyles: {
      fillColor: ACCENT,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      textColor: [28, 25, 23],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 40, right: 40 },
    theme: 'striped',
  });

  const raw = doc.output('datauristring');
  const base64 = raw.substring(raw.indexOf('base64,') + 'base64,'.length);
  const filename = `fiche-${player.lastName}-${player.firstName}.pdf`.replace(/\s+/g, '-');
  return { base64, filename };
}

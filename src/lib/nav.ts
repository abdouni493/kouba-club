import {
  LayoutDashboard, CalendarRange, Ticket, Users, UserSquare2, Dumbbell,
  HardHat, Receipt, Wallet, LineChart, FileBarChart, Settings,
  ClipboardCheck, Flag, Stethoscope,
} from 'lucide-react';
import type { ComponentType } from 'react';
export interface NavItem {
  key: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  group: 'management' | 'finance' | 'system';
  actions?: { key: string; label: string }[];
}

export const NAV: NavItem[] = [
  { key: 'dashboard', path: '/app', icon: LayoutDashboard, group: 'management' },
  {
    key: 'planificateur', path: '/app/planificateur', icon: CalendarRange, group: 'management',
    actions: [{ key: 'view', label: 'Voir détails' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }, { key: 'calendar', label: 'Calendrier' }],
  },
  {
    key: 'subscriptions', path: '/app/subscriptions', icon: Ticket, group: 'management',
    actions: [{ key: 'view', label: 'Voir détails' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  {
    key: 'players', path: '/app/players', icon: Users, group: 'management',
    actions: [{ key: 'view', label: 'Voir détails' }, { key: 'assign', label: 'Assigner abonnement' }, { key: 'card', label: 'Carte' }, { key: 'payDebt', label: 'Payer créance' }, { key: 'evaluate', label: 'Évaluation' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  {
    key: 'presence', path: '/app/presence', icon: ClipboardCheck, group: 'management',
    actions: [{ key: 'mark', label: 'Marquer présence/absence' }, { key: 'close', label: 'Clôturer la journée' }],
  },
  {
    key: 'parents', path: '/app/parents', icon: UserSquare2, group: 'management',
    actions: [{ key: 'view', label: 'Voir détails' }, { key: 'email', label: 'Envoyer e-mail' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  {
    key: 'trainers', path: '/app/trainers', icon: Dumbbell, group: 'management',
    actions: [{ key: 'assign', label: 'Assigner créneaux' }, { key: 'view', label: 'Voir détails' }, { key: 'acompte', label: 'Acomptes' }, { key: 'absence', label: 'Absences' }, { key: 'payment', label: 'Paiement' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  {
    key: 'workers', path: '/app/workers', icon: HardHat, group: 'management',
    actions: [{ key: 'view', label: 'Voir détails' }, { key: 'permissions', label: 'Permissions' }, { key: 'acompte', label: 'Acomptes' }, { key: 'absence', label: 'Absences' }, { key: 'payment', label: 'Paiement' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  {
    key: 'doctors', path: '/app/doctors', icon: Stethoscope, group: 'management',
    actions: [{ key: 'view', label: 'Voir détails' }, { key: 'acompte', label: 'Acomptes' }, { key: 'absence', label: 'Absences' }, { key: 'payment', label: 'Paiement' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  {
    key: 'matches', path: '/app/matches', icon: Flag, group: 'management',
    actions: [{ key: 'view', label: 'Voir détails' }, { key: 'expenses', label: 'Dépenses' }, { key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  {
    key: 'expenses', path: '/app/expenses', icon: Receipt, group: 'finance',
    actions: [{ key: 'edit', label: 'Modifier' }, { key: 'delete', label: 'Supprimer' }],
  },
  { key: 'caisse', path: '/app/caisse', icon: Wallet, group: 'finance' },
  { key: 'analyse', path: '/app/analyse', icon: LineChart, group: 'finance' },
  { key: 'reports', path: '/app/reports', icon: FileBarChart, group: 'finance' },
  { key: 'settings', path: '/app/settings', icon: Settings, group: 'system' },
];

export const NAV_BY_KEY = Object.fromEntries(NAV.map((n) => [n.key, n]));

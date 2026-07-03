import dayjs from 'dayjs';

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

export const CURRENCY = 'DA';

export const money = (n: number) =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))} ${CURRENCY}`;

export const today = () => dayjs().format('YYYY-MM-DD');

export const fmtDate = (d?: string) => (d ? dayjs(d).format('DD MMM YYYY') : '—');

export const addDays = (d: string, days: number) =>
  dayjs(d).add(days, 'day').format('YYYY-MM-DD');

export const daysUntil = (d?: string) => (d ? dayjs(d).diff(dayjs(), 'day') : 0);

export const monthKey = (d: string) => dayjs(d).format('YYYY-MM');

export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const initials = (a?: string, b?: string) =>
  `${(a || '').charAt(0)}${(b || '').charAt(0)}`.toUpperCase() || '?';

// deterministic pastel-orange gradient per id (for avatars / placeholders)
export function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const a = 18 + (h % 26); // hue near orange
  const b = 30 + (h % 14);
  return `linear-gradient(135deg, hsl(${a} 90% 52%), hsl(${b} 92% 42%))`;
}

export function download(filename: string, text: string) {
  const el = document.createElement('a');
  el.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
  el.download = filename;
  el.click();
}

import { type ReactNode, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Inbox, AlertTriangle } from 'lucide-react';
import { cx, gradientFor, initials } from '../../lib/utils';
import Modal from './Modal';

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-grad text-black shadow-glow">{icon}</div>}
        <div>
          <h1 className="font-display text-2xl font-extrabold text-fg leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  success: 'bg-success/15 text-success', danger: 'bg-danger/15 text-danger',
  warning: 'bg-warning/15 text-warning', info: 'bg-info/15 text-info',
  accent: 'bg-accent/15 text-accent', muted: 'bg-surface-3 text-muted',
};

export function Badge({ children, tone = 'muted', className }: { children: ReactNode; tone?: keyof typeof tones | string; className?: string }) {
  return <span className={cx('badge', tones[tone] || tones.muted, className)}>{children}</span>;
}

export function Avatar({ name, id, size = 40, src }: { name: string; id: string; size?: number; src?: string }) {
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <div style={{ width: size, height: size, background: gradientFor(id) }}
      className="grid place-items-center rounded-full font-bold text-black shrink-0"
    >
      <span style={{ fontSize: size * 0.36 }}>{initials(...name.split(' '))}</span>
    </div>
  );
}

export function StatCard({ label, value, icon, tone = 'accent', delta, sub, delay = 0 }: {
  label: string; value: ReactNode; icon: ReactNode; tone?: string; delta?: string; sub?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className="card card-hover p-5 relative overflow-hidden"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: 'rgb(var(--accent))' }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-fg">{value}</p>
          {sub && <p className="text-xs text-faint mt-1">{sub}</p>}
        </div>
        <div className={cx('grid h-11 w-11 place-items-center rounded-xl shrink-0', tones[tone] || tones.accent)}>{icon}</div>
      </div>
      {delta && <div className="mt-3"><Badge tone="success">{delta}</Badge></div>}
    </motion.div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-faint mb-4">
        {icon || <Inbox className="h-7 w-7" />}
      </div>
      <p className="font-semibold text-fg">{title}</p>
      {hint && <p className="text-sm text-muted mt-1 max-w-sm">{hint}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
      <input className="input !pl-10" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; icon?: ReactNode }[]; active: string; onChange: (k: string) => void }) {
  const id = useId();
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-surface-2 border border-line/10 overflow-x-auto no-scrollbar">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={cx('relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors',
            active === t.key ? 'text-black' : 'text-muted hover:text-fg')}>
          {active === t.key && <motion.span layoutId={`tab-pill-${id}`} className="absolute inset-0 -z-0 rounded-lg bg-accent-grad" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
          <span className="relative z-10 flex items-center gap-2">{t.icon}{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirmer', message, confirmLabel = 'Supprimer', danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title?: string; message?: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center py-2">
        <div className={cx('mx-auto grid h-14 w-14 place-items-center rounded-2xl mb-4', danger ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent')}>
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h3 className="font-display text-lg font-bold text-fg">{title}</h3>
        {message && <p className="text-sm text-muted mt-1.5">{message}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={danger ? 'btn-danger flex-1' : 'btn-primary flex-1'}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

/** Small hook-free confirm-on-delete button pattern helper */
export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; action?: () => void; message?: string }>({ open: false });
  const ask = (action: () => void, message?: string) => setState({ open: true, action, message });
  const node = (
    <ConfirmDialog open={state.open} onClose={() => setState({ open: false })}
      onConfirm={() => state.action?.()} message={state.message} />
  );
  return { ask, node };
}

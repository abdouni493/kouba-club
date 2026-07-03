import { useId, useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, ChevronDown } from 'lucide-react';
import { cx } from '../../lib/utils';

export function Field({ label, children, hint, required }: { label?: ReactNode; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <div>
      {label && <label className="label">{label}{required && <span className="text-accent"> *</span>}</label>}
      {children}
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </div>
  );
}

export function Input({ label, required, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input className="input" {...props} />
    </Field>
  );
}

export function Textarea({ label, required, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <Field label={label} required={required}>
      <textarea className="input min-h-[90px] resize-y" {...props} />
    </Field>
  );
}

interface Opt { value: string; label: string }

export function Select({ label, value, onChange, options, placeholder, required }: {
  label?: string; value: string; onChange: (v: string) => void; options: Opt[]; placeholder?: string; required?: boolean;
}) {
  return (
    <Field label={label} required={required}>
      <div className="relative">
        <select
          className="input appearance-none pr-9 cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
      </div>
    </Field>
  );
}

/** Select with the ability to create a new option inline. */
export function CreatableSelect({ label, value, onChange, options, onCreate, placeholder, createLabel = 'Créer' }: {
  label?: string; value: string; onChange: (v: string) => void; options: Opt[];
  onCreate: (name: string) => string; placeholder?: string; createLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    const id = onCreate(name.trim());
    onChange(id);
    setName(''); setAdding(false);
  };

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select className="input appearance-none pr-9 cursor-pointer" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{placeholder || '—'}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        </div>
        <button type="button" onClick={() => setAdding((a) => !a)}
          className={cx('btn-ghost !px-3 shrink-0', adding && 'border-accent/50 text-accent')} title={createLabel}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="flex gap-2 mt-2">
              <input autoFocus className="input flex-1" placeholder={createLabel + '…'} value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
              <button type="button" onClick={submit} className="btn-primary !px-3"><Check className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setAdding(false); setName(''); }} className="btn-ghost !px-3"><X className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Field>
  );
}

const DAYS = [
  { k: 'monday', fr: 'Lun' }, { k: 'tuesday', fr: 'Mar' }, { k: 'wednesday', fr: 'Mer' },
  { k: 'thursday', fr: 'Jeu' }, { k: 'friday', fr: 'Ven' }, { k: 'saturday', fr: 'Sam' }, { k: 'sunday', fr: 'Dim' },
];

export function DaysPicker({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label?: string }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((d) => d !== k) : [...value, k]);
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button key={d.k} type="button" onClick={() => toggle(d.k)}
            className={cx('h-10 w-12 rounded-xl text-sm font-semibold border transition-all duration-200',
              value.includes(d.k)
                ? 'bg-accent-grad text-black border-transparent shadow-glow'
                : 'bg-surface-2 text-muted border-line/10 hover:border-accent/40')}>
            {d.fr}
          </button>
        ))}
      </div>
    </Field>
  );
}

interface SearchOpt { value: string; label: string; sub?: string }
export function SearchSelect({ label, value, onChange, options, placeholder = 'Rechercher…', required }: {
  label?: string; value: string; onChange: (v: string) => void; options: SearchOpt[]; placeholder?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) => (o.label + ' ' + (o.sub || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <Field label={label} required={required}>
      <div className="relative">
        <input className="input pr-9" placeholder={placeholder}
          value={open ? q : selected?.label || ''}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQ(''); }}
          onBlur={() => setTimeout(() => setOpen(false), 160)} />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl bg-surface-2 border border-line/10 shadow-soft p-1.5">
              {filtered.length === 0 && <p className="text-sm text-muted px-3 py-2">Aucun résultat</p>}
              {filtered.map((o) => (
                <button key={o.value} type="button" onMouseDown={() => { onChange(o.value); setOpen(false); }}
                  className={cx('w-full text-left rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-3',
                    o.value === value ? 'bg-accent/15 text-accent' : 'text-fg')}>
                  <span className="font-medium">{o.label}</span>
                  {o.sub && <span className="block text-xs text-muted">{o.sub}</span>}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Field>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div className="inline-flex p-1 rounded-xl bg-surface-2 border border-line/10">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('relative px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors z-10',
            value === o.value ? 'text-black' : 'text-muted hover:text-fg')}>
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-lg bg-accent-grad" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

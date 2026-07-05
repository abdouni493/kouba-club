import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Flag, Plus, Eye, Pencil, Trash2, MapPin, Calendar, Receipt, X, Bus, Hotel, Check, Shirt,
} from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { money, uid, today, fmtDate, daysUntil } from '../lib/utils';
import type { Match, MatchExpense } from '../lib/types';

const emptyForm = { categoryId: '', stadiumId: '', matchDate: today(), opponent: '', description: '' };

export default function Matches() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Match | null>(null);
  const [expensesFor, setExpensesFor] = useState<Match | null>(null);
  const [filter, setFilter] = useState({ categoryId: '', when: '' });

  const cur = (m: Match) => data.matches.find((x) => x.id === m.id) || m;

  const openCreate = () => { setEditId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (m: Match) => {
    setEditId(m.id);
    setForm({ categoryId: m.categoryId, stadiumId: m.stadiumId, matchDate: m.matchDate, opponent: m.opponent, description: m.description });
    setFormOpen(true);
  };

  const save = () => {
    if (!form.opponent.trim()) { toast('Nom de l\'adversaire requis', 'error'); return; }
    if (editId) {
      updateItem('matches', editId, { ...form });
      toast('Match mis à jour', 'success');
    } else {
      add('matches', { id: uid('match'), ...form, expenses: [], createdAt: today() });
      toast('Match créé', 'success');
    }
    setFormOpen(false);
  };

  const filtered = useMemo(() => data.matches
    .filter((m) => !filter.categoryId || m.categoryId === filter.categoryId)
    .filter((m) => {
      if (!filter.when) return true;
      const d = daysUntil(m.matchDate);
      if (filter.when === 'upcoming') return d >= 0;
      return d < 0;
    })
    .sort((a, b) => b.matchDate.localeCompare(a.matchDate)), [data.matches, filter]);

  const totalExpenses = (m: Match) => m.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title={t('nav.matches')} subtitle={`${data.matches.length} matchs / rendez-vous`} icon={<Flag className="h-5 w-5" />}
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />Nouveau match</button>} />

      <div className="card p-4 mb-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select label={t('planner.category')} value={filter.categoryId} onChange={(v) => setFilter((f) => ({ ...f, categoryId: v }))} placeholder={t('common.all')} options={data.categories.map((c) => ({ value: c.id, label: c.name }))} />
        <Select label={t('common.period')} value={filter.when} onChange={(v) => setFilter((f) => ({ ...f, when: v }))} placeholder={t('common.all')} options={[{ value: 'upcoming', label: 'À venir' }, { value: 'past', label: 'Passés' }]} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun match" hint="Créez un match ou un rendez-vous pour une catégorie." icon={<Flag className="h-7 w-7" />} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => {
            const d = daysUntil(m.matchDate);
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="accent">{L.catName(m.categoryId)}</Badge>
                    <Badge tone={d < 0 ? 'muted' : d <= 7 ? 'warning' : 'info'}>
                      {d < 0 ? 'Joué' : d === 0 ? 'Aujourd\'hui' : `J-${d}`}
                    </Badge>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent shrink-0"><Shirt className="h-5 w-5" /></div>
                </div>
                <h3 className="font-display font-bold text-fg mt-3 leading-snug">vs {m.opponent || 'Adversaire'}</h3>
                <div className="mt-3 space-y-1.5 text-sm text-muted">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" />{fmtDate(m.matchDate)}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{L.stName(m.stadiumId)}</div>
                  <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-accent" />{m.expenses.length} dépenses · {money(totalExpenses(m))}</div>
                </div>
                <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-line/10">
                  {canDo('matches', 'view') && <button onClick={() => setDetail(m)} className="btn-ghost flex-1 !py-2"><Eye className="h-4 w-4" />{t('common.view')}</button>}
                  {canDo('matches', 'expenses') && <button onClick={() => setExpensesFor(m)} className="btn-icon" title="Dépenses"><Receipt className="h-4 w-4" /></button>}
                  {canDo('matches', 'edit') && <button onClick={() => openEdit(m)} className="btn-icon" title={t('common.edit')}><Pencil className="h-4 w-4" /></button>}
                  {canDo('matches', 'delete') && <button onClick={() => confirm.ask(() => { remove('matches', m.id); toast('Supprimé', 'info'); }, `Supprimer le match vs ${m.opponent} ?`)} className="btn-icon hover:text-danger" title={t('common.delete')}><Trash2 className="h-4 w-4" /></button>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / edit */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="lg" title={editId ? 'Modifier le match' : 'Nouveau match'}
        footer={<><button onClick={() => setFormOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label={t('planner.category')} value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })} placeholder="—" options={data.categories.map((c) => ({ value: c.id, label: c.name }))} />
          <Select label={t('planner.stadium')} value={form.stadiumId} onChange={(v) => setForm({ ...form, stadiumId: v })} placeholder="—" options={data.stadiums.map((s) => ({ value: s.id, label: s.name }))} />
          <Input label={t('common.date')} type="date" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} />
          <Input label="Adversaire" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} required />
          <div className="sm:col-span-2">
            <Textarea label="Formation de l'équipe adverse / notes" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Formation, points forts, consignes…" />
          </div>
        </div>
      </Modal>

      {detail && <DetailModal m={cur(detail)} onClose={() => setDetail(null)} />}
      {expensesFor && <ExpensesModal m={cur(expensesFor)} onClose={() => setExpensesFor(null)} />}
      {confirm.node}
    </div>
  );

  function DetailModal({ m, onClose }: { m: Match; onClose: () => void }) {
    return (
      <Modal open onClose={onClose} size="lg" title={`vs ${m.opponent || 'Adversaire'}`} subtitle={`${L.catName(m.categoryId)} · ${fmtDate(m.matchDate)}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-muted">{t('planner.stadium')}</p><p className="font-semibold text-fg mt-0.5">{L.stName(m.stadiumId)}</p></div>
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-muted">{t('common.date')}</p><p className="font-semibold text-fg mt-0.5">{fmtDate(m.matchDate)}</p></div>
          </div>
          <div>
            <p className="label">Formation adverse / notes</p>
            <div className="rounded-xl bg-surface-2 p-4 text-sm text-fg whitespace-pre-wrap min-h-[60px]">{m.description || '—'}</div>
          </div>
          <div>
            <p className="label flex items-center gap-2"><Receipt className="h-4 w-4" />Dépenses ({money(totalExpenses(m))})</p>
            {m.expenses.length === 0 ? <p className="text-sm text-muted">Aucune dépense</p> : (
              <div className="space-y-1.5">
                {m.expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <span className="font-medium text-fg">{e.name}</span>
                    <span className="font-bold text-danger">-{money(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  function ExpensesModal({ m, onClose }: { m: Match; onClose: () => void }) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState<number>(0);

    const addExpense = (label: string, value: number) => {
      if (value <= 0) { toast('Montant requis', 'error'); return; }
      const entry: MatchExpense = { id: uid('mexp'), name: label, amount: value };
      updateItem('matches', m.id, { expenses: [entry, ...m.expenses] });
      toast('Dépense ajoutée', 'success');
    };

    const [preset, setPreset] = useState<{ label: string; amount: number } | null>(null);

    return (
      <Modal open onClose={onClose} size="md" title="Dépenses du match" subtitle={`vs ${m.opponent || '—'} · ${fmtDate(m.matchDate)}`}>
        <div className="space-y-4">
          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-2.5">
            {[{ label: 'Prix transport', icon: <Bus className="h-4 w-4" /> }, { label: 'Hôtel', icon: <Hotel className="h-4 w-4" /> }].map((p) => (
              <button key={p.label} onClick={() => setPreset({ label: p.label, amount: 0 })}
                className="btn-ghost !py-3 justify-center">{p.icon}{p.label}</button>
            ))}
          </div>
          {preset && (
            <div className="rounded-xl bg-surface-2 border border-line/10 p-3 flex items-end gap-2">
              <div className="flex-1"><Input label={preset.label} type="number" value={preset.amount || ''} onChange={(e) => setPreset({ ...preset, amount: +e.target.value })} autoFocus /></div>
              <button onClick={() => { addExpense(preset.label, preset.amount); setPreset(null); }} className="btn-primary !px-3"><Check className="h-4 w-4" /></button>
              <button onClick={() => setPreset(null)} className="btn-ghost !px-3"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Custom expense */}
          <div className="rounded-xl bg-surface-2 border border-line/10 p-3 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Dépense personnalisée</p>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} placeholder="Repas, arbitrage…" /></div>
              <div className="w-32"><Input label={t('common.amount')} type="number" value={amount || ''} onChange={(e) => setAmount(+e.target.value)} /></div>
              <button onClick={() => { if (!name.trim()) { toast('Nom requis', 'error'); return; } addExpense(name.trim(), amount); setName(''); setAmount(0); }} className="btn-primary !px-3"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Existing rows */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {m.expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
                <span className="text-sm font-medium text-fg">{e.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-danger text-sm">-{money(e.amount)}</span>
                  <button onClick={() => updateItem('matches', m.id, { expenses: m.expenses.filter((x) => x.id !== e.id) })} className="btn-icon hover:text-danger"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {m.expenses.length === 0 && <p className="text-sm text-muted text-center py-3">{t('common.noData')}</p>}
          </div>

          <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">Total dépenses</span>
            <span className="font-display text-lg font-extrabold text-danger">{money(totalExpenses(m))}</span>
          </div>
        </div>
      </Modal>
    );
  }
}

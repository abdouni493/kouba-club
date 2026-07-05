import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown, Receipt, CircleDollarSign } from 'lucide-react';
import { PageHeader, Badge, StatCard, EmptyState } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Textarea, Segmented } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { money, uid, today, fmtDate } from '../lib/utils';

type Preset = 'day' | 'week' | 'month' | 'custom';
interface Entry { id: string; date: string; label: string; amount: number; kind: 'income' | 'out' | 'deposit' | 'withdraw' }

export default function Caisse() {
  const { t } = useTranslation();
  const { data, add } = useData();
  const { toast } = useToast();
  const L = useLookups();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'deposit' as 'deposit' | 'withdraw', amount: 0, date: today(), description: '' });
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState({ from: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), to: today() });

  const period = useMemo(() => {
    if (preset === 'day') return { from: today(), to: today() };
    if (preset === 'week') return { from: dayjs().subtract(7, 'day').format('YYYY-MM-DD'), to: today() };
    if (preset === 'month') return { from: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), to: today() };
    return range;
  }, [preset, range]);

  const inRange = (d: string) => d >= period.from && d <= period.to;

  const entries: Entry[] = useMemo(() => {
    const list: Entry[] = [];
    data.players.forEach((p) => p.payments.forEach((pay) => list.push({ id: pay.id, date: pay.date, label: `${L.playerName(p)} · ${pay.note}`, amount: pay.amount, kind: 'income' })));
    data.expenses.forEach((e) => list.push({ id: e.id, date: e.date, label: `${e.name} · ${L.ecName(e.categoryId)}`, amount: e.amount, kind: 'out' }));
    // Match expenses are a separate cost stream (see Matches page) that also rolls up here.
    data.matches.forEach((m) => m.expenses.forEach((e) => list.push({ id: e.id, date: m.matchDate, label: `Dépenses matchs · vs ${m.opponent || '—'} · ${e.name}`, amount: e.amount, kind: 'out' })));
    data.transactions.forEach((tx) => list.push({ id: tx.id, date: tx.date, label: tx.description, amount: tx.amount, kind: tx.type }));
    return list.filter((e) => inRange(e.date)).sort((a, b) => b.date.localeCompare(a.date));
  }, [data, period, L]);

  const income = entries.filter((e) => e.kind === 'income' || e.kind === 'deposit').reduce((s, e) => s + e.amount, 0);
  const out = entries.filter((e) => e.kind === 'out' || e.kind === 'withdraw').reduce((s, e) => s + e.amount, 0);

  const save = () => {
    if (form.amount <= 0) { toast('Montant requis', 'error'); return; }
    add('transactions', { id: uid('tx'), ...form });
    toast(form.type === 'deposit' ? 'Dépôt enregistré' : 'Retrait enregistré', 'success');
    setForm({ type: 'deposit', amount: 0, date: today(), description: '' });
    setOpen(false);
  };

  const kindMeta = {
    income: { icon: <CircleDollarSign className="h-4 w-4" />, tone: 'success', sign: '+' },
    deposit: { icon: <ArrowDownCircle className="h-4 w-4" />, tone: 'success', sign: '+' },
    out: { icon: <Receipt className="h-4 w-4" />, tone: 'danger', sign: '-' },
    withdraw: { icon: <ArrowUpCircle className="h-4 w-4" />, tone: 'danger', sign: '-' },
  } as const;

  return (
    <div>
      <PageHeader title={t('caisse.title')} icon={<Wallet className="h-5 w-5" />}
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" />{t('caisse.newTransaction')}</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label={t('caisse.balance')} value={money(L.cashBalance)} icon={<Wallet className="h-5 w-5" />} tone="accent" />
        <StatCard label={`Entrées (${t('common.period').toLowerCase()})`} value={money(income)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label={`Sorties (${t('common.period').toLowerCase()})`} value={money(out)} icon={<TrendingDown className="h-5 w-5" />} tone="danger" />
        <StatCard label="Net période" value={money(income - out)} icon={<CircleDollarSign className="h-5 w-5" />} tone="info" />
      </div>

      {/* period filters */}
      <div className="card p-4 mb-5 flex flex-wrap items-end gap-4">
        <div><p className="label">{t('common.period')}</p>
          <Segmented value={preset} onChange={setPreset} options={[
            { value: 'day', label: t('common.today') }, { value: 'week', label: t('common.week') },
            { value: 'month', label: t('common.month') }, { value: 'custom', label: t('common.period') },
          ]} />
        </div>
        {preset === 'custom' && (
          <div className="flex gap-3">
            <Input label={t('common.from')} type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            <Input label={t('common.to')} type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
        )}
        <p className="text-xs text-muted ml-auto">{fmtDate(period.from)} → {fmtDate(period.to)} · {entries.length} opérations</p>
      </div>

      {entries.length === 0 ? <EmptyState title="Aucune opération sur cette période" icon={<Wallet className="h-7 w-7" />} /> : (
        <div className="card p-2 divide-y divide-line/10">
          {entries.map((e, i) => {
            const m = kindMeta[e.kind];
            return (
              <motion.div key={e.id + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }} className="flex items-center gap-3 px-3 py-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${m.tone === 'success' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>{m.icon}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-fg truncate">{e.label}</p><p className="text-xs text-muted">{fmtDate(e.date)}</p></div>
                <Badge tone={e.kind === 'income' ? 'success' : e.kind === 'deposit' ? 'success' : e.kind === 'out' ? 'danger' : 'warning'}>
                  {e.kind === 'income' ? t('caisse.payments') : e.kind === 'out' ? t('caisse.expenses') : e.kind === 'deposit' ? t('caisse.deposit') : t('caisse.withdraw')}
                </Badge>
                <span className={`font-bold text-sm w-28 text-right ${m.tone === 'success' ? 'text-success' : 'text-danger'}`}>{m.sign}{money(e.amount)}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} size="md" title={t('caisse.newTransaction')}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="space-y-4">
          <Segmented value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={[{ value: 'deposit', label: t('caisse.deposit') }, { value: 'withdraw', label: t('caisse.withdraw') }]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('common.amount')} type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value })} />
            <Input label={t('common.date')} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <Textarea label={t('common.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}

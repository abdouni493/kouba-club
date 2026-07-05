import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileBarChart, Sparkles, ChevronDown, Users, UserSquare2, Dumbbell, HardHat,
  Receipt, Wallet, CircleDollarSign, Ticket, Printer, Shield, Flag,
} from 'lucide-react';
import { PageHeader, StatCard, Badge } from '../components/ui/Display';
import { Input, Select } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useLookups } from '../lib/selectors';
import { money, fmtDate } from '../lib/utils';

export default function Reports() {
  const { t } = useTranslation();
  const { data } = useData();
  const L = useLookups();

  const [from, setFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [expCat, setExpCat] = useState('');
  const [plCat, setPlCat] = useState('');
  const [gen, setGen] = useState(false);

  const inR = (d: string) => d >= from && d <= to;

  const players = data.players.filter((p) => !plCat || (p.assignedSubscription && L.tm[p.assignedSubscription.timingId]?.categoryId === plCat));
  const payments = data.players.flatMap((p) => p.payments.map((x) => ({ ...x, player: p }))).filter((x) => inR(x.date));
  const expenses = data.expenses.filter((e) => inR(e.date) && (!expCat || e.categoryId === expCat));
  const txs = data.transactions.filter((x) => inR(x.date));
  const trainerPays = data.trainers.flatMap((tr) => tr.payments.map((p) => ({ ...p, name: tr.fullName }))).filter((x) => inR(x.date));
  const workerPays = data.workers.flatMap((w) => w.payments.map((p) => ({ ...p, name: w.fullName }))).filter((x) => inR(x.date));

  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const staffOut = [...trainerPays, ...workerPays, ...data.doctors.flatMap((d) => d.payments).filter((x) => inR(x.date))].reduce((s, p) => s + p.amount, 0);
  const totalDebt = players.reduce((s, p) => s + (p.assignedSubscription?.rest || 0), 0);

  // Insurance subscribed in the period (assurance cost line).
  const insurances = data.players.flatMap((p) => p.insurances.map((i) => ({ ...i, player: p }))).filter((i) => inR(i.startDate));
  const insTotal = insurances.reduce((s, i) => s + i.price, 0);

  // Match expenses in the period — a separate cost stream folded into the totals.
  const matchesInR = data.matches.filter((m) => inR(m.matchDate));
  const matchExpRows = matchesInR.flatMap((m) => m.expenses.map((e) => ({ ...e, match: m })));
  const matchExpTotal = matchExpRows.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title={t('reports.title')} icon={<FileBarChart className="h-5 w-5" />}
        actions={gen && <button onClick={() => window.print()} className="btn-ghost no-print"><Printer className="h-4 w-4" />{t('common.print')}</button>} />

      <div className="card p-4 mb-5 flex flex-wrap items-end gap-3 no-print">
        <Input label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="min-w-[150px]"><Select label="Cat. joueurs" value={plCat} onChange={setPlCat} placeholder={t('common.all')} options={data.categories.map((c) => ({ value: c.id, label: c.name }))} /></div>
        <div className="min-w-[150px]"><Select label="Cat. dépenses" value={expCat} onChange={setExpCat} placeholder={t('common.all')} options={data.expenseCategories.map((c) => ({ value: c.id, label: c.name }))} /></div>
        <button onClick={() => setGen(true)} className="btn-primary"><Sparkles className="h-4 w-4" />{t('reports.generate')}</button>
      </div>

      {!gen ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-faint mb-4"><FileBarChart className="h-7 w-7" /></div>
          <p className="font-semibold text-fg">{t('reports.selectPeriod')}</p>
        </div>
      ) : (
        <div className="space-y-4 print-area">
          <div className="hidden print:block mb-4"><h1 className="text-2xl font-bold">{data.club.name} — Rapport</h1><p className="text-sm">{fmtDate(from)} → {fmtDate(to)}</p></div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('dash.revenue')} value={money(revenue)} icon={<CircleDollarSign className="h-5 w-5" />} tone="success" />
            <StatCard label={t('expenses.title')} value={money(totalExp + matchExpTotal)} sub={matchExpTotal > 0 ? `dont matchs : ${money(matchExpTotal)}` : undefined} icon={<Receipt className="h-5 w-5" />} tone="danger" />
            <StatCard label="Salaires" value={money(staffOut)} icon={<Wallet className="h-5 w-5" />} tone="warning" />
            <StatCard label="Bénéfice net" value={money(revenue - totalExp - matchExpTotal - staffOut)} icon={<FileBarChart className="h-5 w-5" />} tone="accent" />
          </div>

          <Section title={t('nav.players')} icon={<Users className="h-4 w-4" />} stat={`${players.length} joueurs · ${money(totalDebt)} créances`}>
            <Table cols={['Joueur', 'Catégorie', 'Abonnement', 'Payé', 'Reste']}
              rows={players.map((p) => [L.playerName(p), p.assignedSubscription ? L.catName(L.tm[p.assignedSubscription.timingId]?.categoryId) : '—', p.assignedSubscription ? L.timingName(p.assignedSubscription.timingId) : t('players.noSub'), money(p.payments.reduce((s, x) => s + x.amount, 0)), p.assignedSubscription ? money(p.assignedSubscription.rest) : '—'])} />
          </Section>

          <Section title={t('nav.subscriptions') + ' & ' + t('players.paymentHistory')} icon={<Ticket className="h-4 w-4" />} stat={`${payments.length} paiements · ${money(revenue)}`}>
            <Table cols={['Date', 'Joueur', 'Note', 'Montant']}
              rows={payments.map((p) => [fmtDate(p.date), L.playerName(p.player), p.note || '—', money(p.amount)])} />
          </Section>

          <Section title={t('nav.parents')} icon={<UserSquare2 className="h-4 w-4" />} stat={`${data.parents.length} parents`}>
            <Table cols={['Parent', 'Téléphone', 'Enfants', 'E-mail']}
              rows={data.parents.map((p) => [`${p.firstName} ${p.lastName}`, p.phone, String(p.playerIds.length), p.email])} />
          </Section>

          <Section title={t('nav.trainers')} icon={<Dumbbell className="h-4 w-4" />} stat={`${data.trainers.length} entraîneurs · ${money(trainerPays.reduce((s, p) => s + p.amount, 0))} payés`}>
            <Table cols={['Entraîneur', 'Type', 'Créneaux', 'Payé (période)']}
              rows={data.trainers.map((tr) => [tr.fullName, tr.paymentType === 'month' ? 'Mensuel' : `${tr.percentage}%`, String(tr.timingIds.length), money(tr.payments.filter((p) => inR(p.date)).reduce((s, p) => s + p.amount, 0))])} />
          </Section>

          <Section title={t('nav.workers')} icon={<HardHat className="h-4 w-4" />} stat={`${data.workers.length} employés · ${money(workerPays.reduce((s, p) => s + p.amount, 0))} payés`}>
            <Table cols={['Employé', 'Rôle', 'Salaire', 'Payé (période)']}
              rows={data.workers.map((w) => [w.fullName, L.roleName(w.roleId), w.payActive ? `${money(w.payAmount)}/${w.payType}` : '—', money(w.payments.filter((p) => inR(p.date)).reduce((s, p) => s + p.amount, 0))])} />
          </Section>

          <Section title={t('nav.expenses')} icon={<Receipt className="h-4 w-4" />} stat={`${expenses.length} dépenses · ${money(totalExp)}`}>
            <Table cols={['Date', 'Nom', 'Catégorie', 'Montant']}
              rows={expenses.map((e) => [fmtDate(e.date), e.name, L.ecName(e.categoryId), money(e.amount)])} />
          </Section>

          <Section title="Dépenses matchs" icon={<Flag className="h-4 w-4" />} stat={`${matchesInR.length} matchs · ${money(matchExpTotal)}`}>
            <Table cols={['Date', 'Match', 'Dépense', 'Montant']}
              rows={matchExpRows.map((e) => [fmtDate(e.match.matchDate), `vs ${e.match.opponent || '—'} (${L.catName(e.match.categoryId)})`, e.name, money(e.amount)])} />
          </Section>

          <Section title="Assurances" icon={<Shield className="h-4 w-4" />} stat={`${insurances.length} assurances · ${money(insTotal)}`}>
            <Table cols={['Date', 'Joueur', 'Type', 'Fin', 'Montant']}
              rows={insurances.map((i) => [fmtDate(i.startDate), L.playerName(i.player), data.insuranceTypes.find((it) => it.id === i.typeId)?.name || '—', fmtDate(i.endDate), money(i.price)])} />
          </Section>

          <Section title={t('nav.caisse')} icon={<Wallet className="h-4 w-4" />} stat={`Solde ${money(L.cashBalance)} · ${txs.length} transactions`}>
            <Table cols={['Date', 'Type', 'Description', 'Montant']}
              rows={txs.map((x) => [fmtDate(x.date), x.type === 'deposit' ? t('caisse.deposit') : t('caisse.withdraw'), x.description, money(x.amount)])} />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, stat, children }: { title: string; icon: ReactNode; stat: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-5 text-left">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">{icon}</div>
        <div className="flex-1"><h3 className="font-display font-bold text-fg">{title}</h3><p className="text-sm text-muted">{stat}</p></div>
        <Badge tone="muted" className="no-print">Détails</Badge>
        <ChevronDown className={`h-5 w-5 text-muted transition-transform no-print ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {(open) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-line/10 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hidden print:block px-5 pb-5 border-t border-line/10 pt-4">{children}</div>
    </div>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead><tr className="text-left text-muted border-b border-line/10">{cols.map((c, i) => <th key={i} className={`py-2 font-semibold ${i === cols.length - 1 ? 'text-right' : ''}`}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/5">
              {r.map((cell, j) => <td key={j} className={`py-2.5 ${j === 0 ? 'font-medium text-fg' : 'text-muted'} ${j === r.length - 1 ? 'text-right font-semibold text-fg' : ''}`}>{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length} className="py-6 text-center text-muted">{'Aucune donnée'}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

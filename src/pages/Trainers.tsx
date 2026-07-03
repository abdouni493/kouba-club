import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Dumbbell, Plus, Eye, Pencil, Trash2, Percent, CircleDollarSign, Phone, Mail,
  User, Ticket, Check, X, Wallet, CalendarClock, Bell, ChevronDown, Clock,
} from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, Avatar, Tabs } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Textarea, Segmented } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { money, uid, today, fmtDate, daysUntil } from '../lib/utils';
import { computeUnpaid, monthLabel } from '../lib/staff';
import { sendClubEmail } from '../lib/email';
import type { Trainer, MoneyEntry } from '../lib/types';

const empty = { fullName: '', phone: '', email: '', address: '', paymentType: 'month' as 'month' | 'percentage', monthlyAmount: 40000, percentage: 20 };

export default function Trainers() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Trainer | null>(null);
  const [assign, setAssign] = useState<Trainer | null>(null);
  const [acompte, setAcompte] = useState<Trainer | null>(null);
  const [absence, setAbsence] = useState<Trainer | null>(null);
  const [pay, setPay] = useState<Trainer | null>(null);
  const [notify, setNotify] = useState(false);

  const cur = (tr: Trainer) => data.trainers.find((x) => x.id === tr.id) || tr;

  const openCreate = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (tr: Trainer) => { setEditId(tr.id); setForm({ fullName: tr.fullName, phone: tr.phone, email: tr.email, address: tr.address, paymentType: tr.paymentType, monthlyAmount: tr.monthlyAmount || 40000, percentage: tr.percentage || 20 }); setOpen(true); };
  const save = () => {
    if (!form.fullName) { toast('Nom requis', 'error'); return; }
    const payload = { fullName: form.fullName, phone: form.phone, email: form.email, address: form.address, paymentType: form.paymentType, monthlyAmount: form.paymentType === 'month' ? form.monthlyAmount : undefined, percentage: form.paymentType === 'percentage' ? form.percentage : undefined };
    if (editId) { updateItem('trainers', editId, payload); toast('Entraîneur mis à jour', 'success'); }
    else { add('trainers', { id: uid('tr'), ...payload, timingIds: [], acomptes: [], absences: [], payments: [], createdAt: today() }); toast('Entraîneur créé', 'success'); }
    setOpen(false);
  };

  return (
    <div>
      <PageHeader title={t('trainers.title')} subtitle={`${data.trainers.length} entraîneurs`} icon={<Dumbbell className="h-5 w-5" />}
        actions={<>
          <button onClick={() => setNotify(true)} className="btn-ghost"><Bell className="h-4 w-4" />{t('trainers.notifyExpiry')}</button>
          <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('trainers.newTrainer')}</button>
        </>} />

      {data.trainers.length === 0 ? <EmptyState title="Aucun entraîneur" icon={<Dumbbell className="h-7 w-7" />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.trainers.map((tr, i) => {
            const players = L.playersOfTrainer(tr.id).length;
            return (
              <motion.div key={tr.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={tr.fullName} id={tr.id} size={48} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-fg truncate">{tr.fullName}</h3>
                    <p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3 w-3" />{tr.phone}</p>
                  </div>
                  <Badge tone={tr.paymentType === 'month' ? 'info' : 'accent'}>{tr.paymentType === 'month' ? t('trainers.monthly') : `${tr.percentage}%`}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><Ticket className="h-3.5 w-3.5" />{t('trainers.timings')}</p><p className="font-bold text-fg">{tr.timingIds.length}</p></div>
                  <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><User className="h-3.5 w-3.5" />Joueurs</p><p className="font-bold text-fg">{players}</p></div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-4 pt-4 border-t border-line/10">
                  {canDo('trainers', 'view') && <ActBtn icon={<Eye className="h-4 w-4" />} label={t('common.view')} onClick={() => setDetail(tr)} />}
                  {canDo('trainers', 'assign') && <ActBtn icon={<Ticket className="h-4 w-4" />} label={t('trainers.timings')} onClick={() => setAssign(tr)} />}
                  {canDo('trainers', 'acompte') && <ActBtn icon={<CircleDollarSign className="h-4 w-4" />} label={t('trainers.acomptes')} onClick={() => setAcompte(tr)} />}
                  {canDo('trainers', 'payment') && <ActBtn icon={<Wallet className="h-4 w-4" />} label={t('trainers.payment')} onClick={() => setPay(tr)} />}
                  {canDo('trainers', 'absence') && <ActBtn icon={<CalendarClock className="h-4 w-4" />} label={t('trainers.absences')} onClick={() => setAbsence(tr)} />}
                  {canDo('trainers', 'edit') && <ActBtn icon={<Pencil className="h-4 w-4" />} label={t('common.edit')} onClick={() => openEdit(tr)} />}
                  {canDo('trainers', 'delete') && <ActBtn icon={<Trash2 className="h-4 w-4" />} label={t('common.delete')} danger onClick={() => confirm.ask(() => { remove('trainers', tr.id); toast('Supprimé', 'info'); }, `Supprimer ${tr.fullName} ?`)} />}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / edit */}
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editId ? 'Modifier entraîneur' : t('trainers.newTrainer')}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Input label={t('common.fullName')} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
          <Input label={t('common.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="sm:col-span-2"><Input label={t('common.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className="label">{t('trainers.paymentType')}</label>
            <Segmented value={form.paymentType} onChange={(v) => setForm({ ...form, paymentType: v })} options={[{ value: 'month', label: t('trainers.monthly') }, { value: 'percentage', label: t('trainers.percentage') }]} />
          </div>
          {form.paymentType === 'month'
            ? <Input label={t('trainers.monthlyAmount')} type="number" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: +e.target.value })} />
            : <Input label={t('trainers.pct')} type="number" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: +e.target.value })} />}
        </div>
      </Modal>

      {detail && <DetailModal tr={cur(detail)} onClose={() => setDetail(null)} />}
      {assign && <AssignModal tr={cur(assign)} onClose={() => setAssign(null)} />}
      {acompte && <MoneyModal tr={cur(acompte)} kind="acompte" onClose={() => setAcompte(null)} />}
      {absence && <MoneyModal tr={cur(absence)} kind="absence" onClose={() => setAbsence(null)} />}
      {pay && <PaymentModal tr={cur(pay)} onClose={() => setPay(null)} />}
      {notify && <NotifyModal onClose={() => setNotify(false)} />}

      {confirm.node}
    </div>
  );

  function DetailModal({ tr, onClose }: { tr: Trainer; onClose: () => void }) {
    const [tab, setTab] = useState('info');
    const removeTiming = (id: string) => { updateItem('timings', id, { trainerId: '' }); toast('Créneau retiré', 'info'); };
    return (
      <Modal open onClose={onClose} size="lg" title={tr.fullName} subtitle={tr.email}>
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'info', label: t('players.personalInfo'), icon: <User className="h-4 w-4" /> },
          { key: 'timings', label: t('trainers.timings'), icon: <Ticket className="h-4 w-4" /> },
          { key: 'pay', label: t('players.paymentHistory'), icon: <CircleDollarSign className="h-4 w-4" /> },
        ]} />
        <div className="mt-5">
          {tab === 'info' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Info label={t('common.phone')} value={tr.phone} />
                <Info label={t('common.email')} value={tr.email} />
                <Info label={t('common.address')} value={tr.address} />
                <Info label={t('trainers.paymentType')} value={tr.paymentType === 'month' ? `${t('trainers.monthly')} · ${money(tr.monthlyAmount || 0)}` : `${tr.percentage}%`} />
              </div>
            </div>
          )}
          {tab === 'timings' && (
            <div className="space-y-2">
              {tr.timingIds.length === 0 && <p className="text-sm text-muted">Aucun créneau assigné</p>}
              {tr.timingIds.map((id) => { const tm = L.tm[id]; if (!tm) return null; return (
                <div key={id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <div className="flex-1"><p className="text-sm font-semibold text-fg">{tm.name}</p><p className="text-xs text-muted flex items-center gap-1"><Clock className="h-3 w-3" />{tm.startTime}-{tm.endTime} · {L.playersOfTiming(id).length} joueurs</p></div>
                  <button onClick={() => removeTiming(id)} className="btn-icon hover:text-danger"><X className="h-4 w-4" /></button>
                </div>
              ); })}
            </div>
          )}
          {tab === 'pay' && (
            <div className="space-y-2">
              {tr.payments.length === 0 && <p className="text-sm text-muted">{t('common.noData')}</p>}
              {tr.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                  <div><p className="text-sm font-semibold text-fg">{p.description || 'Paiement'}</p><p className="text-xs text-muted">{fmtDate(p.date)} · {p.monthsCovered.map(monthLabel).join(', ') || (p.subscriptionIds?.length ? `${p.subscriptionIds.length} abonnements` : '')}</p></div>
                  <span className="font-bold text-success">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    );
  }

  function AssignModal({ tr, onClose }: { tr: Trainer; onClose: () => void }) {
    const [sel, setSel] = useState<string[]>([...tr.timingIds]);
    const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
    const save = () => {
      const added = sel.filter((id) => !tr.timingIds.includes(id));
      const removed = tr.timingIds.filter((id) => !sel.includes(id));
      added.forEach((id) => updateItem('timings', id, { trainerId: tr.id }));
      removed.forEach((id) => updateItem('timings', id, { trainerId: '' }));
      toast('Créneaux assignés', 'success'); onClose();
    };
    return (
      <Modal open onClose={onClose} size="lg" title={t('trainers.assignTiming')} subtitle={tr.fullName}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {data.timings.map((tm) => {
            const on = sel.includes(tm.id);
            return (
              <button key={tm.id} onClick={() => toggle(tm.id)} className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${on ? 'bg-accent/15 border border-accent/30' : 'bg-surface-2 border border-transparent hover:bg-surface-3'}`}>
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${on ? 'bg-accent-grad text-black' : 'bg-surface-3 text-muted'}`}>{on ? <Check className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-fg">{tm.name}</p><p className="text-xs text-muted">{tm.startTime}-{tm.endTime} · {L.stName(tm.stadiumId)}</p></div>
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  function MoneyModal({ tr, kind, onClose }: { tr: Trainer; kind: 'acompte' | 'absence'; onClose: () => void }) {
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(today());
    const list = kind === 'acompte' ? tr.acomptes : tr.absences;
    const save = () => {
      if (amount <= 0) { toast('Montant requis', 'error'); return; }
      const entry: MoneyEntry = { id: uid(kind), amount, description, date };
      updateItem('trainers', tr.id, kind === 'acompte' ? { acomptes: [entry, ...tr.acomptes] } : { absences: [entry, ...tr.absences] });
      toast(kind === 'acompte' ? 'Acompte ajouté' : 'Absence ajoutée', 'success');
      setAmount(0); setDescription('');
    };
    return (
      <Modal open onClose={onClose} size="md" title={kind === 'acompte' ? t('trainers.newAcompte') : t('trainers.newAbsence')} subtitle={tr.fullName}>
        <div className="grid grid-cols-2 gap-3">
          <Input label={kind === 'acompte' ? t('common.amount') : 'Coût'} type="number" value={amount || ''} onChange={(e) => setAmount(+e.target.value)} />
          <Input label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="col-span-2"><Input label={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <button onClick={save} className="btn-primary w-full mt-4"><Plus className="h-4 w-4" />{t('common.add')}</button>
        <div className="mt-5 space-y-2 max-h-52 overflow-y-auto">
          {list.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
              <div><p className="text-sm font-semibold text-fg">{m.description || (kind === 'acompte' ? 'Acompte' : 'Absence')}</p><p className="text-xs text-muted">{fmtDate(m.date)}</p></div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${kind === 'acompte' ? 'text-warning' : 'text-danger'}`}>{money(m.amount)}</span>
                <button onClick={() => updateItem('trainers', tr.id, kind === 'acompte' ? { acomptes: tr.acomptes.filter((x) => x.id !== m.id) } : { absences: tr.absences.filter((x) => x.id !== m.id) })} className="btn-icon hover:text-danger"><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted text-center py-3">{t('common.noData')}</p>}
        </div>
      </Modal>
    );
  }

  function PaymentModal({ tr, onClose }: { tr: Trainer; onClose: () => void }) {
    const u = computeUnpaid({ startDate: tr.createdAt, payType: 'month', amount: tr.monthlyAmount || 0, acomptes: tr.acomptes, absences: tr.absences, payments: tr.payments });
    const isPct = tr.paymentType === 'percentage';

    // percentage: unpaid player-subscriptions
    const coveredSubs = new Set(tr.payments.flatMap((p) => p.subscriptionIds || []));
    const unpaidPlayers = L.playersOfTrainer(tr.id).filter((p) => !coveredSubs.has(p.id) && p.assignedSubscription);
    const pctGross = Math.round(unpaidPlayers.reduce((s, p) => s + (p.assignedSubscription?.price || 0), 0) * (tr.percentage || 0) / 100);

    const gross = isPct ? pctGross : u.gross;
    const net = Math.max(0, gross - u.acomptesTotal - u.absencesTotal);
    const [amount, setAmount] = useState<number>(net);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(today());
    const [showDetails, setShowDetails] = useState(false);

    const save = () => {
      updateItem('trainers', tr.id, { payments: [{
        id: uid('sp'), date, description, amount,
        monthsCovered: isPct ? [] : u.unpaidMonths,
        acompteIds: u.unpaidAcomptes.map((a) => a.id),
        absenceIds: u.unpaidAbsences.map((a) => a.id),
        subscriptionIds: isPct ? unpaidPlayers.map((p) => p.id) : [],
      }, ...tr.payments] });
      toast('Paiement effectué', 'success'); onClose();
    };

    return (
      <Modal open onClose={onClose} size="lg" title={t('trainers.paySalary')} subtitle={tr.fullName}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary"><Wallet className="h-4 w-4" />{t('trainers.paySalary')}</button></>}>
        <div className="space-y-4">
          {isPct ? (
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fg flex items-center gap-2"><Percent className="h-4 w-4 text-accent" />{tr.percentage}% des abonnements ({unpaidPlayers.length})</span>
                <span className="font-display font-extrabold gradient-text">{money(pctGross)}</span>
              </div>
              <button onClick={() => setShowDetails((s) => !s)} className="text-xs text-accent mt-2 flex items-center gap-1"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />Voir les détails</button>
              {showDetails && (
                <div className="mt-3 space-y-1.5">
                  {unpaidPlayers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-surface-2 rounded-lg px-3 py-2">
                      <span className="text-fg">{L.playerName(p)}</span>
                      <span className="text-muted">{money(p.assignedSubscription!.price)} → <span className="text-accent font-semibold">{money(Math.round(p.assignedSubscription!.price * (tr.percentage || 0) / 100))}</span></span>
                    </div>
                  ))}
                  {unpaidPlayers.length === 0 && <p className="text-xs text-muted">Aucun abonnement non payé</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-info/10 border border-info/20 p-4">
              <p className="text-sm font-semibold text-fg mb-2">{t('trainers.unpaidMonths')} ({u.unpaidMonths.length})</p>
              <div className="flex flex-wrap gap-2">
                {u.unpaidMonths.map((m) => <Badge key={m} tone="info">{monthLabel(m)}</Badge>)}
                {u.unpaidMonths.length === 0 && <span className="text-xs text-muted">Tous les mois sont payés</span>}
              </div>
              <p className="text-sm text-muted mt-3">{u.unpaidMonths.length} × {money(tr.monthlyAmount || 0)} = <span className="font-bold text-fg">{money(u.gross)}</span></p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Info label="Brut" value={money(gross)} />
            <Info label={t('trainers.acomptes')} value={`- ${money(u.acomptesTotal)}`} />
            <Info label={t('trainers.absences')} value={`- ${money(u.absencesTotal)}`} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Montant net à payer" type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} />
            <Input label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Textarea label={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="rounded-xl bg-success/10 border border-success/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">Net calculé</span>
            <span className="font-display text-xl font-extrabold text-success">{money(net)}</span>
          </div>
        </div>
      </Modal>
    );
  }

  function NotifyModal({ onClose }: { onClose: () => void }) {
    const soon = data.players.filter((p) => { const d = p.assignedSubscription ? daysUntil(p.assignedSubscription.expiryDate) : -999; return d >= 0 && d <= 7; });
    const expired = data.players.filter((p) => p.assignedSubscription && daysUntil(p.assignedSubscription.expiryDate) < 0);
    const list = [...expired, ...soon];
    const [sel, setSel] = useState<string[]>(list.map((p) => p.id));
    const [sending, setSending] = useState(false);
    const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
    const send = async () => {
      setSending(true);
      let ok = 0, fail = 0;
      for (const id of sel) {
        const p = list.find((x) => x.id === id);
        if (!p?.assignedSubscription) continue;
        const parent = p.parentId ? L.par[p.parentId] : undefined;
        const recipients = [
          p.email ? { email: p.email, name: L.playerName(p) } : null,
          parent?.email ? { email: parent.email, name: `${parent.firstName} ${parent.lastName}` } : null,
        ].filter((r): r is { email: string; name: string } => !!r);
        if (recipients.length === 0) continue;
        const d = daysUntil(p.assignedSubscription.expiryDate);
        const status = d < 0 ? `expiré depuis ${-d}j` : `expire dans ${d}j`;
        const html = `<p>Bonjour,</p><p>L'abonnement de ${L.playerName(p)} (${status}, échéance ${fmtDate(p.assignedSubscription.expiryDate)}) nécessite votre attention.</p>`;
        try { await sendClubEmail(data.club, recipients, t('trainers.notifyExpiry'), html); ok++; } catch { fail++; }
      }
      setSending(false);
      toast(fail === 0 ? `${ok} e-mail(s) envoyé(s)` : `${ok} envoyé(s), ${fail} échoué(s)`, fail === 0 ? 'success' : 'error');
      onClose();
    };
    return (
      <Modal open onClose={onClose} size="lg" title={t('trainers.notifyExpiry')} subtitle="Abonnements expirés & bientôt expirés"
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={send} className="btn-primary" disabled={!sel.length || sending}><Mail className="h-4 w-4" />{sending ? '…' : `${t('common.send')} (${sel.length})`}</button></>}>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {list.length === 0 && <EmptyState title="Aucun abonnement à notifier" icon={<Bell className="h-7 w-7" />} />}
          {list.map((p) => { const d = daysUntil(p.assignedSubscription!.expiryDate); const on = sel.includes(p.id); return (
            <button key={p.id} onClick={() => toggle(p.id)} className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${on ? 'bg-accent/10 border border-accent/30' : 'bg-surface-2 border border-transparent'}`}>
              <input type="checkbox" readOnly checked={on} className="h-4 w-4 accent-[rgb(var(--accent))]" />
              <Avatar name={L.playerName(p)} id={p.id} size={36} />
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-fg">{L.playerName(p)}</p><p className="text-xs text-muted">{p.email || '—'}</p></div>
              <Badge tone={d < 0 ? 'danger' : 'warning'}>{d < 0 ? t('players.expired') : `${d}j`}</Badge>
            </button>
          ); })}
        </div>
      </Modal>
    );
  }
}

function ActBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label}
      className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition-colors ${danger ? 'text-muted hover:text-danger hover:bg-danger/10' : 'text-muted hover:text-accent hover:bg-surface-3'}`}>
      {icon}<span className="truncate w-full text-center">{label}</span>
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-muted">{label}</p><p className="font-semibold text-fg mt-0.5 break-words">{value}</p></div>;
}

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import {
  Users, Plus, Eye, Pencil, Trash2, Ticket, CreditCard, CircleDollarSign, Calendar,
  Phone, Mail, MapPin, User, Bell, Check, Upload, Printer, Trophy, X, ScanLine,
} from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, SearchInput, Avatar, Tabs } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Select, SearchSelect } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useScan } from '../components/scan/ScanCenter';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { money, uid, today, fmtDate, addDays, daysUntil } from '../lib/utils';
import { sendClubEmail } from '../lib/email';
import type { Player, AssignedSubscription } from '../lib/types';

const emptyPlayer = { firstName: '', lastName: '', birthDate: '', birthPlace: '', phone: '', email: '', parentId: '' };

export default function Players() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove } = useData();
  const { toast } = useToast();
  const scan = useScan();
  const L = useLookups();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [form, setForm] = useState(emptyPlayer);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Player | null>(null);
  const [assign, setAssign] = useState<Player | null>(null);
  const [payDebt, setPayDebt] = useState<Player | null>(null);
  const [cardPlayer, setCardPlayer] = useState<Player | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [emailAsk, setEmailAsk] = useState<Player | null>(null);

  const [f, setF] = useState({ search: '', category: '', group: '', sub: '', pay: '', state: '' });

  const current = (p: Player) => data.players.find((x) => x.id === p.id) || p;

  const filtered = useMemo(() => data.players.filter((p) => {
    const parent = p.parentId ? L.par[p.parentId] : undefined;
    const hay = `${p.firstName} ${p.lastName} ${p.phone} ${parent ? parent.firstName + ' ' + parent.lastName + ' ' + parent.phone : ''}`.toLowerCase();
    if (f.search && !hay.includes(f.search.toLowerCase())) return false;
    const tm = p.assignedSubscription ? L.tm[p.assignedSubscription.timingId] : undefined;
    if (f.category && tm?.categoryId !== f.category) return false;
    if (f.group && tm?.groupId !== f.group) return false;
    if (f.sub && p.assignedSubscription?.subscriptionId !== f.sub) return false;
    if (f.pay && p.assignedSubscription?.status !== f.pay) return false;
    if (f.state) {
      const d = p.assignedSubscription ? daysUntil(p.assignedSubscription.expiryDate) : -9999;
      if (f.state === 'active' && !(p.assignedSubscription && d >= 0)) return false;
      if (f.state === 'expired' && !(p.assignedSubscription && d < 0)) return false;
      if (f.state === 'soon' && !(p.assignedSubscription && d >= 0 && d <= 7)) return false;
    }
    return true;
  }), [data.players, f, L]);

  const expiredList = data.players.filter((p) => p.assignedSubscription && daysUntil(p.assignedSubscription.expiryDate) < 0);

  const openCreate = () => { setEditId(null); setForm(emptyPlayer); setFormOpen(true); };
  const openEdit = (p: Player) => { setEditId(p.id); setForm({ firstName: p.firstName, lastName: p.lastName, birthDate: p.birthDate, birthPlace: p.birthPlace, phone: p.phone, email: p.email, parentId: p.parentId || '' }); setFormOpen(true); };
  const savePlayer = () => {
    if (!form.firstName || !form.lastName) { toast('Prénom et nom requis', 'error'); return; }
    if (editId) { updateItem('players', editId, { ...form }); toast('Joueur mis à jour', 'success'); }
    else {
      const id = uid('pl');
      add('players', { id, ...form, createdAt: today(), subscriptionCostPaid: false, payments: [] });
      if (form.parentId) { const par = L.par[form.parentId]; if (par) updateItem('parents', par.id, { playerIds: [...par.playerIds, id] }); }
      toast('Joueur créé — inscription non payée', 'success');
    }
    setFormOpen(false);
  };

  return (
    <div>
      <PageHeader title={t('players.title')} subtitle={`${data.players.length} joueurs`} icon={<Users className="h-5 w-5" />}
        actions={<>
          <button onClick={scan.open} className="btn-ghost"><ScanLine className="h-4 w-4" />{t('scan.button')}</button>
          <button onClick={() => setAlertOpen(true)} className="btn-ghost relative">
            <Bell className="h-4 w-4" />{t('players.expiryAlert')}
            {expiredList.length > 0 && <span className="ml-1 badge bg-danger/20 text-danger">{expiredList.length}</span>}
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('players.newPlayer')}</button>
        </>} />

      <div className="card p-4 mb-5 space-y-3">
        <SearchInput value={f.search} onChange={(v) => setF({ ...f, search: v })} placeholder={t('players.searchPh')} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <Select value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder={t('players.filterCategory')} options={data.categories.map((c) => ({ value: c.id, label: c.name }))} />
          <Select value={f.group} onChange={(v) => setF({ ...f, group: v })} placeholder={t('players.filterGroup')} options={data.groups.map((c) => ({ value: c.id, label: c.name }))} />
          <Select value={f.sub} onChange={(v) => setF({ ...f, sub: v })} placeholder={t('players.filterSub')} options={data.subscriptions.map((c) => ({ value: c.id, label: c.name }))} />
          <Select value={f.pay} onChange={(v) => setF({ ...f, pay: v })} placeholder={t('players.filterPay')} options={[{ value: 'payed', label: t('common.paid') }, { value: 'debt', label: t('players.debt') }]} />
          <Select value={f.state} onChange={(v) => setF({ ...f, state: v })} placeholder={t('common.status')} options={[{ value: 'active', label: t('players.activeSubs') }, { value: 'expired', label: t('players.expiredSubs') }, { value: 'soon', label: t('players.soonExpiring') }]} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun joueur" icon={<Users className="h-7 w-7" />} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => <PlayerCard key={p.id} p={p} i={i} />)}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="lg" title={editId ? 'Modifier joueur' : t('players.newPlayer')}
        footer={<><button onClick={() => setFormOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={savePlayer} className="btn-primary">{t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('common.firstName')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <Input label={t('common.lastName')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <Input label={t('common.birthDate')} type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <Input label={t('players.birthPlace')} value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
          <Input label={t('common.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="sm:col-span-2">
            <Select label={t('players.parentInfo')} value={form.parentId} onChange={(v) => setForm({ ...form, parentId: v })} placeholder={t('common.none')}
              options={data.parents.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} />
          </div>
        </div>
      </Modal>

      {detail && <DetailModal p={current(detail)} onClose={() => setDetail(null)} />}
      {assign && <AssignModal p={current(assign)} onClose={() => setAssign(null)} />}
      {payDebt && <PayDebtModal p={current(payDebt)} onClose={() => setPayDebt(null)} />}
      {cardPlayer && <CardPrintModal p={current(cardPlayer)} onClose={() => setCardPlayer(null)} />}
      {emailAsk && <EmailAskModal player={current(emailAsk)} onClose={() => setEmailAsk(null)} />}

      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} size="lg" title={t('players.expiryAlert')} subtitle={`${expiredList.length} abonnements expirés`}>
        {expiredList.length === 0 ? <p className="text-sm text-muted">Aucune expiration 🎉</p> : (
          <div className="space-y-2">
            {expiredList.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <Avatar name={L.playerName(p)} id={p.id} size={38} />
                <div className="flex-1"><p className="text-sm font-semibold text-fg">{L.playerName(p)}</p><p className="text-xs text-muted">{t('players.expiry')}: {fmtDate(p.assignedSubscription!.expiryDate)}</p></div>
                <Badge tone="danger">{Math.abs(daysUntil(p.assignedSubscription!.expiryDate))}j</Badge>
                {canDo('players', 'assign') && <button onClick={() => { setAlertOpen(false); setAssign(p); }} className="btn-ghost !py-1.5 !px-3 text-xs">{t('players.assign')}</button>}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {confirm.node}
    </div>
  );

  function PlayerCard({ p, i }: { p: Player; i: number }) {
    const a = p.assignedSubscription;
    const tm = a ? L.tm[a.timingId] : undefined;
    const d = a ? daysUntil(a.expiryDate) : null;
    const state = d === null ? 'none' : d < 0 ? 'expired' : d <= 7 ? 'soon' : 'active';
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <Avatar name={L.playerName(p)} id={p.id} size={48} />
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-fg truncate">{L.playerName(p)}</h3>
            <p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone || '—'}</p>
          </div>
          <Badge tone={p.subscriptionCostPaid ? 'success' : 'muted'}>{p.subscriptionCostPaid ? t('players.regPaid') : t('players.regUnpaid')}</Badge>
        </div>

        {a && tm ? (
          <div className="mt-4 rounded-xl bg-surface-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted truncate">{tm.name}</span>
              <Badge tone={a.status === 'payed' ? 'success' : 'warning'}>{a.status === 'payed' ? t('common.paid') : t('players.debt')}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(a.expiryDate)}</span>
              <Badge tone={state === 'expired' ? 'danger' : state === 'soon' ? 'warning' : 'success'}>
                {state === 'expired' ? t('players.expired') : `${d} ${t('players.daysLeft')}`}
              </Badge>
            </div>
            {a.rest > 0 && <p className="text-xs text-danger mt-2 font-semibold">{t('common.rest')}: {money(a.rest)}</p>}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-center text-xs text-muted">{t('players.noSub')}</div>
        )}

        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-line/10">
          {canDo('players', 'view') && <button onClick={() => setDetail(p)} className="btn-ghost flex-1 !py-2"><Eye className="h-4 w-4" />{t('common.view')}</button>}
          {canDo('players', 'assign') && <button onClick={() => setAssign(p)} className="btn-icon" title={t('players.assign')}><Ticket className="h-4 w-4" /></button>}
          {canDo('players', 'card') && <button onClick={() => setCardPlayer(p)} className="btn-icon" title={t('players.card')}><CreditCard className="h-4 w-4" /></button>}
          {a && a.rest > 0 && canDo('players', 'payDebt') && <button onClick={() => setPayDebt(p)} className="btn-icon text-warning" title={t('players.payDebt')}><CircleDollarSign className="h-4 w-4" /></button>}
          {canDo('players', 'edit') && <button onClick={() => openEdit(p)} className="btn-icon" title={t('common.edit')}><Pencil className="h-4 w-4" /></button>}
          {canDo('players', 'delete') && <button onClick={() => confirm.ask(() => { remove('players', p.id); toast('Supprimé', 'info'); }, `Supprimer ${L.playerName(p)} ?`)} className="btn-icon hover:text-danger" title={t('common.delete')}><Trash2 className="h-4 w-4" /></button>}
        </div>
      </motion.div>
    );
  }

  function DetailModal({ p, onClose }: { p: Player; onClose: () => void }) {
    const [tab, setTab] = useState('info');
    const parent = p.parentId ? L.par[p.parentId] : undefined;
    const a = p.assignedSubscription;
    const removeSub = () => { updateItem('players', p.id, { assignedSubscription: undefined }); toast('Abonnement retiré', 'info'); onClose(); };
    return (
      <Modal open onClose={onClose} size="lg" title={L.playerName(p)} subtitle={p.email}>
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'info', label: t('players.personalInfo'), icon: <User className="h-4 w-4" /> },
          { key: 'sub', label: t('players.subInfo'), icon: <Ticket className="h-4 w-4" /> },
          { key: 'pay', label: t('players.paymentHistory'), icon: <CircleDollarSign className="h-4 w-4" /> },
        ]} />
        <div className="mt-5">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Info label={t('common.birthDate')} value={fmtDate(p.birthDate)} />
                <Info label={t('players.birthPlace')} value={p.birthPlace || '—'} />
                <Info label={t('common.phone')} value={p.phone || '—'} />
                <Info label={t('common.email')} value={p.email || '—'} />
              </div>
              <div>
                <p className="label">{t('players.parentInfo')}</p>
                {parent ? (
                  <div className="rounded-xl bg-surface-2 p-4 space-y-1.5">
                    <p className="font-semibold text-fg">{parent.firstName} {parent.lastName}</p>
                    <p className="text-sm text-muted flex items-center gap-2"><Phone className="h-4 w-4" />{parent.phone}</p>
                    <p className="text-sm text-muted flex items-center gap-2"><Mail className="h-4 w-4" />{parent.email}</p>
                    <p className="text-sm text-muted flex items-center gap-2"><MapPin className="h-4 w-4" />{parent.address}</p>
                  </div>
                ) : <p className="text-sm text-muted">Aucun parent lié</p>}
              </div>
            </div>
          )}
          {tab === 'sub' && (
            a ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-accent/10 border border-accent/20 p-4">
                  <p className="font-display font-bold text-fg">{L.timingName(a.timingId)}</p>
                  <p className="text-xs text-muted mt-1">{fmtDate(a.startDate)} → {fmtDate(a.expiryDate)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Info label={t('common.price')} value={money(a.price)} />
                  <Info label={t('common.paid')} value={money(a.amountPaid)} />
                  <Info label={t('common.rest')} value={money(a.rest)} accent={a.rest > 0} />
                </div>
                <div className="flex items-center gap-2"><Badge tone={a.status === 'payed' ? 'success' : 'warning'}>{a.status === 'payed' ? t('common.paid') : t('players.debt')}</Badge>
                  <Badge tone={p.subscriptionCostPaid ? 'success' : 'muted'}>{p.subscriptionCostPaid ? t('players.regPaid') : t('players.regUnpaid')}</Badge></div>
                <button onClick={removeSub} className="btn-danger"><Trash2 className="h-4 w-4" />{t('players.removeSub')}</button>
              </div>
            ) : <EmptyState title={t('players.noSub')} hint="Utilisez « Assigner abonnement »." icon={<Ticket className="h-7 w-7" />} />
          )}
          {tab === 'pay' && (
            <div className="space-y-2">
              {p.payments.length === 0 && <p className="text-sm text-muted">{t('common.noData')}</p>}
              {[...p.payments].sort((x, y) => y.date.localeCompare(x.date)).map((pay) => (
                <div key={pay.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                  <div><p className="text-sm font-semibold text-fg">{pay.note}</p><p className="text-xs text-muted">{fmtDate(pay.date)}</p></div>
                  <span className="font-bold text-success">+{money(pay.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    );
  }

  function AssignModal({ p, onClose }: { p: Player; onClose: () => void }) {
    const [subId, setSubId] = useState(p.assignedSubscription?.subscriptionId || '');
    const [startDate, setStartDate] = useState(today());
    const sub = data.subscriptions.find((s) => s.id === subId);
    const [amountPaid, setAmountPaid] = useState<number>(sub?.totalPrice || 0);
    const [regPaid, setRegPaid] = useState(p.subscriptionCostPaid);
    const price = sub?.totalPrice || 0;
    const expiry = sub ? addDays(startDate, sub.periodDays) : '';
    const rest = Math.max(0, price - amountPaid);

    const onPick = (v: string) => { setSubId(v); const s = data.subscriptions.find((x) => x.id === v); setAmountPaid(s?.totalPrice || 0); };

    const save = () => {
      if (!sub) { toast('Sélectionnez un abonnement', 'error'); return; }
      const a: AssignedSubscription = { subscriptionId: sub.id, timingId: sub.timingId, startDate, expiryDate: expiry, price, amountPaid, rest, status: rest > 0 ? 'debt' : 'payed' };
      const payment = { id: uid('pay'), date: today(), amount: amountPaid, note: `Abonnement ${sub.name}${rest > 0 ? ' (acompte)' : ''}`, kind: 'subscription' as const };
      updateItem('players', p.id, { assignedSubscription: a, subscriptionCostPaid: regPaid, payments: [payment, ...p.payments] });
      toast(rest > 0 ? 'Abonnement assigné (créance)' : 'Abonnement assigné (payé)', 'success');
      onClose();
      setEmailAsk(p);
    };

    return (
      <Modal open onClose={onClose} size="lg" title={t('players.assignSub')} subtitle={L.playerName(p)}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="space-y-4">
          <SearchSelect label={t('subs.searchTiming')} value={subId} onChange={onPick} placeholder={t('subs.searchTiming')}
            options={data.subscriptions.map((s) => ({ value: s.id, label: s.name, sub: `${money(s.totalPrice)} · ${s.periodDays}j` }))} />
          {sub && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label={t('common.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <div><label className="label">{t('players.expiry')}</label><div className="input bg-surface-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" />{fmtDate(expiry)}</div></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className="label">{t('common.price')}</label><div className="input bg-surface-3 font-bold">{money(price)}</div></div>
                <Input label={t('players.howMuchPaid')} type="number" value={amountPaid} onChange={(e) => setAmountPaid(Math.min(price, Math.max(0, +e.target.value)))} />
                <div><label className="label">{t('common.rest')}</label><div className={`input bg-surface-3 font-bold ${rest > 0 ? 'text-danger' : 'text-success'}`}>{money(rest)}</div></div>
              </div>
              <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3.5 cursor-pointer">
                <input type="checkbox" checked={regPaid} onChange={(e) => setRegPaid(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent))]" />
                <div><p className="text-sm font-semibold text-fg">{t('players.regFee')}</p><p className="text-xs text-muted">Cocher si le joueur a payé les frais d'inscription</p></div>
              </label>
              <div className={`rounded-xl border px-4 py-3 ${rest > 0 ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'}`}>
                <p className="text-sm font-semibold">{rest > 0 ? `⚠ Enregistré comme créance — reste ${money(rest)}` : '✓ Enregistré comme payé'}</p>
              </div>
            </>
          )}
        </div>
      </Modal>
    );
  }

  function PayDebtModal({ p, onClose }: { p: Player; onClose: () => void }) {
    const a = p.assignedSubscription!;
    const [amount, setAmount] = useState<number>(a.rest);
    const newRest = Math.max(0, a.rest - amount);
    const save = () => {
      const updated: AssignedSubscription = { ...a, amountPaid: a.amountPaid + amount, rest: newRest, status: newRest > 0 ? 'debt' : 'payed' };
      const payment = { id: uid('pay'), date: today(), amount, note: 'Paiement créance', kind: 'debt' as const };
      updateItem('players', p.id, { assignedSubscription: updated, payments: [payment, ...p.payments] });
      toast('Paiement enregistré', 'success'); onClose();
    };
    return (
      <Modal open onClose={onClose} size="md" title={t('players.payDebt')} subtitle={L.playerName(p)}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary" disabled={amount <= 0}>{t('common.save')}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Info label={t('common.total')} value={money(a.price)} />
            <Info label={t('common.paid')} value={money(a.amountPaid)} />
            <Info label={t('common.rest')} value={money(a.rest)} accent />
          </div>
          <Input label="Montant payé cette fois" type="number" value={amount} onChange={(e) => setAmount(Math.min(a.rest, Math.max(0, +e.target.value)))} />
          <div className="rounded-xl bg-surface-2 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted">Nouveau reste</span>
            <span className={`font-display text-lg font-extrabold ${newRest > 0 ? 'text-danger' : 'text-success'}`}>{money(newRest)}</span>
          </div>
        </div>
      </Modal>
    );
  }

  function CardPrintModal({ p, onClose }: { p: Player; onClose: () => void }) {
    const [type, setType] = useState<'qr' | 'barcode'>('qr');
    const [photo, setPhoto] = useState<string>('');
    // Object URL is local-only (never uploaded/saved) — revoke it on unmount to avoid leaking memory.
    useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
    const doPrint = () => {
      document.body.classList.add('printing-card');
      const cleanup = () => { document.body.classList.remove('printing-card'); window.removeEventListener('afterprint', cleanup); };
      window.addEventListener('afterprint', cleanup);
      window.print();
      setTimeout(cleanup, 1200);
    };
    const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      if (!file.type.startsWith('image/')) { toast('Le fichier doit être une image', 'error'); return; }
      if (photo) URL.revokeObjectURL(photo);
      setPhoto(URL.createObjectURL(file));
    };
    return (
      <Modal open onClose={onClose} size="lg" title={t('players.printCard')} subtitle={L.playerName(p)}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.close')}</button><button onClick={doPrint} className="btn-primary"><Printer className="h-4 w-4" />{t('common.print')}</button></>}>
        <div className="flex flex-wrap items-center gap-3 mb-5 no-print">
          <div className="inline-flex p-1 rounded-xl bg-surface-2 border border-line/10">
            <button onClick={() => setType('qr')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg ${type === 'qr' ? 'bg-accent-grad text-black' : 'text-muted'}`}>{t('players.qr')}</button>
            <button onClick={() => setType('barcode')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg ${type === 'barcode' ? 'bg-accent-grad text-black' : 'text-muted'}`}>{t('players.barcode')}</button>
          </div>
          <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />{t('players.uploadPhoto')}<input type="file" accept="image/*" className="hidden" onChange={onPhoto} /></label>
        </div>

        <div className="flex justify-center">
          <div className="print-card w-[340px] rounded-2xl overflow-hidden bg-white text-black shadow-2xl" style={{ border: '1px solid #eee' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundImage: 'linear-gradient(135deg, #ea580c, #ff7a00)' }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Trophy className="h-5 w-5 text-white" /></div>
              <div><p className="font-extrabold text-white leading-none">{data.club.name}</p><p className="text-[10px] text-white/80 mt-1">{data.club.address}</p></div>
            </div>
            <div className="p-5 flex gap-4">
              <div className="h-24 w-24 rounded-xl overflow-hidden bg-gray-100 grid place-items-center shrink-0" style={{ border: '2px solid #ff7a00' }}>
                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-extrabold leading-tight">{L.playerName(p)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{fmtDate(p.birthDate)} · {p.birthPlace}</p>
                <p className="text-xs text-gray-500 mt-2">Tel: {p.phone}</p>
                {p.assignedSubscription && <p className="text-[11px] text-gray-500 mt-1">{L.catName(L.tm[p.assignedSubscription.timingId]?.categoryId)} · {L.grpName(L.tm[p.assignedSubscription.timingId]?.groupId)}</p>}
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-center">
              {type === 'qr'
                ? <QRCodeSVG value={`OFC-${p.id}`} size={120} fgColor="#111111" level="M" />
                : <Barcode value={p.id.slice(-10).toUpperCase()} height={56} width={1.6} fontSize={12} background="#ffffff" />}
            </div>
            <div className="text-center text-[10px] text-gray-400 pb-3">ID: {p.id.toUpperCase()}</div>
          </div>
        </div>
      </Modal>
    );
  }

  function EmailAskModal({ player, onClose }: { player: Player; onClose: () => void }) {
    const parent = player.parentId ? L.par[player.parentId] : undefined;
    const [sending, setSending] = useState(false);
    const send = async () => {
      const recipients = [
        player.email ? { email: player.email, name: `${player.firstName} ${player.lastName}` } : null,
        parent?.email ? { email: parent.email, name: `${parent.firstName} ${parent.lastName}` } : null,
      ].filter((r): r is { email: string; name: string } => !!r);
      if (recipients.length === 0) return;
      setSending(true);
      try {
        const a = player.assignedSubscription;
        const html = `<p>Bonjour,</p><p>Confirmation d'abonnement pour ${player.firstName} ${player.lastName}${a ? ` : ${L.timingName(a.timingId)} — ${money(a.price)} (exp. ${fmtDate(a.expiryDate)})` : ''}.</p>`;
        await sendClubEmail(data.club, recipients, t('players.sendMail'), html);
        toast('E-mail envoyé', 'success');
        onClose();
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Échec de l\'envoi', 'error');
      } finally {
        setSending(false);
      }
    };
    return (
      <Modal open onClose={onClose} size="md" title={t('players.sendMail')} subtitle="Confirmation d'abonnement">
        <div className="text-center py-2">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent mb-4"><Mail className="h-7 w-7" /></div>
          <p className="text-fg font-semibold">Envoyer la confirmation par e-mail ?</p>
          <p className="text-sm text-muted mt-2">Destinataires :</p>
          <div className="mt-2 space-y-1 text-sm">
            {player.email && <p className="text-fg">{player.email} <span className="text-muted">(joueur)</span></p>}
            {parent?.email && <p className="text-fg">{parent.email} <span className="text-muted">(parent)</span></p>}
            {!player.email && !parent?.email && <p className="text-muted">Aucune adresse e-mail disponible</p>}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-ghost flex-1"><X className="h-4 w-4" />{t('common.no')}</button>
            <button onClick={send} className="btn-primary flex-1" disabled={sending || (!player.email && !parent?.email)}><Check className="h-4 w-4" />{sending ? '…' : t('common.send')}</button>
          </div>
        </div>
      </Modal>
    );
  }
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-semibold mt-0.5 ${accent ? 'text-danger' : 'text-fg'}`}>{value}</p>
    </div>
  );
}

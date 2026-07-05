import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Stethoscope, Plus, Eye, Pencil, Trash2, CircleDollarSign, CalendarClock,
  Wallet, Phone, X, Lock,
} from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, Avatar } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Textarea, Segmented } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';
import { money, uid, today, fmtDate } from '../lib/utils';
import { computeUnpaid, monthLabel } from '../lib/staff';
import type { Doctor, MoneyEntry } from '../lib/types';

const emptyDoctor = {
  fullName: '', phone: '', address: '',
  payType: 'month' as 'day' | 'month' | 'session', payAmount: 30000,
  accountActive: false, email: '', username: '', password: '',
};

const PAY_LABEL: Record<Doctor['payType'], string> = { day: 'jour', month: 'mois', session: 'séance' };

export default function Doctors() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove, refresh } = useData();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [form, setForm] = useState(emptyDoctor);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Doctor | null>(null);
  const [acompte, setAcompte] = useState<Doctor | null>(null);
  const [absence, setAbsence] = useState<Doctor | null>(null);
  const [pay, setPay] = useState<Doctor | null>(null);

  const cur = (d: Doctor) => data.doctors.find((x) => x.id === d.id) || d;
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => { setEditId(null); setForm(emptyDoctor); setOpen(true); };
  const openEdit = (d: Doctor) => {
    setEditId(d.id);
    setForm({ fullName: d.fullName, phone: d.phone, address: d.address, payType: d.payType, payAmount: d.payAmount, accountActive: d.accountActive, email: d.email || '', username: d.username || '', password: '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.fullName) { toast('Nom requis', 'error'); return; }
    if (form.accountActive && (!form.email.trim() || !form.username.trim())) {
      toast("E-mail et nom d'utilisateur requis pour activer le compte", 'error'); return;
    }
    const existing = editId ? data.doctors.find((d) => d.id === editId) : undefined;
    const creatingAccount = form.accountActive && !existing?.accountActive;
    const pwd = form.password.trim();
    if (creatingAccount && pwd.length < 6) { toast('Mot de passe requis (6 caractères min.) pour créer le compte', 'error'); return; }
    if (form.accountActive && pwd.length > 0 && pwd.length < 6) { toast('Mot de passe trop court (6 caractères min.)', 'error'); return; }

    setSaving(true);
    try {
      const basePatch = {
        fullName: form.fullName, phone: form.phone, address: form.address,
        payType: form.payType, payAmount: form.payAmount,
      };
      const doctorId = editId || uid('doc');

      if (editId) {
        await updateItem('doctors', editId, basePatch);
      } else {
        await add('doctors', {
          id: doctorId, ...basePatch, accountActive: false, createdAt: today(),
          acomptes: [], absences: [], payments: [],
        });
      }

      if (form.accountActive) {
        const { error } = await supabase.rpc('admin_upsert_doctor_account', {
          p_doctor_id: doctorId, p_email: form.email.trim(), p_username: form.username.trim(),
          p_password: pwd || null,
        });
        if (error) toast(`Compte de connexion non enregistré : ${error.message}`, 'error');
      } else if (existing?.accountActive) {
        const { error } = await supabase.rpc('admin_set_doctor_account_active', { p_doctor_id: doctorId, p_active: false });
        if (error) toast(`Erreur : ${error.message}`, 'error');
      }

      refresh();
      toast(editId ? 'Médecin mis à jour' : 'Médecin créé', 'success');
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur inattendue', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('nav.doctors')} subtitle={`${data.doctors.length} médecins`} icon={<Stethoscope className="h-5 w-5" />}
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />Nouveau médecin</button>} />

      {data.doctors.length === 0 ? <EmptyState title="Aucun médecin" icon={<Stethoscope className="h-7 w-7" />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.doctors.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5">
              <div className="flex items-center gap-3">
                <Avatar name={d.fullName} id={d.id} size={48} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-fg truncate">{d.fullName}</h3>
                  <p className="text-xs text-muted flex items-center gap-1"><Stethoscope className="h-3 w-3" />Médecin</p>
                </div>
                {d.accountActive && <Badge tone="success"><Lock className="h-3 w-3" />Compte</Badge>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{t('common.phone')}</p><p className="font-semibold text-fg text-xs truncate">{d.phone || '—'}</p></div>
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted">Rémunération</p><p className="font-bold text-fg text-xs">{money(d.payAmount)}/{PAY_LABEL[d.payType]}</p></div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-4 pt-4 border-t border-line/10">
                <ActBtn icon={<Eye className="h-4 w-4" />} label={t('common.view')} onClick={() => setDetail(d)} />
                <ActBtn icon={<CircleDollarSign className="h-4 w-4" />} label={t('trainers.acomptes')} onClick={() => setAcompte(d)} />
                <ActBtn icon={<CalendarClock className="h-4 w-4" />} label={t('trainers.absences')} onClick={() => setAbsence(d)} />
                <ActBtn icon={<Wallet className="h-4 w-4" />} label={t('trainers.payment')} onClick={() => setPay(d)} />
                <ActBtn icon={<Pencil className="h-4 w-4" />} label={t('common.edit')} onClick={() => openEdit(d)} />
                <ActBtn icon={<Trash2 className="h-4 w-4" />} label={t('common.delete')} danger onClick={() => confirm.ask(() => { remove('doctors', d.id); toast('Supprimé', 'info'); }, `Supprimer ${d.fullName} ?`)} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editId ? 'Modifier médecin' : 'Nouveau médecin'}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost" disabled={saving}>{t('common.cancel')}</button><button onClick={save} className="btn-primary" disabled={saving}>{saving ? '…' : t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('common.fullName')} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} required />
          <Input label={t('common.phone')} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          <div className="sm:col-span-2"><Input label={t('common.address')} value={form.address} onChange={(e) => set({ address: e.target.value })} /></div>
        </div>

        <div className="mt-5 rounded-xl bg-surface-2 p-4">
          <p className="text-sm font-semibold text-fg mb-3">{t('workers.payInfo')}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Type</label><Segmented value={form.payType} onChange={(v) => set({ payType: v })} options={[{ value: 'month', label: t('workers.perMonth') }, { value: 'day', label: t('workers.perDay') }, { value: 'session', label: 'Par séance' }]} /></div>
            <Input label={t('common.amount')} type="number" value={form.payAmount} onChange={(e) => set({ payAmount: +e.target.value })} />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-surface-2 p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.accountActive} onChange={(e) => set({ accountActive: e.target.checked })} className="h-5 w-5 accent-[rgb(var(--accent))]" />
            <span className="text-sm font-semibold text-fg">{t('workers.activateAccount')}</span>
          </label>
          {form.accountActive && (
            <div className="grid sm:grid-cols-3 gap-4 mt-4">
              <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              <Input label={t('auth.username')} value={form.username} onChange={(e) => set({ username: e.target.value })} />
              <Input label={t('auth.password')} type="text" value={form.password} onChange={(e) => set({ password: e.target.value })}
                placeholder={editId ? 'Laisser vide pour garder le mot de passe actuel' : '••••••••'} />
            </div>
          )}
        </div>
      </Modal>

      {detail && <DetailModal d={cur(detail)} onClose={() => setDetail(null)} />}
      {acompte && <MoneyModal d={cur(acompte)} kind="acompte" onClose={() => setAcompte(null)} />}
      {absence && <MoneyModal d={cur(absence)} kind="absence" onClose={() => setAbsence(null)} />}
      {pay && <PaymentModal d={cur(pay)} onClose={() => setPay(null)} />}

      {confirm.node}
    </div>
  );

  function DetailModal({ d, onClose }: { d: Doctor; onClose: () => void }) {
    return (
      <Modal open onClose={onClose} size="lg" title={d.fullName} subtitle="Médecin">
        <div className="grid grid-cols-2 gap-3">
          <Info label={t('common.phone')} value={d.phone || '—'} />
          <Info label={t('common.address')} value={d.address || '—'} />
          <Info label="Rémunération" value={`${money(d.payAmount)} / ${PAY_LABEL[d.payType]}`} />
          <Info label="Compte" value={d.accountActive ? `${d.username} (${d.email})` : 'Désactivé'} />
          <Info label="Créé le" value={fmtDate(d.createdAt)} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Info label={t('trainers.acomptes')} value={money(d.acomptes.reduce((s, a) => s + a.amount, 0))} />
          <Info label={t('trainers.absences')} value={money(d.absences.reduce((s, a) => s + a.amount, 0))} />
          <Info label="Payé au total" value={money(d.payments.reduce((s, p) => s + p.amount, 0))} />
        </div>
      </Modal>
    );
  }

  function MoneyModal({ d, kind, onClose }: { d: Doctor; kind: 'acompte' | 'absence'; onClose: () => void }) {
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(today());
    const list = kind === 'acompte' ? d.acomptes : d.absences;
    const save = () => {
      if (amount <= 0) { toast('Montant requis', 'error'); return; }
      const entry: MoneyEntry = { id: uid(kind), amount, description, date };
      updateItem('doctors', d.id, kind === 'acompte' ? { acomptes: [entry, ...d.acomptes] } : { absences: [entry, ...d.absences] });
      toast(kind === 'acompte' ? 'Acompte ajouté' : 'Absence ajoutée', 'success'); setAmount(0); setDescription('');
    };
    return (
      <Modal open onClose={onClose} size="md" title={kind === 'acompte' ? t('trainers.newAcompte') : t('trainers.newAbsence')} subtitle={d.fullName}>
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
                <button onClick={() => updateItem('doctors', d.id, kind === 'acompte' ? { acomptes: d.acomptes.filter((x) => x.id !== m.id) } : { absences: d.absences.filter((x) => x.id !== m.id) })} className="btn-icon hover:text-danger"><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted text-center py-3">{t('common.noData')}</p>}
        </div>
      </Modal>
    );
  }

  function PaymentModal({ d, onClose }: { d: Doctor; onClose: () => void }) {
    // 'session' doctors are paid ad-hoc: no month-based gross, the admin
    // enters the amount; acomptes/absences still deduct like the others.
    const isSession = d.payType === 'session';
    const u = computeUnpaid({
      startDate: d.createdAt, payType: (isSession ? 'month' : d.payType) as 'day' | 'month',
      amount: isSession ? 0 : d.payAmount,
      acomptes: d.acomptes, absences: d.absences, payments: d.payments,
    });
    const [amount, setAmount] = useState<number>(u.net);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(today());
    const save = () => {
      updateItem('doctors', d.id, { payments: [{ id: uid('sp'), date, description, amount, monthsCovered: u.unpaidMonths, acompteIds: u.unpaidAcomptes.map((a) => a.id), absenceIds: u.unpaidAbsences.map((a) => a.id) }, ...d.payments] });
      toast('Paiement effectué', 'success'); onClose();
    };
    return (
      <Modal open onClose={onClose} size="lg" title={t('trainers.paySalary')} subtitle={d.fullName}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary"><Wallet className="h-4 w-4" />{t('trainers.paySalary')}</button></>}>
        <div className="space-y-4">
          {isSession ? (
            <div className="rounded-xl bg-info/10 border border-info/20 p-4">
              <p className="text-sm font-semibold text-fg">Rémunération par séance — {money(d.payAmount)} / séance</p>
              <p className="text-sm text-muted mt-1">Saisissez le montant à payer (séances effectuées × tarif), les acomptes/absences non couverts seront marqués réglés.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-info/10 border border-info/20 p-4">
              <p className="text-sm font-semibold text-fg mb-2">{d.payType === 'month' ? t('trainers.unpaidMonths') : 'Périodes non payées'} ({u.unpaidMonths.length})</p>
              <div className="flex flex-wrap gap-2">{u.unpaidMonths.map((m) => <Badge key={m} tone="info">{monthLabel(m)}</Badge>)}
                {u.unpaidMonths.length === 0 && <span className="text-xs text-muted">Tout est payé</span>}</div>
              <p className="text-sm text-muted mt-3">Brut = <span className="font-bold text-fg">{money(u.gross)}</span></p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Info label="Brut" value={money(u.gross)} />
            <Info label={t('trainers.acomptes')} value={`- ${money(u.acomptesTotal)}`} />
            <Info label={t('trainers.absences')} value={`- ${money(u.absencesTotal)}`} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Montant net (modifiable)" type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} />
            <Input label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Textarea label={`${t('common.description')} (optionnel)`} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="rounded-xl bg-success/10 border border-success/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">Net calculé</span>
            <span className="font-display text-xl font-extrabold text-success">{money(u.net)}</span>
          </div>
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

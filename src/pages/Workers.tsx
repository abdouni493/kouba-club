import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  HardHat, Plus, Eye, Pencil, Trash2, ShieldCheck, CircleDollarSign, CalendarClock,
  Wallet, Phone, Check, X, Lock, Briefcase,
} from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, Avatar } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Textarea, CreatableSelect, Segmented } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { supabase } from '../lib/supabaseClient';
import { money, uid, today, fmtDate } from '../lib/utils';
import { computeUnpaid, monthLabel } from '../lib/staff';
import { NAV } from '../lib/nav';
import type { Worker, MoneyEntry, WorkerPermissions } from '../lib/types';

const emptyWorker = {
  fullName: '', birthDate: '', idCard: '', phone: '', roleId: '',
  payActive: true, payType: 'month' as 'day' | 'month', payAmount: 30000,
  accountActive: false, email: '', username: '', password: '', startDate: today(),
};

// The "workers" and "doctors" NAV entries are never assignable — their
// management is always admin-only (see HARD_ADMIN_ONLY_PAGES in
// lib/permissions.ts and the RLS policies), so offering them here would be
// misleading (the toggle would have no real effect on data access).
const ASSIGNABLE_NAV = NAV.filter((n) => n.key !== 'workers' && n.key !== 'doctors');

export default function Workers() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove, refresh } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const confirm = useConfirm();

  const [form, setForm] = useState(emptyWorker);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Worker | null>(null);
  const [perms, setPerms] = useState<Worker | null>(null);
  const [acompte, setAcompte] = useState<Worker | null>(null);
  const [absence, setAbsence] = useState<Worker | null>(null);
  const [pay, setPay] = useState<Worker | null>(null);

  const cur = (w: Worker) => data.workers.find((x) => x.id === w.id) || w;
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => { setEditId(null); setForm(emptyWorker); setOpen(true); };
  const openEdit = (w: Worker) => { setEditId(w.id); setForm({ fullName: w.fullName, birthDate: w.birthDate, idCard: w.idCard || '', phone: w.phone, roleId: w.roleId, payActive: w.payActive, payType: w.payType, payAmount: w.payAmount, accountActive: w.accountActive, email: w.email || '', username: w.username || '', password: '', startDate: w.startDate }); setOpen(true); };

  const save = async () => {
    if (!form.fullName) { toast('Nom requis', 'error'); return; }
    if (form.accountActive && (!form.email.trim() || !form.username.trim())) {
      toast("E-mail et nom d'utilisateur requis pour activer le compte", 'error'); return;
    }
    const existing = editId ? data.workers.find((w) => w.id === editId) : undefined;
    const creatingAccount = form.accountActive && !existing?.accountActive;
    const pwd = form.password.trim();
    if (creatingAccount && pwd.length < 6) { toast('Mot de passe requis (6 caractères min.) pour créer le compte', 'error'); return; }
    if (form.accountActive && pwd.length > 0 && pwd.length < 6) { toast('Mot de passe trop court (6 caractères min.)', 'error'); return; }

    setSaving(true);
    try {
      const basePatch = {
        fullName: form.fullName, birthDate: form.birthDate, idCard: form.idCard, phone: form.phone,
        roleId: form.roleId, payActive: form.payActive, payType: form.payType, payAmount: form.payAmount,
        startDate: form.startDate,
      };
      const workerId = editId || uid('wk');

      if (editId) {
        await updateItem('workers', editId, basePatch);
      } else {
        await add('workers', {
          id: workerId, ...basePatch, accountActive: false,
          permissions: { pages: [], actions: {} }, acomptes: [], absences: [], payments: [],
        });
      }

      if (form.accountActive) {
        const { error } = await supabase.rpc('admin_upsert_worker_account', {
          p_worker_id: workerId, p_email: form.email.trim(), p_username: form.username.trim(),
          p_password: pwd || null,
        });
        if (error) toast(`Compte de connexion non enregistré : ${error.message}`, 'error');
      } else if (existing?.accountActive) {
        const { error } = await supabase.rpc('admin_set_worker_account_active', { p_worker_id: workerId, p_active: false });
        if (error) toast(`Erreur : ${error.message}`, 'error');
      }

      refresh();
      toast(editId ? 'Employé mis à jour' : 'Employé créé', 'success');
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur inattendue', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('workers.title')} subtitle={`${data.workers.length} employés`} icon={<HardHat className="h-5 w-5" />}
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('workers.newWorker')}</button>} />

      {data.workers.length === 0 ? <EmptyState title="Aucun employé" icon={<HardHat className="h-7 w-7" />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.workers.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5">
              <div className="flex items-center gap-3">
                <Avatar name={w.fullName} id={w.id} size={48} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-fg truncate">{w.fullName}</h3>
                  <p className="text-xs text-muted flex items-center gap-1"><Briefcase className="h-3 w-3" />{L.roleName(w.roleId)}</p>
                </div>
                {w.accountActive && <Badge tone="success"><Lock className="h-3 w-3" />Compte</Badge>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{t('common.phone')}</p><p className="font-semibold text-fg text-xs truncate">{w.phone}</p></div>
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted">Salaire</p><p className="font-bold text-fg text-xs">{w.payActive ? `${money(w.payAmount)}/${w.payType === 'month' ? 'mois' : 'jour'}` : '—'}</p></div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-4 pt-4 border-t border-line/10">
                <ActBtn icon={<Eye className="h-4 w-4" />} label={t('common.view')} onClick={() => setDetail(w)} />
                <ActBtn icon={<ShieldCheck className="h-4 w-4" />} label={t('workers.permissions')} onClick={() => setPerms(w)} />
                <ActBtn icon={<CircleDollarSign className="h-4 w-4" />} label={t('trainers.acomptes')} onClick={() => setAcompte(w)} />
                <ActBtn icon={<Wallet className="h-4 w-4" />} label={t('trainers.payment')} onClick={() => setPay(w)} />
                <ActBtn icon={<CalendarClock className="h-4 w-4" />} label={t('trainers.absences')} onClick={() => setAbsence(w)} />
                <ActBtn icon={<Pencil className="h-4 w-4" />} label={t('common.edit')} onClick={() => openEdit(w)} />
                <ActBtn icon={<Trash2 className="h-4 w-4" />} label={t('common.delete')} danger onClick={() => confirm.ask(() => { remove('workers', w.id); toast('Supprimé', 'info'); }, `Supprimer ${w.fullName} ?`)} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editId ? 'Modifier employé' : t('workers.newWorker')}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost" disabled={saving}>{t('common.cancel')}</button><button onClick={save} className="btn-primary" disabled={saving}>{saving ? '…' : t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('common.fullName')} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} required />
          <Input label={t('common.birthDate')} type="date" value={form.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
          <Input label={t('workers.idCard')} value={form.idCard} onChange={(e) => set({ idCard: e.target.value })} />
          <Input label={t('common.phone')} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          <CreatableSelect label={t('workers.role')} value={form.roleId} onChange={(v) => set({ roleId: v })}
            options={data.roles.map((r) => ({ value: r.id, label: r.name }))}
            onCreate={(name) => { const id = uid('role'); add('roles', { id, name }); return id; }} createLabel={t('workers.newRole')} />
          <Input label={t('workers.startWork')} type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </div>

        <div className="mt-5 rounded-xl bg-surface-2 p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.payActive} onChange={(e) => set({ payActive: e.target.checked })} className="h-5 w-5 accent-[rgb(var(--accent))]" />
            <span className="text-sm font-semibold text-fg">{t('workers.activatePay')}</span>
          </label>
          {form.payActive && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div><label className="label">Type</label><Segmented value={form.payType} onChange={(v) => set({ payType: v })} options={[{ value: 'month', label: t('workers.perMonth') }, { value: 'day', label: t('workers.perDay') }]} /></div>
              <Input label={t('common.amount')} type="number" value={form.payAmount} onChange={(e) => set({ payAmount: +e.target.value })} />
            </div>
          )}
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

      {detail && <DetailModal w={cur(detail)} onClose={() => setDetail(null)} />}
      {perms && <PermsModal w={cur(perms)} onClose={() => setPerms(null)} />}
      {acompte && <MoneyModal w={cur(acompte)} kind="acompte" onClose={() => setAcompte(null)} />}
      {absence && <MoneyModal w={cur(absence)} kind="absence" onClose={() => setAbsence(null)} />}
      {pay && <PaymentModal w={cur(pay)} onClose={() => setPay(null)} />}

      {confirm.node}
    </div>
  );

  function DetailModal({ w, onClose }: { w: Worker; onClose: () => void }) {
    return (
      <Modal open onClose={onClose} size="lg" title={w.fullName} subtitle={L.roleName(w.roleId)}>
        <div className="grid grid-cols-2 gap-3">
          <Info label={t('common.birthDate')} value={fmtDate(w.birthDate)} />
          <Info label={t('workers.idCard')} value={w.idCard || '—'} />
          <Info label={t('common.phone')} value={w.phone} />
          <Info label={t('workers.startWork')} value={fmtDate(w.startDate)} />
          <Info label="Rémunération" value={w.payActive ? `${money(w.payAmount)} / ${w.payType === 'month' ? 'mois' : 'jour'}` : 'Non activée'} />
          <Info label="Compte" value={w.accountActive ? `${w.username} (${w.email})` : 'Désactivé'} />
        </div>
        <div className="mt-4">
          <p className="label">{t('workers.permissions')}</p>
          {w.permissions.pages.length === 0 ? <p className="text-sm text-muted">Aucune permission</p> : (
            <div className="flex flex-wrap gap-2">{w.permissions.pages.map((p) => <Badge key={p} tone="accent">{t(`nav.${p}`)}</Badge>)}</div>
          )}
        </div>
      </Modal>
    );
  }

  function PermsModal({ w, onClose }: { w: Worker; onClose: () => void }) {
    const [pages, setPages] = useState<string[]>([...w.permissions.pages]);
    const [actions, setActions] = useState<Record<string, string[]>>({ ...w.permissions.actions });
    const togglePage = (key: string) => setPages((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key]);
    const toggleAction = (page: string, act: string) => setActions((a) => {
      const cur = a[page] || []; const next = cur.includes(act) ? cur.filter((x) => x !== act) : [...cur, act];
      return { ...a, [page]: next };
    });
    const save = () => { const perms: WorkerPermissions = { pages, actions }; updateItem('workers', w.id, { permissions: perms }); toast('Permissions enregistrées', 'success'); onClose(); };
    return (
      <Modal open onClose={onClose} size="lg" title={t('workers.permissions')} subtitle={w.fullName}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <p className="text-sm text-muted mb-4">{t('workers.selectPages')} — {t('workers.selectActions')}</p>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {ASSIGNABLE_NAV.map((n) => {
            const on = pages.includes(n.key);
            const Icon = n.icon;
            return (
              <div key={n.key} className={`rounded-xl border transition-colors ${on ? 'border-accent/30 bg-accent/5' : 'border-line/10 bg-surface-2'}`}>
                <button onClick={() => togglePage(n.key)} className="w-full flex items-center gap-3 p-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${on ? 'bg-accent-grad text-black' : 'bg-surface-3 text-muted'}`}>{on ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</div>
                  <span className="text-sm font-semibold text-fg flex-1 text-left">{t(`nav.${n.key}`)}</span>
                </button>
                {on && n.actions && (
                  <div className="px-3 pb-3 flex flex-wrap gap-2">
                    {n.actions.map((a) => {
                      const aon = (actions[n.key] || []).includes(a.key);
                      return (
                        <button key={a.key} onClick={() => toggleAction(n.key, a.key)}
                          className={`chip ${aon ? 'bg-accent/20 text-accent border-accent/30' : 'bg-surface-3 text-muted border-line/10'}`}>
                          {aon ? <Check className="h-3 w-3" /> : null}{a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    );
  }

  function MoneyModal({ w, kind, onClose }: { w: Worker; kind: 'acompte' | 'absence'; onClose: () => void }) {
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(today());
    const list = kind === 'acompte' ? w.acomptes : w.absences;
    const save = () => {
      if (amount <= 0) { toast('Montant requis', 'error'); return; }
      const entry: MoneyEntry = { id: uid(kind), amount, description, date };
      updateItem('workers', w.id, kind === 'acompte' ? { acomptes: [entry, ...w.acomptes] } : { absences: [entry, ...w.absences] });
      toast(kind === 'acompte' ? 'Acompte ajouté' : 'Absence ajoutée', 'success'); setAmount(0); setDescription('');
    };
    return (
      <Modal open onClose={onClose} size="md" title={kind === 'acompte' ? t('trainers.newAcompte') : t('trainers.newAbsence')} subtitle={w.fullName}>
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
                <button onClick={() => updateItem('workers', w.id, kind === 'acompte' ? { acomptes: w.acomptes.filter((x) => x.id !== m.id) } : { absences: w.absences.filter((x) => x.id !== m.id) })} className="btn-icon hover:text-danger"><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted text-center py-3">{t('common.noData')}</p>}
        </div>
      </Modal>
    );
  }

  function PaymentModal({ w, onClose }: { w: Worker; onClose: () => void }) {
    const u = computeUnpaid({ startDate: w.startDate, payType: w.payType, amount: w.payAmount, acomptes: w.acomptes, absences: w.absences, payments: w.payments });
    const [amount, setAmount] = useState<number>(u.net);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(today());
    const save = () => {
      updateItem('workers', w.id, { payments: [{ id: uid('sp'), date, description, amount, monthsCovered: u.unpaidMonths, acompteIds: u.unpaidAcomptes.map((a) => a.id), absenceIds: u.unpaidAbsences.map((a) => a.id) }, ...w.payments] });
      toast('Paiement effectué', 'success'); onClose();
    };
    return (
      <Modal open onClose={onClose} size="lg" title={t('trainers.paySalary')} subtitle={w.fullName}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary"><Wallet className="h-4 w-4" />{t('trainers.paySalary')}</button></>}>
        <div className="space-y-4">
          <div className="rounded-xl bg-info/10 border border-info/20 p-4">
            <p className="text-sm font-semibold text-fg mb-2">{w.payType === 'month' ? t('trainers.unpaidMonths') : 'Périodes non payées'} ({u.unpaidMonths.length})</p>
            <div className="flex flex-wrap gap-2">{u.unpaidMonths.map((m) => <Badge key={m} tone="info">{monthLabel(m)}</Badge>)}
              {u.unpaidMonths.length === 0 && <span className="text-xs text-muted">Tout est payé</span>}</div>
            <p className="text-sm text-muted mt-3">Brut = <span className="font-bold text-fg">{money(u.gross)}</span></p>
          </div>
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

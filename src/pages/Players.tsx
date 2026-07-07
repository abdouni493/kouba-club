import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import {
  Users, Plus, Eye, Pencil, Trash2, Ticket, CreditCard, CircleDollarSign, Calendar,
  Phone, Mail, MessageSquare, MapPin, User, Bell, Check, Upload, Printer, Trophy, X, ScanLine, AlertTriangle,
  HeartPulse, FileText, UserPlus, ImagePlus, Camera, Loader2,
  ClipboardList, ClipboardCheck, Shield, Clock,
} from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, SearchInput, Avatar, Tabs } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea, Segmented, CreatableSelect } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useScan } from '../components/scan/ScanCenter';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { uploadImage, uploadPdfForSms } from '../lib/storage';
import { money, uid, today, fmtDate, addDays, daysUntil, cx } from '../lib/utils';
import { sendClubEmail } from '../lib/email';
import { sendClubSms, normalizePhoneE164 } from '../lib/sms';
import { buildPlayerSubscriptionPdf, buildSubscriptionInvoicePdf } from '../lib/pdf';
import { insuranceStatus } from '../lib/insurance';
import type { Player, AssignedSubscription, Payment, MedicalRecord, PlayerEvaluation, PlayerInsurance } from '../lib/types';

const emptyPlayer = {
  firstName: '', lastName: '', birthDate: '', birthPlace: '', address: '', phone: '', email: '', parentId: '',
  photoUrl: '', documentUrls: [] as string[],
  medStatus: true, medDescription: '', medDate: today(),
};

/** Latest medical record for a player (its "current" status), or undefined. */
export function latestMedical(p: Player): MedicalRecord | undefined {
  if (!p.medicalRecords || p.medicalRecords.length === 0) return undefined;
  return [...p.medicalRecords].sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Card/print/PDF brand hexes — hardcoded (not the CSS var) so printed/emailed output never shifts with the viewer's theme.
const CARD_ACCENT = '#EA580C';
const CARD_ACCENT_STRONG = '#C2410C';
const CARD_ACCENT_SOFT = '#F97316';
const BALL_PATTERN_BG = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>" +
  "<g fill='none' stroke='#EA580C' stroke-width='1.2' opacity='0.07'>" +
  "<circle cx='32' cy='32' r='11'/>" +
  "<path d='M32 21l7 5-2.5 8h-9L25 26z'/>" +
  "<path d='M32 21V13M39 26l7-3M36.5 34l5 6M27.5 34l-5 6M25 26l-7-3'/>" +
  "</g></svg>",
)}")`;

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
  const [evalP, setEvalP] = useState<Player | null>(null);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [pquick, setPquick] = useState({ open: false, firstName: '', lastName: '', phone: '', email: '', address: '' });

  const [f, setF] = useState({ search: '', category: '', group: '', sub: '', pay: '', state: '', ins: '' });

  const onPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingPhoto(true);
    try { const url = await uploadImage('player-photos', file); setForm((fm) => ({ ...fm, photoUrl: url })); }
    catch (err) { toast(err instanceof Error ? err.message : 'Erreur de téléversement', 'error'); }
    finally { setUploadingPhoto(false); }
  };

  const onDocsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploadingDoc(true);
    try {
      const urls = await Promise.all(files.map((file) => uploadImage('player-documents', file)));
      setForm((fm) => ({ ...fm, documentUrls: [...fm.documentUrls, ...urls] }));
    } catch (err) { toast(err instanceof Error ? err.message : 'Erreur de téléversement', 'error'); }
    finally { setUploadingDoc(false); }
  };

  const createParentInline = async () => {
    if (!pquick.firstName || !pquick.lastName) { toast('Prénom et nom du parent requis', 'error'); return; }
    const id = uid('par');
    await add('parents', { id, firstName: pquick.firstName, lastName: pquick.lastName, phone: pquick.phone, address: pquick.address, email: pquick.email, playerIds: [] });
    setForm((fm) => ({ ...fm, parentId: id }));
    setPquick({ open: false, firstName: '', lastName: '', phone: '', email: '', address: '' });
    toast('Parent créé et sélectionné', 'success');
  };

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
    if (f.ins && insuranceStatus(p).status !== f.ins) return false;
    return true;
  }), [data.players, f, L]);

  const expiredList = data.players.filter((p) => p.assignedSubscription && daysUntil(p.assignedSubscription.expiryDate) < 0);

  const resetPquick = () => setPquick({ open: false, firstName: '', lastName: '', phone: '', email: '', address: '' });
  const openCreate = () => { setEditId(null); setForm({ ...emptyPlayer, documentUrls: [], medDate: today() }); resetPquick(); setFormOpen(true); };
  const openEdit = (p: Player) => {
    setEditId(p.id); resetPquick();
    setForm({
      ...emptyPlayer,
      firstName: p.firstName, lastName: p.lastName, birthDate: p.birthDate, birthPlace: p.birthPlace,
      address: p.address, phone: p.phone, email: p.email, parentId: p.parentId || '',
      photoUrl: p.photoUrl, documentUrls: [...p.documentUrls],
    });
    setFormOpen(true);
  };

  // Keep the local parent.playerIds cache in sync when a player's parent changes
  // (the real relation is players.parent_id; playerIds is derived on next refetch).
  const relinkParent = (playerId: string, oldParentId: string | undefined, newParentId: string | undefined) => {
    if (oldParentId === newParentId) return;
    if (oldParentId) { const op = L.par[oldParentId]; if (op) updateItem('parents', oldParentId, { playerIds: op.playerIds.filter((x) => x !== playerId) }); }
    if (newParentId) { const np = L.par[newParentId]; if (np && !np.playerIds.includes(playerId)) updateItem('parents', newParentId, { playerIds: [...np.playerIds, playerId] }); }
  };

  const savePlayer = () => {
    if (!form.firstName || !form.lastName) { toast('Prénom et nom requis', 'error'); return; }
    const base = {
      firstName: form.firstName, lastName: form.lastName, birthDate: form.birthDate, birthPlace: form.birthPlace,
      address: form.address, phone: form.phone, email: form.email, parentId: form.parentId || undefined,
      photoUrl: form.photoUrl, documentUrls: form.documentUrls,
    };
    if (editId) {
      const prev = data.players.find((x) => x.id === editId);
      updateItem('players', editId, base);
      relinkParent(editId, prev?.parentId, form.parentId || undefined);
      toast('Joueur mis à jour', 'success');
    } else {
      const id = uid('pl');
      const medicalRecords: MedicalRecord[] = [
        { id: uid('med'), status: form.medStatus, description: form.medDescription, date: form.medDate || today() },
      ];
      add('players', { id, ...base, createdAt: today(), subscriptionCostPaid: false, payments: [], medicalRecords, attendanceRecords: [], evaluations: [], insurances: [] });
      relinkParent(id, undefined, form.parentId || undefined);
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Select value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder={t('players.filterCategory')} options={data.categories.map((c) => ({ value: c.id, label: c.name }))} />
          <Select value={f.group} onChange={(v) => setF({ ...f, group: v })} placeholder={t('players.filterGroup')} options={data.groups.map((c) => ({ value: c.id, label: c.name }))} />
          <Select value={f.sub} onChange={(v) => setF({ ...f, sub: v })} placeholder={t('players.filterSub')} options={data.subscriptions.map((c) => ({ value: c.id, label: c.name }))} />
          <Select value={f.pay} onChange={(v) => setF({ ...f, pay: v })} placeholder={t('players.filterPay')} options={[{ value: 'payed', label: t('common.paid') }, { value: 'debt', label: t('players.debt') }]} />
          <Select value={f.state} onChange={(v) => setF({ ...f, state: v })} placeholder={t('common.status')} options={[{ value: 'active', label: t('players.activeSubs') }, { value: 'expired', label: t('players.expiredSubs') }, { value: 'soon', label: t('players.soonExpiring') }]} />
          <Select value={f.ins} onChange={(v) => setF({ ...f, ins: v })} placeholder="Assurance" options={[
            { value: 'none', label: 'Sans assurance' }, { value: 'valid', label: 'Assurance valide' },
            { value: 'soon', label: 'Expire bientôt' }, { value: 'expired', label: 'Assurance expirée' },
          ]} />
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
        <div className="space-y-6">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-surface-2 border border-line/10 grid place-items-center shrink-0">
              {form.photoUrl ? <img src={form.photoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-faint" />}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-ghost cursor-pointer !py-2">
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploadingPhoto ? 'Envoi…' : 'Photo du joueur'}
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} disabled={uploadingPhoto} />
              </label>
              {form.photoUrl && <button type="button" onClick={() => setForm({ ...form, photoUrl: '' })} className="text-xs text-muted hover:text-danger text-left">Retirer la photo</button>}
            </div>
          </div>

          {/* Identity */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('common.firstName')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <Input label={t('common.lastName')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            <Input label={t('common.birthDate')} type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            <Input label={t('players.birthPlace')} value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
            <Input label={t('common.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="sm:col-span-2"><Input label={t('common.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>

          {/* Parent selection + inline creation */}
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select label={t('players.parentInfo')} value={form.parentId} onChange={(v) => setForm({ ...form, parentId: v })}
                  placeholder="Aucun parent"
                  options={data.parents.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}${p.phone ? ' · ' + p.phone : ''}` }))} />
              </div>
              <button type="button" onClick={() => setPquick((q) => ({ ...q, open: !q.open }))}
                className={cx('btn-ghost !px-3 shrink-0', pquick.open && 'border-accent/50 text-accent')} title="Créer un parent">
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
            <AnimatePresence>
              {pquick.open && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 rounded-2xl bg-surface-2 border border-line/10 p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent-soft flex items-center gap-2"><UserPlus className="h-4 w-4" />Nouveau parent</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input label={t('common.firstName')} value={pquick.firstName} onChange={(e) => setPquick({ ...pquick, firstName: e.target.value })} required />
                      <Input label={t('common.lastName')} value={pquick.lastName} onChange={(e) => setPquick({ ...pquick, lastName: e.target.value })} required />
                      <Input label={t('common.phone')} value={pquick.phone} onChange={(e) => setPquick({ ...pquick, phone: e.target.value })} />
                      <Input label={t('common.email')} type="email" value={pquick.email} onChange={(e) => setPquick({ ...pquick, email: e.target.value })} />
                      <div className="sm:col-span-2"><Input label={t('common.address')} value={pquick.address} onChange={(e) => setPquick({ ...pquick, address: e.target.value })} /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={resetPquick} className="btn-ghost !py-1.5">{t('common.cancel')}</button>
                      <button type="button" onClick={createParentInline} className="btn-primary !py-1.5"><Check className="h-4 w-4" />Créer & sélectionner</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Medical status (only when creating — history is managed from the detail view) */}
          {!editId && (
            <div className="rounded-2xl bg-surface-2 border border-line/10 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2"><HeartPulse className="h-4 w-4 text-accent" />État médical</p>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented value={form.medStatus ? 'ok' : 'ko'} onChange={(v) => setForm({ ...form, medStatus: v === 'ok' })}
                  options={[{ value: 'ok', label: '✓ Apte' }, { value: 'ko', label: '✗ Inapte' }]} />
                <span className={cx('h-3 w-3 rounded-full', form.medStatus ? 'bg-success' : 'bg-danger')} />
                <div className="flex-1 min-w-[140px]"><Input type="date" value={form.medDate} onChange={(e) => setForm({ ...form, medDate: e.target.value })} /></div>
              </div>
              <Textarea label="Description (optionnel)" value={form.medDescription} onChange={(e) => setForm({ ...form, medDescription: e.target.value })} placeholder="Antécédents, allergies, remarques…" />
            </div>
          )}

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0 flex items-center gap-2"><FileText className="h-4 w-4" />Documents scannés</label>
              <label className="btn-ghost cursor-pointer !py-1.5 !px-3 text-xs">
                {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingDoc ? 'Envoi…' : 'Ajouter'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={onDocsUpload} disabled={uploadingDoc} />
              </label>
            </div>
            {form.documentUrls.length === 0 ? (
              <p className="text-xs text-muted rounded-xl bg-surface-2 border border-line/10 px-3 py-4 text-center">Aucun document — scannez ou téléversez une image.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {form.documentUrls.map((url) => (
                  <div key={url} className="relative group rounded-xl overflow-hidden border border-line/10 aspect-[3/4] bg-surface-2">
                    <img src={url} alt="document" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setForm({ ...form, documentUrls: form.documentUrls.filter((u) => u !== url) })}
                      className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {detail && <DetailModal p={current(detail)} onClose={() => setDetail(null)} />}
      {assign && <AssignModal p={current(assign)} onClose={() => setAssign(null)} />}
      {payDebt && <PayDebtModal p={current(payDebt)} onClose={() => setPayDebt(null)} />}
      {cardPlayer && <CardPrintModal p={current(cardPlayer)} onClose={() => setCardPlayer(null)} />}
      {emailAsk && <EmailAskModal player={current(emailAsk)} onClose={() => setEmailAsk(null)} />}
      {evalP && <EvaluationModal p={current(evalP)} onClose={() => setEvalP(null)} />}

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
    const med = latestMedical(p);
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar name={L.playerName(p)} id={p.id} size={48} src={p.photoUrl || undefined} />
            {med && (
              <span title={med.status ? 'Apte' : 'Inapte'}
                className={cx('absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-surface', med.status ? 'bg-success' : 'bg-danger')}>
                <HeartPulse className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-fg truncate">{L.playerName(p)}</h3>
            <p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone || '—'}</p>
          </div>
          {p.subscriptionCostPaid ? (
            <Badge tone="success">{t('players.regPaid')}</Badge>
          ) : (
            <Badge tone="danger" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{t('players.regUnpaid')}</Badge>
          )}
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
          {canDo('players', 'evaluate') && <button onClick={() => setEvalP(p)} className="btn-icon" title="Évaluation"><ClipboardList className="h-4 w-4" /></button>}
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
    const med = latestMedical(p);
    const [medForm, setMedForm] = useState({ status: true, description: '', date: today() });
    const removeSub = () => { updateItem('players', p.id, { assignedSubscription: undefined }); toast('Abonnement retiré', 'info'); onClose(); };
    const addMedical = () => {
      const rec: MedicalRecord = { id: uid('med'), status: medForm.status, description: medForm.description, date: medForm.date || today() };
      updateItem('players', p.id, { medicalRecords: [rec, ...p.medicalRecords] });
      setMedForm({ status: true, description: '', date: today() });
      toast('État médical enregistré', 'success');
    };
    return (
      <Modal open onClose={onClose} size="lg" title={L.playerName(p)} subtitle={p.email}>
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'info', label: t('players.personalInfo'), icon: <User className="h-4 w-4" /> },
          { key: 'medical', label: 'Médical', icon: <HeartPulse className="h-4 w-4" /> },
          { key: 'presence', label: 'Présences', icon: <ClipboardCheck className="h-4 w-4" /> },
          { key: 'evals', label: 'Évaluations', icon: <ClipboardList className="h-4 w-4" /> },
          { key: 'docs', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
          { key: 'sub', label: t('players.subInfo'), icon: <Ticket className="h-4 w-4" /> },
          { key: 'pay', label: t('players.paymentHistory'), icon: <CircleDollarSign className="h-4 w-4" /> },
        ]} />
        <div className="mt-5">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={L.playerName(p)} id={p.id} size={64} src={p.photoUrl || undefined} />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-fg truncate">{L.playerName(p)}</p>
                  {med && (
                    <Badge tone={med.status ? 'success' : 'danger'} className="mt-1 inline-flex items-center gap-1">
                      <HeartPulse className="h-3 w-3" />{med.status ? 'Apte' : 'Inapte'}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info label={t('common.birthDate')} value={fmtDate(p.birthDate)} />
                <Info label={t('players.birthPlace')} value={p.birthPlace || '—'} />
                <Info label={t('common.phone')} value={p.phone || '—'} />
                <Info label={t('common.email')} value={p.email || '—'} />
                <div className="col-span-2"><Info label={t('common.address')} value={p.address || '—'} /></div>
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
          {tab === 'medical' && (
            <div className="space-y-4">
              {canDo('players', 'edit') && (
                <div className="rounded-2xl bg-surface-2 border border-line/10 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2"><Plus className="h-4 w-4 text-accent" />Nouvel état médical</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Segmented value={medForm.status ? 'ok' : 'ko'} onChange={(v) => setMedForm({ ...medForm, status: v === 'ok' })}
                      options={[{ value: 'ok', label: '✓ Apte' }, { value: 'ko', label: '✗ Inapte' }]} />
                    <div className="flex-1 min-w-[140px]"><Input type="date" value={medForm.date} onChange={(e) => setMedForm({ ...medForm, date: e.target.value })} /></div>
                  </div>
                  <Textarea label="Description" value={medForm.description} onChange={(e) => setMedForm({ ...medForm, description: e.target.value })} placeholder="Diagnostic, remarques…" />
                  <div className="flex justify-end"><button onClick={addMedical} className="btn-primary !py-1.5"><Check className="h-4 w-4" />Enregistrer</button></div>
                </div>
              )}
              {p.medicalRecords.length === 0 ? (
                <EmptyState title="Aucun historique médical" icon={<HeartPulse className="h-7 w-7" />} />
              ) : (
                <div className="space-y-2">
                  {[...p.medicalRecords].sort((x, y) => y.date.localeCompare(x.date)).map((m) => (
                    <div key={m.id} className="flex items-start gap-3 rounded-xl bg-surface-2 p-3">
                      <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', m.status ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
                        <HeartPulse className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone={m.status ? 'success' : 'danger'}>{m.status ? 'Apte' : 'Inapte'}</Badge>
                          <span className="text-xs text-muted">{fmtDate(m.date)}</span>
                        </div>
                        {m.description && <p className="text-sm text-fg mt-1.5">{m.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'presence' && (
            p.attendanceRecords.length === 0 ? (
              <EmptyState title="Aucun historique de présence" hint="Les présences sont enregistrées au scan de la carte ou depuis la page Présences." icon={<ClipboardCheck className="h-7 w-7" />} />
            ) : (
              <div className="space-y-2">
                {[...p.attendanceRecords].sort((x, y) => y.date.localeCompare(x.date)).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                    <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', a.status === 'present' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
                      {a.status === 'present' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg truncate">{L.timingName(a.timingId)}</p>
                      <p className="text-xs text-muted flex items-center gap-1.5"><Calendar className="h-3 w-3" />{fmtDate(a.date)}{a.scannedAt && <span className="flex items-center gap-1"><ScanLine className="h-3 w-3" />scan</span>}</p>
                    </div>
                    <Badge tone={a.status === 'present' ? 'success' : 'danger'}>{a.status === 'present' ? 'Présent' : 'Absent'}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'evals' && (
            p.evaluations.length === 0 ? (
              <EmptyState title="Aucune évaluation" hint="Utilisez le bouton « Évaluation » sur la carte du joueur." icon={<ClipboardList className="h-7 w-7" />} />
            ) : (
              <div className="space-y-3">
                {[...p.evaluations].sort((x, y) => y.date.localeCompare(x.date)).map((ev) => (
                  <div key={ev.id} className="rounded-xl bg-surface-2 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-fg flex items-center gap-2"><Clock className="h-4 w-4 text-accent" />{fmtDate(ev.date)}</p>
                      <Badge tone="accent">{Math.round((ev.speed + ev.ballControl + ev.dribbling + ev.passing + ev.fitness + ev.discipline) / 6)}/100</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {([['Vitesse', ev.speed], ['Contrôle', ev.ballControl], ['Dribble', ev.dribbling], ['Passes', ev.passing], ['Physique', ev.fitness], ['Discipline', ev.discipline]] as const).map(([label, v]) => (
                        <div key={label} className="rounded-lg bg-surface-3 p-2">
                          <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted">{label}</span><span className="font-bold text-fg">{v}</span></div>
                          <div className="h-1.5 rounded-full bg-line/20 overflow-hidden"><div className="h-full rounded-full bg-accent-grad" style={{ width: `${Math.min(100, Math.max(0, v))}%` }} /></div>
                        </div>
                      ))}
                    </div>
                    {ev.description && <p className="text-sm text-muted mt-3">{ev.description}</p>}
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'docs' && (
            p.documentUrls.length === 0 ? (
              <EmptyState title="Aucun document" hint="Ajoutez des documents en modifiant le joueur." icon={<FileText className="h-7 w-7" />} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {p.documentUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-line/10 aspect-[3/4] bg-surface-2 card-hover">
                    <img src={url} alt="document" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )
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
                  {p.subscriptionCostPaid ? (
                    <Badge tone="success">{t('players.regPaid')}</Badge>
                  ) : (
                    <Badge tone="danger" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{t('players.regUnpaid')}</Badge>
                  )}</div>
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
    const [searchQuery, setSearchQuery] = useState('');
    const ins = insuranceStatus(p);
    const [insOpen, setInsOpen] = useState(false);
    const [insForm, setInsForm] = useState({ typeId: '', price: 0, startDate: today(), endDate: addDays(today(), 365), description: '' });

    const saveInsurance = () => {
      if (!insForm.typeId) { toast('Sélectionnez un type d\'assurance', 'error'); return; }
      if (insForm.endDate < insForm.startDate) { toast('La date de fin doit suivre la date de début', 'error'); return; }
      const entry: PlayerInsurance = { id: uid('ins'), ...insForm };
      updateItem('players', p.id, { insurances: [entry, ...p.insurances] });
      setInsOpen(false);
      setInsForm({ typeId: '', price: 0, startDate: today(), endDate: addDays(today(), 365), description: '' });
      toast('Assurance enregistrée', 'success');
    };
    const sub = data.subscriptions.find((s) => s.id === subId);
    const regFeeAmount = data.club.regFeeAmount || 0;
    const alreadyPaidReg = p.subscriptionCostPaid;
    const [collectFee, setCollectFee] = useState(!alreadyPaidReg && regFeeAmount > 0);
    const feeToCollect = !alreadyPaidReg && collectFee ? regFeeAmount : 0;
    const subPrice = sub?.totalPrice || 0;
    const price = subPrice + feeToCollect;
    const [amountPaid, setAmountPaid] = useState<number>(price);
    const expiry = sub ? addDays(startDate, sub.periodDays) : '';
    const amountPaidClamped = Math.min(amountPaid, price);
    const rest = Math.max(0, price - amountPaidClamped);

    const onPick = (v: string) => {
      setSubId(v);
      const s = data.subscriptions.find((x) => x.id === v);
      const fee = !alreadyPaidReg && collectFee ? regFeeAmount : 0;
      setAmountPaid((s?.totalPrice || 0) + fee);
    };

    const save = () => {
      if (!sub) { toast('Sélectionnez un abonnement', 'error'); return; }
      const feeSettledNow = !alreadyPaidReg && collectFee && (feeToCollect === 0 || amountPaidClamped >= feeToCollect);
      const feeAmountPaid = feeSettledNow ? feeToCollect : 0;
      const subAmountPaid = amountPaidClamped - feeAmountPaid;
      const subRest = Math.max(0, subPrice - subAmountPaid);
      const a: AssignedSubscription = { subscriptionId: sub.id, timingId: sub.timingId, startDate, expiryDate: expiry, price: subPrice, amountPaid: subAmountPaid, rest: subRest, status: subRest > 0 ? 'debt' : 'payed' };
      const payments: Payment[] = [
        { id: uid('pay'), date: today(), amount: subAmountPaid, note: `Abonnement ${sub.name}${subRest > 0 ? ' (acompte)' : ''}`, kind: 'subscription' },
        ...(feeSettledNow ? [{ id: uid('pay'), date: today(), amount: feeToCollect, note: 'Frais d\'inscription', kind: 'fee' as const }] : []),
      ];
      updateItem('players', p.id, { assignedSubscription: a, subscriptionCostPaid: alreadyPaidReg || feeSettledNow, payments: [...payments, ...p.payments] });
      toast(subRest > 0 ? 'Abonnement assigné (créance)' : 'Abonnement assigné (payé)', 'success');
      onClose();
      setEmailAsk(p);
    };

    const filteredSubs = data.subscriptions.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Modal open onClose={onClose} size="lg" title={t('players.assignSub')} subtitle={L.playerName(p)}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="label">Rechercher & Sélectionner un abonnement</label>
            <input
              type="text"
              className="input"
              placeholder="Tapez pour rechercher un abonnement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <div className="grid sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar mt-3">
              {filteredSubs.map((s) => {
                const isSelected = s.id === subId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPick(s.id)}
                    className={cx(
                      "text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-[110px]",
                      isSelected
                        ? "bg-accent/10 border-accent text-fg shadow-glow"
                        : "bg-surface-2 hover:bg-surface-3 border-line/10 hover:border-accent/40 text-fg"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-accent text-black flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm leading-tight group-hover:text-accent transition-colors pr-6">{s.name}</p>
                      <p className="text-[11px] text-muted mt-1">{s.periodDays} jours</p>
                    </div>
                    <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-line/5">
                      <span className="text-[10px] text-faint uppercase font-bold tracking-wider">Tarif</span>
                      <span className="font-display font-extrabold text-accent">{money(s.totalPrice)}</span>
                    </div>
                  </button>
                );
              })}
              {filteredSubs.length === 0 && (
                <p className="text-sm text-muted py-6 text-center col-span-2">Aucun abonnement trouvé</p>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {sub && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="grid md:grid-cols-5 gap-6 pt-5 border-t border-line/10"
              >
                {/* Inputs area */}
                <div className="md:col-span-3 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-accent-soft flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Paramètres & Frais
                  </h4>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label={t('common.startDate')}
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <div>
                      <label className="label">{t('players.expiry')}</label>
                      <div className="input bg-surface-3 flex items-center gap-2 font-medium">
                        <Calendar className="h-4 w-4 text-accent" />
                        {fmtDate(expiry)}
                      </div>
                    </div>
                  </div>

                  {alreadyPaidReg ? (
                    <div className="rounded-2xl bg-success/10 border border-success/20 px-4 py-3.5 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-success/25 flex items-center justify-center text-success">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-fg">{t('players.regPaid')}</p>
                        <p className="text-xs text-muted">Frais d'inscription réglés</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-surface-2 border border-line/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0 mt-0.5">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-fg">{t('players.regUnpaid')}</p>
                          <p className="text-xs text-muted mb-3">Frais d'inscription de {money(regFeeAmount)} restants</p>
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={collectFee}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCollectFee(checked);
                                const newFee = checked ? regFeeAmount : 0;
                                setAmountPaid(subPrice + newFee);
                              }}
                              className="h-5 w-5 accent-[rgb(var(--accent))] rounded border-line/20"
                            />
                            <span className="text-xs text-fg font-semibold">{t('players.collectFeeNow')}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Montant versé par le joueur"
                    type="number"
                    value={amountPaid}
                    max={price}
                    min={0}
                    onChange={(e) => {
                      const val = +e.target.value;
                      setAmountPaid(Math.min(price, Math.max(0, val)));
                    }}
                  />
                </div>

                {/* Summary Panel */}
                <div className="md:col-span-2 bg-surface-2 rounded-2xl border border-line/10 p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">Résumé financier</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Abonnement</span>
                        <span className="font-semibold text-fg">{money(subPrice)}</span>
                      </div>
                      {!alreadyPaidReg && collectFee && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Frais d'inscr.</span>
                          <span className="font-semibold text-fg">+{money(regFeeAmount)}</span>
                        </div>
                      )}
                      <div className="h-px bg-line/10 my-2" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-fg">Total à régler</span>
                        <span className="text-xl font-display font-extrabold text-accent">{money(price)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-line/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted uppercase">Solde restant</span>
                      <span className={cx(
                        "text-lg font-display font-extrabold",
                        rest > 0 ? "text-danger" : "text-success"
                      )}>
                        {money(rest)}
                      </span>
                    </div>

                    <div className={cx(
                      "rounded-xl border px-3.5 py-2.5 text-xs text-center font-medium transition-all duration-300",
                      rest > 0
                        ? "bg-warning/10 border-warning/20 text-warning"
                        : "bg-success/10 border-success/20 text-success"
                    )}>
                      {rest > 0
                        ? `Acompte payé — reste ${money(rest)}`
                        : "Intégralement payé ✓"}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---- Assurance ---- */}
          <div className="pt-5 border-t border-line/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-accent-soft flex items-center gap-2">
                <Shield className="h-4 w-4" /> Assurance
              </h4>
              <button type="button" onClick={() => setInsOpen((o) => !o)}
                className={cx('btn-ghost !py-1.5 !px-3 text-xs', insOpen && 'border-accent/50 text-accent')}>
                <Plus className="h-3.5 w-3.5" />Nouvelle assurance
              </button>
            </div>

            {ins.status === 'valid' && ins.current ? (
              <div className="rounded-2xl bg-success/10 border border-success/20 px-4 py-3 flex items-center gap-3">
                <Check className="h-5 w-5 text-success shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg">Assurance valide — {data.insuranceTypes.find((it) => it.id === ins.current!.typeId)?.name || 'Assurance'}</p>
                  <p className="text-xs text-muted">Jusqu'au {fmtDate(ins.current.endDate)} ({ins.days} jours restants) · {money(ins.current.price)}</p>
                </div>
              </div>
            ) : ins.status === 'soon' && ins.current ? (
              <div className="rounded-2xl bg-warning/10 border border-warning/20 px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg">Assurance expire bientôt</p>
                  <p className="text-xs text-muted">Fin le {fmtDate(ins.current.endDate)} — dans {ins.days} jours. Pensez à la renouveler.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-danger/10 border border-danger/20 px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg">{ins.status === 'expired' ? 'Assurance expirée' : 'Aucune assurance'}</p>
                  <p className="text-xs text-muted">
                    {ins.status === 'expired' && ins.current
                      ? `Expirée depuis le ${fmtDate(ins.current.endDate)} — ajoutez une nouvelle assurance.`
                      : 'Ce joueur n\'a aucune assurance enregistrée.'}
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence>
              {insOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="rounded-2xl bg-surface-2 border border-line/10 p-4 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CreatableSelect label="Type d'assurance" value={insForm.typeId} onChange={(v) => setInsForm({ ...insForm, typeId: v })}
                        options={data.insuranceTypes.map((it) => ({ value: it.id, label: it.name }))}
                        onCreate={(name) => { const id = uid('instype'); add('insuranceTypes', { id, name }); return id; }}
                        createLabel="Nouveau type" placeholder="Sélectionner…" />
                      <Input label={t('common.price')} type="number" value={insForm.price || ''} onChange={(e) => setInsForm({ ...insForm, price: +e.target.value })} />
                      <Input label={t('common.startDate')} type="date" value={insForm.startDate} onChange={(e) => setInsForm({ ...insForm, startDate: e.target.value })} />
                      <Input label="Date de fin" type="date" value={insForm.endDate} onChange={(e) => setInsForm({ ...insForm, endDate: e.target.value })} />
                    </div>
                    <Textarea label={`${t('common.description')} (optionnel)`} value={insForm.description} onChange={(e) => setInsForm({ ...insForm, description: e.target.value })} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setInsOpen(false)} className="btn-ghost !py-1.5">{t('common.cancel')}</button>
                      <button type="button" onClick={saveInsurance} className="btn-primary !py-1.5"><Check className="h-4 w-4" />Enregistrer l'assurance</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {p.insurances.length > 0 && (
              <div className="space-y-1.5">
                {[...p.insurances].sort((a, b) => b.endDate.localeCompare(a.endDate)).map((i2) => (
                  <div key={i2.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-xs">
                    <span className="text-fg font-medium truncate">{data.insuranceTypes.find((it) => it.id === i2.typeId)?.name || 'Assurance'}</span>
                    <span className="text-muted">{fmtDate(i2.startDate)} → {fmtDate(i2.endDate)}</span>
                    <span className="font-semibold text-fg">{money(i2.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  function EvaluationModal({ p, onClose }: { p: Player; onClose: () => void }) {
    const [form, setForm] = useState({ date: today(), speed: 50, ballControl: 50, dribbling: 50, passing: 50, fitness: 50, discipline: 50, description: '' });
    const metrics = [
      ['speed', 'Vitesse'], ['ballControl', 'Contrôle de balle'], ['dribbling', 'Dribble'],
      ['passing', 'Passes'], ['fitness', 'Condition physique'], ['discipline', 'Discipline'],
    ] as const;
    const save = () => {
      const ev: PlayerEvaluation = { id: uid('ev'), ...form };
      updateItem('players', p.id, { evaluations: [ev, ...p.evaluations] });
      toast('Évaluation enregistrée', 'success');
      onClose();
    };
    return (
      <Modal open onClose={onClose} size="lg" title="Nouvelle évaluation" subtitle={L.playerName(p)}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary"><Check className="h-4 w-4" />{t('common.save')}</button></>}>
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {metrics.map(([key, label]) => (
              <div key={key} className="rounded-xl bg-surface-2 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-fg">{label}</span>
                  <span className="font-display font-extrabold text-accent">{form[key]}</span>
                </div>
                <input type="range" min={0} max={100} step={1} value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: +e.target.value })}
                  className="w-full accent-[rgb(var(--accent))]" />
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('common.date')} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">Moyenne</span>
              <span className="font-display text-xl font-extrabold text-accent">
                {Math.round((form.speed + form.ballControl + form.dribbling + form.passing + form.fitness + form.discipline) / 6)}/100
              </span>
            </div>
          </div>
          <Textarea label={`${t('common.description')} (optionnel)`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Remarques, axes de progression…" />
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
    const [photo, setPhoto] = useState<string>(p.photoUrl || '');
    // A locally-picked photo is a blob: object URL — revoke it on change/unmount to
    // avoid leaking memory. The player's saved photoUrl (http) is left untouched.
    useEffect(() => () => { if (photo.startsWith('blob:')) URL.revokeObjectURL(photo); }, [photo]);
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
      if (photo.startsWith('blob:')) URL.revokeObjectURL(photo);
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
          <div className="print-card w-[340px] rounded-2xl overflow-hidden bg-white text-black shadow-2xl" style={{ border: '1px solid #eee', backgroundImage: BALL_PATTERN_BG }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundImage: `linear-gradient(135deg, ${CARD_ACCENT_STRONG} 0%, ${CARD_ACCENT} 55%, ${CARD_ACCENT_SOFT} 100%)` }}>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 overflow-hidden shrink-0">
                {data.club.logo ? <img src={data.club.logo} alt="" className="h-full w-full object-cover" /> : <Trophy className="h-5 w-5 text-white" />}
              </div>
              <div className="min-w-0">
                <p className="font-display font-extrabold text-white leading-tight truncate">{data.club.name}</p>
                <p className="text-[10px] text-white/80 mt-0.5 truncate">{data.club.address}</p>
              </div>
            </div>
            <div className="p-5 flex gap-4">
              <div className="h-24 w-24 rounded-xl overflow-hidden bg-gray-100 grid place-items-center shrink-0" style={{ border: `2px solid ${CARD_ACCENT}` }}>
                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg font-extrabold leading-tight">{L.playerName(p)}</p>
                <p className="text-xs text-gray-500 mt-1">{fmtDate(p.birthDate)} · {p.birthPlace}</p>
                <p className="text-xs text-gray-500 mt-1.5">Tel: {p.phone}</p>
                {p.assignedSubscription && <p className="text-[11px] font-semibold mt-1.5" style={{ color: CARD_ACCENT_STRONG }}>{L.catName(L.tm[p.assignedSubscription.timingId]?.categoryId)} · {L.grpName(L.tm[p.assignedSubscription.timingId]?.groupId)}</p>}
              </div>
            </div>
            <div className="mx-5 h-px" style={{ backgroundImage: `linear-gradient(90deg, transparent, ${CARD_ACCENT}55, transparent)` }} />
            <div className="px-5 py-5 flex justify-center">
              {type === 'qr'
                ? <QRCodeSVG value={`OFC-${p.id}`} size={120} fgColor="#111111" level="M" />
                : <Barcode value={p.id.slice(-10).toUpperCase()} height={56} width={1.6} fontSize={12} background="#ffffff" />}
            </div>
            <div className="text-center text-[10px] text-gray-400 pb-3 tracking-wide">ID: {p.id.toUpperCase()}</div>
          </div>
        </div>
      </Modal>
    );
  }

  function EmailAskModal({ player, onClose }: { player: Player; onClose: () => void }) {
    const parent = player.parentId ? L.par[player.parentId] : undefined;
    const [channel, setChannel] = useState<'email' | 'sms'>('email');
    const [sending, setSending] = useState(false);
    const [printing, setPrinting] = useState(false);
    const playerPhone = normalizePhoneE164(player.phone);
    const parentPhone = parent?.phone ? normalizePhoneE164(parent.phone) : null;
    const printInvoice = async () => {
      setPrinting(true);
      try {
        const inv = await buildSubscriptionInvoicePdf(data.club, player, parent, L);
        // Print-ready view: the browser's PDF viewer opens in a new tab with its print action.
        window.open(inv.blobUrl, '_blank');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Erreur de génération de la facture', 'error');
      } finally {
        setPrinting(false);
      }
    };
    const send = async () => {
      const a = player.assignedSubscription;
      setSending(true);
      try {
        if (channel === 'email') {
          const recipients = [
            player.email ? { email: player.email, name: `${player.firstName} ${player.lastName}` } : null,
            parent?.email ? { email: parent.email, name: `${parent.firstName} ${parent.lastName}` } : null,
          ].filter((r): r is { email: string; name: string } => !!r);
          if (recipients.length === 0) return;
          const html = `<p>Bonjour,</p><p>Confirmation d'abonnement pour ${player.firstName} ${player.lastName}${a ? ` : ${L.timingName(a.timingId)} — ${money(a.price)} (exp. ${fmtDate(a.expiryDate)})` : ''}.</p><p>Vous trouverez la fiche complète en pièce jointe.</p>`;
          const pdf = await buildPlayerSubscriptionPdf(data.club, player, parent, L);
          await sendClubEmail(data.club, recipients, t('players.sendMail'), html, [{ name: pdf.filename, content: pdf.base64 }]);
          toast('E-mail envoyé', 'success');
        } else {
          const phones = [...new Set([playerPhone, parentPhone].filter((p): p is string => !!p))];
          if (phones.length === 0) return;
          const pdf = await buildPlayerSubscriptionPdf(data.club, player, parent, L);
          const link = await uploadPdfForSms(pdf.base64);
          const text = `Confirmation d'abonnement pour ${player.firstName} ${player.lastName}${a ? ` : ${L.timingName(a.timingId)} — ${money(a.price)} (exp. ${fmtDate(a.expiryDate)})` : ''}. Fiche complète : ${link}`;
          let ok = 0, fail = 0;
          for (const phone of phones) {
            try { await sendClubSms(phone, text); ok++; } catch { fail++; }
          }
          toast(fail === 0 ? `${ok} SMS envoyé(s)` : `${ok} envoyé(s), ${fail} échoué(s)`, fail === 0 ? 'success' : 'error');
        }
        onClose();
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Échec de l\'envoi', 'error');
      } finally {
        setSending(false);
      }
    };
    const canSend = channel === 'email' ? !!(player.email || parent?.email) : !!(playerPhone || parentPhone);
    return (
      <Modal open onClose={onClose} size="md" title="Abonnement assigné ✓" subtitle={L.playerName(player)}>
        <div className="space-y-5 py-1">
          {/* Invoice printing */}
          <div className="rounded-2xl bg-surface-2 border border-line/10 p-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent mb-3"><Printer className="h-6 w-6" /></div>
            <p className="text-fg font-semibold">Souhaitez-vous imprimer la facture ?</p>
            <p className="text-xs text-muted mt-1">Facture officielle avec numéro, code-barres et cachet du club.</p>
            <button onClick={printInvoice} className="btn-primary mt-4 w-full" disabled={printing}>
              <Printer className="h-4 w-4" />{printing ? 'Génération…' : 'Imprimer la facture'}
            </button>
          </div>

          {/* Email / SMS confirmation */}
          <div className="rounded-2xl bg-surface-2 border border-line/10 p-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent mb-3">
              {channel === 'email' ? <Mail className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </div>
            <p className="text-fg font-semibold">Envoyer la confirmation ?</p>
            <div className="mt-3 flex justify-center">
              <Segmented value={channel} onChange={setChannel} options={[{ value: 'email', label: 'E-mail' }, { value: 'sms', label: 'SMS' }]} />
            </div>
            <div className="mt-3 space-y-1 text-sm">
              {channel === 'email' ? (
                <>
                  {player.email && <p className="text-fg">{player.email} <span className="text-muted">(joueur)</span></p>}
                  {parent?.email && <p className="text-fg">{parent.email} <span className="text-muted">(parent)</span></p>}
                  {!player.email && !parent?.email && <p className="text-muted">Aucune adresse e-mail disponible</p>}
                </>
              ) : (
                <>
                  {playerPhone && <p className="text-fg">{playerPhone} <span className="text-muted">(joueur)</span></p>}
                  {parentPhone && <p className="text-fg">{parentPhone} <span className="text-muted">(parent)</span></p>}
                  {!playerPhone && !parentPhone && <p className="text-muted">Aucun numéro de téléphone valide disponible</p>}
                </>
              )}
            </div>
            <button onClick={send} className="btn-primary mt-4 w-full" disabled={sending || !canSend}>
              <Check className="h-4 w-4" />{sending ? '…' : t('common.send')}
            </button>
          </div>

          <button onClick={onClose} className="btn-ghost w-full"><X className="h-4 w-4" />{t('common.close')}</button>
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

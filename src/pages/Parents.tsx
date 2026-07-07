import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserSquare2, Plus, Eye, Pencil, Trash2, Mail, MessageSquare, Phone, MapPin, Search, X, Users, Check, HeartPulse } from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, SearchInput, Avatar } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Input, Textarea, Segmented } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { money, uid, fmtDate } from '../lib/utils';
import { sendClubEmail } from '../lib/email';
import { sendClubSms, normalizePhoneE164 } from '../lib/sms';
import { uploadPdfForSms } from '../lib/storage';
import { buildPlayerSubscriptionPdf } from '../lib/pdf';
import type { Parent } from '../lib/types';

const empty = { firstName: '', lastName: '', phone: '', address: '', email: '', playerIds: [] as string[] };

export default function Parents() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Parent | null>(null);
  const [emailP, setEmailP] = useState<Parent | null>(null);
  const [search, setSearch] = useState('');
  const [kidSearch, setKidSearch] = useState('');

  const openCreate = () => { setEditId(null); setForm(empty); setKidSearch(''); setOpen(true); };
  const openEdit = (p: Parent) => { setEditId(p.id); setForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone, address: p.address, email: p.email, playerIds: [...p.playerIds] }); setOpen(true); };

  const save = async () => {
    if (!form.firstName || !form.lastName) { toast('Prénom et nom requis', 'error'); return; }
    let pid = editId;
    // Close the modal first, then persist. For a brand-new parent we must await the
    // INSERT before linking any players: players.parent_id has a FK to parents(id),
    // so firing the player UPDATE before the parent row commits triggers a 409
    // "players_parent_id_fkey" violation.
    setOpen(false);
    if (editId) { updateItem('parents', editId, { ...form }); toast('Parent mis à jour', 'success'); }
    else { pid = uid('par'); await add('parents', { id: pid, ...form }); toast('Parent créé', 'success'); }
    data.players.forEach((pl) => {
      const shouldLink = form.playerIds.includes(pl.id);
      if (shouldLink && pl.parentId !== pid) updateItem('players', pl.id, { parentId: pid! });
      if (!shouldLink && pl.parentId === pid) updateItem('players', pl.id, { parentId: undefined });
    });
  };

  const toggleKid = (id: string) => setForm((f) => ({ ...f, playerIds: f.playerIds.includes(id) ? f.playerIds.filter((x) => x !== id) : [...f.playerIds, id] }));
  const availableKids = data.players.filter((p) => `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(kidSearch.toLowerCase()));

  const filtered = data.parents.filter((p) => `${p.firstName} ${p.lastName} ${p.phone} ${p.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('parents.title')} subtitle={`${data.parents.length} parents`} icon={<UserSquare2 className="h-5 w-5" />}
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('parents.newParent')}</button>} />

      <div className="card p-4 mb-5"><SearchInput value={search} onChange={setSearch} placeholder={t('common.search')} /></div>

      {filtered.length === 0 ? <EmptyState title="Aucun parent" icon={<UserSquare2 className="h-7 w-7" />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card card-hover p-5">
              <div className="flex items-center gap-3">
                <Avatar name={`${p.firstName} ${p.lastName}`} id={p.id} size={46} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-fg truncate">{p.firstName} {p.lastName}</h3>
                  <p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</p>
                </div>
                <Badge tone="info">{p.playerIds.length} {t('parents.kids').toLowerCase()}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted">
                <p className="flex items-center gap-2 truncate"><Mail className="h-4 w-4 shrink-0" />{p.email || '—'}</p>
                <p className="flex items-center gap-2 truncate"><MapPin className="h-4 w-4 shrink-0" />{p.address || '—'}</p>
              </div>
              <div className="flex gap-1.5 mt-4 pt-4 border-t border-line/10">
                {canDo('parents', 'view') && <button onClick={() => setDetail(p)} className="btn-ghost flex-1 !py-2"><Eye className="h-4 w-4" />{t('common.view')}</button>}
                {canDo('parents', 'email') && <button onClick={() => setEmailP(p)} className="btn-icon" title={t('parents.sendReport')}><Mail className="h-4 w-4" /></button>}
                {canDo('parents', 'edit') && <button onClick={() => openEdit(p)} className="btn-icon"><Pencil className="h-4 w-4" /></button>}
                {canDo('parents', 'delete') && <button onClick={() => confirm.ask(() => { remove('parents', p.id); toast('Supprimé', 'info'); }, `Supprimer ${p.firstName} ?`)} className="btn-icon hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editId ? 'Modifier parent' : t('parents.newParent')}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('common.firstName')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <Input label={t('common.lastName')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <Input label={t('common.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="sm:col-span-2"><Input label={t('common.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <div className="mt-5">
          <label className="label">{t('parents.kids')} ({form.playerIds.length})</label>
          {form.playerIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {form.playerIds.map((id) => { const pl = L.pl[id]; if (!pl) return null; return (
                <span key={id} className="chip bg-accent/15 text-accent border-accent/20">{pl.firstName} {pl.lastName}<button onClick={() => toggleKid(id)}><X className="h-3.5 w-3.5" /></button></span>
              ); })}
            </div>
          )}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
            <input className="input !pl-10" placeholder={t('parents.searchKids')} value={kidSearch} onChange={(e) => setKidSearch(e.target.value)} />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl bg-surface-2 border border-line/10 p-1.5 space-y-1">
            {availableKids.map((pl) => {
              const sel = form.playerIds.includes(pl.id);
              return (
                <button key={pl.id} onClick={() => toggleKid(pl.id)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${sel ? 'bg-accent/15' : 'hover:bg-surface-3'}`}>
                  <Avatar name={`${pl.firstName} ${pl.lastName}`} id={pl.id} size={30} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-fg">{pl.firstName} {pl.lastName}</p><p className="text-xs text-muted">{pl.phone}</p></div>
                  {sel && <Check className="h-4 w-4 text-accent" />}
                </button>
              );
            })}
            {availableKids.length === 0 && <p className="text-sm text-muted px-3 py-2">Aucun joueur</p>}
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} size="lg" title={detail ? `${detail.firstName} ${detail.lastName}` : ''} subtitle={detail?.email}>
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-muted">{t('common.phone')}</p><p className="font-semibold text-fg">{detail.phone}</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-muted">{t('common.address')}</p><p className="font-semibold text-fg">{detail.address}</p></div>
            </div>
            <div>
              <p className="label flex items-center gap-2"><Users className="h-4 w-4" />{t('parents.kids')}</p>
              <div className="space-y-2">
                {detail.playerIds.map((id) => { const pl = L.pl[id]; if (!pl) return null; const a = pl.assignedSubscription; return (
                  <div key={id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                    <Avatar name={`${pl.firstName} ${pl.lastName}`} id={pl.id} size={38} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg">{pl.firstName} {pl.lastName}</p>
                      <p className="text-xs text-muted">{a ? `${L.timingName(a.timingId)} · exp. ${fmtDate(a.expiryDate)}` : t('players.noSub')}</p>
                    </div>
                    {a && <Badge tone={a.status === 'payed' ? 'success' : 'warning'}>{a.rest > 0 ? `${t('common.rest')} ${money(a.rest)}` : t('common.paid')}</Badge>}
                  </div>
                ); })}
                {detail.playerIds.length === 0 && <p className="text-sm text-muted">Aucun enfant lié</p>}
              </div>
            </div>

            {/* Read-only medical history of each child (set by doctor/admin/worker) */}
            {detail.playerIds.some((id) => (L.pl[id]?.medicalRecords.length || 0) > 0) && (
              <div>
                <p className="label flex items-center gap-2"><HeartPulse className="h-4 w-4" />Historique médical</p>
                <div className="space-y-3">
                  {detail.playerIds.map((id) => {
                    const pl = L.pl[id];
                    if (!pl || pl.medicalRecords.length === 0) return null;
                    return (
                      <div key={id} className="rounded-xl bg-surface-2 p-3">
                        <p className="text-sm font-semibold text-fg mb-2">{pl.firstName} {pl.lastName}</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {[...pl.medicalRecords].sort((x, y) => y.date.localeCompare(x.date)).map((m) => (
                            <div key={m.id} className="flex items-start gap-2.5 rounded-lg bg-surface-3 p-2.5">
                              <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.status ? 'bg-success' : 'bg-danger'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold ${m.status ? 'text-success' : 'text-danger'}`}>{m.status ? 'Apte' : 'Inapte'}</span>
                                  <span className="text-xs text-muted">{fmtDate(m.date)}</span>
                                </div>
                                {m.description && <p className="text-xs text-fg mt-0.5">{m.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {emailP && <EmailModal parent={emailP} onClose={() => setEmailP(null)} />}
      {confirm.node}
    </div>
  );

  function EmailModal({ parent, onClose }: { parent: Parent; onClose: () => void }) {
    const [channel, setChannel] = useState<'email' | 'sms'>('email');
    const [mode, setMode] = useState<'report' | 'message'>('report');
    const [lastOnly, setLastOnly] = useState(false);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [excludedSms, setExcludedSms] = useState<Set<string>>(new Set());
    const parentPhone = normalizePhoneE164(parent.phone);

    const rows = parent.playerIds
      .map((id) => L.pl[id])
      .filter((pl): pl is NonNullable<typeof pl> => !!pl?.assignedSubscription)
      .slice(0, lastOnly ? 1 : undefined);
    const candidatePlayers = mode === 'report' ? rows : parent.playerIds.map((id) => L.pl[id]).filter((pl): pl is NonNullable<typeof pl> => !!pl);
    const smsTargets = [
      ...(parentPhone ? [{ id: 'parent', label: `${parent.firstName} ${parent.lastName}`, sub: 'parent', phone: parentPhone }] : []),
      ...candidatePlayers
        .map((pl) => { const ph = normalizePhoneE164(pl.phone); return ph ? { id: pl.id, label: `${pl.firstName} ${pl.lastName}`, sub: 'joueur', phone: ph } : null; })
        .filter((x): x is { id: string; label: string; sub: string; phone: string } => !!x),
    ];
    const selectedSmsTargets = smsTargets.filter((tgt) => !excludedSms.has(tgt.id));
    const toggleSmsTarget = (id: string) => setExcludedSms((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    const send = async () => {
      if (channel === 'email' && !parent.email) { toast('Ce parent n\'a pas d\'e-mail', 'error'); return; }
      if (channel === 'sms' && selectedSmsTargets.length === 0) { toast('Sélectionnez au moins un destinataire', 'error'); return; }
      setSending(true);
      try {
        if (channel === 'email') {
          const html = mode === 'report'
            ? `<p>Bonjour ${parent.firstName},</p><p>Voici le rapport d'abonnement :</p><ul>${rows.map((pl) => `<li>${pl.firstName} — ${L.timingName(pl.assignedSubscription!.timingId)} — ${money(pl.assignedSubscription!.price)} (exp. ${fmtDate(pl.assignedSubscription!.expiryDate)})</li>`).join('')}</ul><p>Vous trouverez la ou les fiches complètes en pièce jointe.</p>`
            : `<p>Bonjour ${parent.firstName},</p><p>${message.replace(/\n/g, '<br/>')}</p>`;
          const attachments = mode === 'report'
            ? (await Promise.all(rows.map((pl) => buildPlayerSubscriptionPdf(data.club, pl, parent, L)))).map((pdf) => ({ name: pdf.filename, content: pdf.base64 }))
            : undefined;
          await sendClubEmail(data.club, [{ email: parent.email, name: `${parent.firstName} ${parent.lastName}` }], mode === 'report' ? t('parents.sendReport') : t('parents.specialMessage'), html, attachments);
          toast(`${mode === 'report' ? 'Rapport' : 'Message'} envoyé à ${parent.email}`, 'success');
        } else {
          let text: string;
          if (mode === 'report') {
            const pdfs = await Promise.all(rows.map((pl) => buildPlayerSubscriptionPdf(data.club, pl, parent, L)));
            const links = await Promise.all(pdfs.map((pdf) => uploadPdfForSms(pdf.base64)));
            text = `Bonjour, voici le rapport d'abonnement :\n` +
              rows.map((pl, i) => `${pl.firstName} — ${L.timingName(pl.assignedSubscription!.timingId)} — ${money(pl.assignedSubscription!.price)} : ${links[i]}`).join('\n');
          } else {
            text = `Bonjour, ${message}`;
          }
          const phones = [...new Set(selectedSmsTargets.map((tgt) => tgt.phone))];
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
    return (
      <Modal open onClose={onClose} size="md" title={t('parents.sendReport')} subtitle={`${parent.firstName} ${parent.lastName}`}
        footer={<><button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button><button onClick={send} className="btn-primary" disabled={sending || (channel === 'email' ? !parent.email : selectedSmsTargets.length === 0)}>{channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}{sending ? '…' : t('common.send')}</button></>}>
        <div className="space-y-4">
          <Segmented value={channel} onChange={setChannel} options={[{ value: 'email', label: 'E-mail' }, { value: 'sms', label: 'SMS' }]} />
          <Segmented value={mode} onChange={setMode} options={[{ value: 'report', label: t('parents.sendReport') }, { value: 'message', label: t('parents.specialMessage') }]} />
          {mode === 'report' ? (
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3.5 cursor-pointer">
                <input type="checkbox" checked={lastOnly} onChange={(e) => setLastOnly(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent))]" />
                <span className="text-sm font-medium text-fg">{t('parents.lastSubOnly')}</span>
              </label>
              <div className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
                <p className="font-semibold text-fg mb-2">Aperçu du rapport</p>
                {parent.playerIds.map((id) => { const pl = L.pl[id]; if (!pl?.assignedSubscription) return null; return (
                  <p key={id}>• {pl.firstName} — {L.timingName(pl.assignedSubscription.timingId)} — {money(pl.assignedSubscription.price)} ({fmtDate(pl.assignedSubscription.expiryDate)})</p>
                ); })}
              </div>
            </div>
          ) : (
            <Textarea label={t('parents.specialMessage')} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Votre message…" />
          )}
          {channel === 'email' ? (
            <p className="text-xs text-faint">Envoyé depuis {data.club.email || '—'}</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted">Destinataires SMS</p>
              {smsTargets.length === 0 && <p className="text-xs text-faint">Aucun numéro de téléphone valide disponible</p>}
              {smsTargets.map((tgt) => (
                <label key={tgt.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5 cursor-pointer">
                  <input type="checkbox" checked={!excludedSms.has(tgt.id)} onChange={() => toggleSmsTarget(tgt.id)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                  <span className="text-sm text-fg">{tgt.phone} <span className="text-muted">({tgt.label} · {tgt.sub})</span></span>
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>
    );
  }
}

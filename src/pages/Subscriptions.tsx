import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Ticket, Plus, Eye, Pencil, Trash2, Clock, CalendarDays, Hash, Users } from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, SearchInput } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { SearchSelect, Input } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { money, uid } from '../lib/utils';
import type { Subscription } from '../lib/types';

const empty = { timingId: '', periodDays: 30, totalSeances: 8, pricePerSeance: 500, totalPrice: 4000 };

export default function Subscriptions() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState<Subscription | null>(null);
  const [search, setSearch] = useState('');

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Subscription) => {
    setEditId(s.id);
    setForm({ timingId: s.timingId, periodDays: s.periodDays, totalSeances: s.totalSeances, pricePerSeance: s.pricePerSeance, totalPrice: s.totalPrice });
    setOpen(true);
  };

  const save = () => {
    if (!form.timingId) { toast('Sélectionnez un créneau', 'error'); return; }
    const name = L.timingName(form.timingId);
    if (editId) { updateItem('subscriptions', editId, { ...form, name }); toast('Abonnement mis à jour', 'success'); }
    else { add('subscriptions', { id: uid('sub'), name, ...form }); toast('Abonnement créé', 'success'); }
    setOpen(false);
  };

  const filtered = data.subscriptions.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('subs.title')} subtitle={`${data.subscriptions.length} abonnements`} icon={<Ticket className="h-5 w-5" />}
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('subs.newSub')}</button>} />

      <div className="card p-4 mb-5"><SearchInput value={search} onChange={setSearch} placeholder={t('subs.searchTiming')} /></div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun abonnement" icon={<Ticket className="h-7 w-7" />} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card card-hover p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <Badge tone="accent">{L.catName(L.tm[s.timingId]?.categoryId)}</Badge>
                <span className="font-display text-lg font-extrabold gradient-text">{money(s.totalPrice)}</span>
              </div>
              <h3 className="font-display font-bold text-fg mt-3 leading-snug">{s.name}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{t('subs.periodDays')}</p><p className="font-bold text-fg">{s.periodDays} j</p></div>
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{t('subs.seances')}</p><p className="font-bold text-fg">{s.totalSeances}</p></div>
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t('subs.pricePerSeance')}</p><p className="font-bold text-fg">{money(s.pricePerSeance)}</p></div>
                <div className="rounded-lg bg-surface-2 p-2.5"><p className="text-xs text-muted flex items-center gap-1"><Users className="h-3.5 w-3.5" />Joueurs</p><p className="font-bold text-fg">{L.playersOfTiming(s.timingId).length}</p></div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-line/10">
                {canDo('subscriptions', 'view') && <button onClick={() => setDetail(s)} className="btn-ghost flex-1 !py-2"><Eye className="h-4 w-4" />{t('common.view')}</button>}
                {canDo('subscriptions', 'edit') && <button onClick={() => openEdit(s)} className="btn-icon"><Pencil className="h-4 w-4" /></button>}
                {canDo('subscriptions', 'delete') && <button onClick={() => confirm.ask(() => { remove('subscriptions', s.id); toast('Supprimé', 'info'); }, 'Supprimer cet abonnement ?')} className="btn-icon hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editId ? 'Modifier abonnement' : t('subs.newSub')}
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="space-y-4">
          <SearchSelect label={t('subs.timing')} value={form.timingId} onChange={(v) => set({ timingId: v })}
            placeholder={t('subs.searchTiming')}
            options={data.timings.map((tm) => ({ value: tm.id, label: tm.name, sub: `${L.stName(tm.stadiumId)} · ${tm.startTime}-${tm.endTime}` }))} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('subs.periodDays')} type="number" value={form.periodDays} onChange={(e) => set({ periodDays: +e.target.value })} />
            <Input label={t('subs.seances')} type="number" value={form.totalSeances}
              onChange={(e) => { const n = +e.target.value; set({ totalSeances: n, totalPrice: n * form.pricePerSeance }); }} />
            <Input label={t('subs.pricePerSeance')} type="number" value={form.pricePerSeance}
              onChange={(e) => { const p = +e.target.value; set({ pricePerSeance: p, totalPrice: p * form.totalSeances }); }} />
            <Input label={t('subs.totalPrice')} type="number" value={form.totalPrice}
              onChange={(e) => { const tp = +e.target.value; set({ totalPrice: tp, pricePerSeance: form.totalSeances ? Math.round(tp / form.totalSeances) : 0 }); }} />
          </div>
          <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted">{t('subs.totalPrice')}</span>
            <span className="font-display text-xl font-extrabold gradient-text">{money(form.totalPrice)}</span>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} size="lg" title={detail?.name} subtitle={t('subs.title')}>
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label={t('subs.periodDays')} value={`${detail.periodDays} j`} />
              <Stat label={t('subs.seances')} value={String(detail.totalSeances)} />
              <Stat label={t('subs.pricePerSeance')} value={money(detail.pricePerSeance)} />
              <Stat label={t('subs.totalPrice')} value={money(detail.totalPrice)} accent />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label={t('planner.category')} value={L.catName(L.tm[detail.timingId]?.categoryId)} />
              <Stat label={t('planner.group')} value={L.grpName(L.tm[detail.timingId]?.groupId)} />
              <Stat label={t('planner.trainer')} value={L.trName(L.tm[detail.timingId]?.trainerId)} />
              <Stat label={t('planner.stadium')} value={L.stName(L.tm[detail.timingId]?.stadiumId)} />
              <Stat label={t('planner.schedule')} value={L.tm[detail.timingId] ? `${L.tm[detail.timingId].startTime}-${L.tm[detail.timingId].endTime}` : '—'} />
            </div>
            <div>
              <p className="label flex items-center gap-2"><Users className="h-4 w-4" />Joueurs abonnés ({L.playersOfTiming(detail.timingId).length})</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {L.playersOfTiming(detail.timingId).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-2.5">
                    <span className="text-sm font-medium text-fg">{L.playerName(p)}</span>
                    <Badge tone={p.assignedSubscription?.status === 'payed' ? 'success' : 'warning'}>{p.assignedSubscription?.status === 'payed' ? t('common.paid') : t('players.debt')}</Badge>
                  </div>
                ))}
                {L.playersOfTiming(detail.timingId).length === 0 && <p className="text-sm text-muted">Aucun joueur</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {confirm.node}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-bold mt-0.5 ${accent ? 'gradient-text text-lg' : 'text-fg'}`}>{value}</p>
    </div>
  );
}

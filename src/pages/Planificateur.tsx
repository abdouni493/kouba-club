import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CalendarRange, Plus, Eye, Pencil, Trash2, Clock, MapPin, Users, CalendarDays, Dumbbell } from 'lucide-react';
import { PageHeader, Badge, EmptyState, useConfirm, Avatar } from '../components/ui/Display';
import Modal from '../components/ui/Modal';
import { Select, CreatableSelect, DaysPicker, Field } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { uid } from '../lib/utils';
import type { Timing } from '../lib/types';

const DAY_LABEL: Record<string, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim',
};
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const emptyForm = { categoryId: '', groupId: '', sportId: '', stadiumId: '', trainerId: '', days: [] as string[], startTime: '17:00', endTime: '18:30' };

export default function Planificateur() {
  const { t } = useTranslation();
  const { data, add, updateItem, remove } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const confirm = useConfirm();
  const { canDo } = usePermissions();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState<Timing | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [filters, setFilters] = useState({ categoryId: '', sportId: '', trainerId: '', groupId: '' });

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const genName = () => {
    const parts = [L.catName(form.categoryId), L.grpName(form.groupId), L.trName(form.trainerId)].filter((x) => x !== '—');
    return parts.join(' · ') || 'Nouveau créneau';
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, sportId: data.sports.find((s) => s.name === 'Football')?.id || '' });
    setFormOpen(true);
  };
  const openEdit = (tm: Timing) => {
    setEditId(tm.id);
    setForm({ categoryId: tm.categoryId, groupId: tm.groupId, sportId: tm.sportId, stadiumId: tm.stadiumId, trainerId: tm.trainerId, days: tm.days, startTime: tm.startTime, endTime: tm.endTime });
    setFormOpen(true);
  };

  const save = () => {
    if (!form.categoryId || !form.groupId || !form.trainerId || !form.days.length) {
      toast('Veuillez remplir catégorie, groupe, entraîneur et jours', 'error'); return;
    }
    const name = genName();
    if (editId) {
      updateItem('timings', editId, { ...form, name });
      // sync trainer timingIds
      toast('Créneau mis à jour', 'success');
    } else {
      const id = uid('tm');
      add('timings', { id, name, ...form });
      const tr = data.trainers.find((x) => x.id === form.trainerId);
      if (tr) updateItem('trainers', tr.id, { timingIds: [...tr.timingIds, id] });
      toast('Créneau créé', 'success');
    }
    setFormOpen(false);
  };

  const del = (id: string) => { remove('timings', id); toast('Créneau supprimé', 'info'); };

  const filtered = useMemo(() => data.timings.filter((tm) =>
    (!filters.categoryId || tm.categoryId === filters.categoryId) &&
    (!filters.sportId || tm.sportId === filters.sportId) &&
    (!filters.trainerId || tm.trainerId === filters.trainerId) &&
    (!filters.groupId || tm.groupId === filters.groupId),
  ), [data.timings, filters]);

  return (
    <div>
      <PageHeader title={t('planner.title')} subtitle={`${data.timings.length} créneaux`} icon={<CalendarRange className="h-5 w-5" />}
        actions={<>
          {canDo('planificateur', 'calendar') && <button onClick={() => setCalOpen(true)} className="btn-ghost"><CalendarDays className="h-4 w-4" />{t('planner.viewCalendar')}</button>}
          <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />{t('planner.newTiming')}</button>
        </>} />

      {/* Filters */}
      <div className="card p-4 mb-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select label={t('planner.category')} value={filters.categoryId} onChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))} placeholder={t('common.all')} options={data.categories.map((c) => ({ value: c.id, label: c.name }))} />
        <Select label={t('planner.group')} value={filters.groupId} onChange={(v) => setFilters((f) => ({ ...f, groupId: v }))} placeholder={t('common.all')} options={data.groups.map((c) => ({ value: c.id, label: c.name }))} />
        <Select label={t('planner.sport')} value={filters.sportId} onChange={(v) => setFilters((f) => ({ ...f, sportId: v }))} placeholder={t('common.all')} options={data.sports.map((c) => ({ value: c.id, label: c.name }))} />
        <Select label={t('planner.trainer')} value={filters.trainerId} onChange={(v) => setFilters((f) => ({ ...f, trainerId: v }))} placeholder={t('common.all')} options={data.trainers.map((c) => ({ value: c.id, label: c.fullName }))} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun créneau" hint="Créez votre premier créneau d'entraînement." icon={<CalendarRange className="h-7 w-7" />} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tm, i) => (
            <motion.div key={tm.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card card-hover p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="accent">{L.catName(tm.categoryId)}</Badge>
                  <Badge>{L.grpName(tm.groupId)}</Badge>
                  <Badge tone="info">{L.spName(tm.sportId)}</Badge>
                </div>
              </div>
              <h3 className="font-display font-bold text-fg mt-3 leading-snug">{tm.name}</h3>
              <div className="mt-3 space-y-1.5 text-sm text-muted">
                <div className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-accent" />{L.trName(tm.trainerId)}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{L.stName(tm.stadiumId)}</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" />{tm.startTime} – {tm.endTime}</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" />{L.playersOfTiming(tm.id).length} joueurs</div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {[...tm.days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).map((d) => (
                  <span key={d} className="chip !py-0.5 !px-2 bg-surface-3 border-line/10 text-muted">{DAY_LABEL[d]}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-line/10">
                {canDo('planificateur', 'view') && <button onClick={() => setDetail(tm)} className="btn-ghost flex-1 !py-2"><Eye className="h-4 w-4" />{t('common.view')}</button>}
                {canDo('planificateur', 'edit') && <button onClick={() => openEdit(tm)} className="btn-icon"><Pencil className="h-4 w-4" /></button>}
                {canDo('planificateur', 'delete') && <button onClick={() => confirm.ask(() => del(tm.id), 'Supprimer ce créneau ?')} className="btn-icon hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="lg"
        title={editId ? 'Modifier le créneau' : t('planner.newTiming')} subtitle={genName()}
        footer={<><button onClick={() => setFormOpen(false)} className="btn-ghost">{t('common.cancel')}</button><button onClick={save} className="btn-primary">{t('common.save')}</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <CreatableSelect label={t('planner.category')} value={form.categoryId} onChange={(v) => set('categoryId', v)}
            options={data.categories.map((c) => ({ value: c.id, label: c.name }))}
            onCreate={(name) => { const id = uid('cat'); add('categories', { id, name }); return id; }} createLabel={t('planner.newCategory')} />
          <CreatableSelect label={t('planner.group')} value={form.groupId} onChange={(v) => set('groupId', v)}
            options={data.groups.map((c) => ({ value: c.id, label: c.name }))}
            onCreate={(name) => { const id = uid('grp'); add('groups', { id, name }); return id; }} createLabel={t('planner.newGroup')} />
          <CreatableSelect label={t('planner.sport')} value={form.sportId} onChange={(v) => set('sportId', v)}
            options={data.sports.map((c) => ({ value: c.id, label: c.name }))}
            onCreate={(name) => { const id = uid('sp'); add('sports', { id, name }); return id; }} createLabel={t('planner.newSport')} />
          <CreatableSelect label={t('planner.stadium')} value={form.stadiumId} onChange={(v) => set('stadiumId', v)}
            options={data.stadiums.map((c) => ({ value: c.id, label: c.name }))}
            onCreate={(name) => { const id = uid('st'); add('stadiums', { id, name }); return id; }} createLabel={t('planner.newStadium')} />
          <Select label={t('planner.trainer')} value={form.trainerId} onChange={(v) => set('trainerId', v)} placeholder="—"
            options={data.trainers.map((c) => ({ value: c.id, label: c.fullName }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('planner.startTime')}><input type="time" className="input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
            <Field label={t('planner.endTime')}><input type="time" className="input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-2"><DaysPicker label={t('planner.days')} value={form.days} onChange={(v) => set('days', v)} /></div>
        </div>
        <div className="mt-4 rounded-xl bg-accent/10 border border-accent/20 px-4 py-3">
          <p className="text-xs text-muted">Nom généré</p>
          <p className="font-display font-bold text-accent">{genName()}</p>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} size="lg" title={detail?.name} subtitle={t('planner.schedule')}>
        {detail && <TimingDetail tm={detail} />}
      </Modal>

      {/* Calendar modal */}
      <Modal open={calOpen} onClose={() => setCalOpen(false)} size="2xl" title={t('planner.calendar')} subtitle={`${data.timings.length} créneaux`}>
        <CalendarView onSelect={(tm) => { setCalOpen(false); setDetail(tm); }} />
      </Modal>

      {confirm.node}
    </div>
  );

  function TimingDetail({ tm }: { tm: Timing }) {
    const players = L.playersOfTiming(tm.id);
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Info label={t('planner.category')} value={L.catName(tm.categoryId)} />
          <Info label={t('planner.group')} value={L.grpName(tm.groupId)} />
          <Info label={t('planner.sport')} value={L.spName(tm.sportId)} />
          <Info label={t('planner.stadium')} value={L.stName(tm.stadiumId)} />
          <Info label={t('planner.trainer')} value={L.trName(tm.trainerId)} />
          <Info label={t('planner.schedule')} value={`${tm.startTime} – ${tm.endTime}`} />
        </div>
        <div>
          <p className="label">{t('planner.days')}</p>
          <div className="flex flex-wrap gap-2">
            {[...tm.days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).map((d) => <Badge key={d} tone="accent">{DAY_LABEL[d]}</Badge>)}
          </div>
        </div>
        <div>
          <p className="label flex items-center gap-2"><Users className="h-4 w-4" />{t('planner.playersInTiming')} ({players.length})</p>
          {players.length === 0 ? <p className="text-sm text-muted">Aucun joueur assigné</p> : (
            <div className="grid sm:grid-cols-2 gap-2">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
                  <Avatar name={L.playerName(p)} id={p.id} size={34} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-fg truncate">{L.playerName(p)}</p><p className="text-xs text-muted">{p.phone}</p></div>
                  <Badge tone={p.assignedSubscription?.status === 'payed' ? 'success' : 'warning'}>{p.assignedSubscription?.status === 'payed' ? t('common.paid') : t('players.debt')}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function CalendarView({ onSelect }: { onSelect: (tm: Timing) => void }) {
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[900px]">
          {DAY_ORDER.map((day) => {
            const items = data.timings.filter((tm) => tm.days.includes(day)).sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={day} className="rounded-xl bg-surface-2 p-2 min-h-[300px]">
                <p className="text-center text-xs font-bold uppercase tracking-wide text-muted py-2 border-b border-line/10 mb-2">{DAY_LABEL[day]}</p>
                <div className="space-y-2">
                  {items.map((tm) => (
                    <button key={tm.id} onClick={() => onSelect(tm)}
                      className="w-full text-left rounded-lg p-2 bg-accent-grad text-black hover:brightness-110 transition-all">
                      <p className="text-[11px] font-bold">{tm.startTime}–{tm.endTime}</p>
                      <p className="text-xs font-semibold leading-tight mt-0.5 line-clamp-2">{L.catName(tm.categoryId)} {L.grpName(tm.groupId)}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{L.trName(tm.trainerId)}</p>
                    </button>
                  ))}
                  {items.length === 0 && <p className="text-center text-xs text-faint py-4">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold text-fg mt-0.5">{value}</p>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, HeartPulse, Check, Phone, Calendar } from 'lucide-react';
import { PageHeader, Badge, EmptyState, SearchInput, Avatar } from '../../components/ui/Display';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea, Segmented } from '../../components/ui/Fields';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLookups } from '../../lib/selectors';
import { uid, today, fmtDate, cx } from '../../lib/utils';
import { latestMedical } from '../Players';
import type { MedicalRecord, Player } from '../../lib/types';

/**
 * Doctor's player list: read-only (no pricing/payment info anywhere), the ONLY
 * action is setting the medical status — written to player_medical_records
 * with doctor_id = the signed-in doctor.
 */
export default function DoctorPlayers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, updateItem } = useData();
  const { toast } = useToast();
  const L = useLookups();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [medStatus, setMedStatus] = useState('');
  const [medFor, setMedFor] = useState<Player | null>(null);

  const cur = (p: Player) => data.players.find((x) => x.id === p.id) || p;

  const filtered = useMemo(() => data.players.filter((p) => {
    const hay = `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    const tm = p.assignedSubscription ? L.tm[p.assignedSubscription.timingId] : undefined;
    if (category && tm?.categoryId !== category) return false;
    if (medStatus) {
      const med = latestMedical(p);
      if (medStatus === 'ok' && med?.status !== true) return false;
      if (medStatus === 'ko' && med?.status !== false) return false;
      if (medStatus === 'unknown' && med) return false;
    }
    return true;
  }), [data.players, search, category, medStatus, L]);

  return (
    <div>
      <PageHeader title={t('players.title')} subtitle={`${data.players.length} joueurs — suivi médical`} icon={<Users className="h-5 w-5" />} />

      <div className="card p-4 mb-5 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('players.searchPh')} />
        <div className="grid grid-cols-2 gap-2.5">
          <Select value={category} onChange={setCategory} placeholder={t('players.filterCategory')} options={data.categories.map((c) => ({ value: c.id, label: c.name }))} />
          <Select value={medStatus} onChange={setMedStatus} placeholder="État médical" options={[
            { value: 'ok', label: 'Aptes' }, { value: 'ko', label: 'Inaptes' }, { value: 'unknown', label: 'Non évalués' },
          ]} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun joueur" icon={<Users className="h-7 w-7" />} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => {
            const med = latestMedical(p);
            const tm = p.assignedSubscription ? L.tm[p.assignedSubscription.timingId] : undefined;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="card card-hover p-5">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar name={L.playerName(p)} id={p.id} size={48} src={p.photoUrl || undefined} />
                    {med && (
                      <span className={cx('absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-surface', med.status ? 'bg-success' : 'bg-danger')}>
                        <HeartPulse className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-fg truncate">{L.playerName(p)}</h3>
                    <p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone || '—'}</p>
                  </div>
                  {med
                    ? <Badge tone={med.status ? 'success' : 'danger'}>{med.status ? 'Apte' : 'Inapte'}</Badge>
                    : <Badge tone="muted">Non évalué</Badge>}
                </div>
                <div className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-muted space-y-1">
                  <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Né(e) le {fmtDate(p.birthDate)}</p>
                  <p className="truncate">{tm ? tm.name : t('players.noSub')}</p>
                  {med?.description && <p className="text-fg truncate">{med.description}</p>}
                </div>
                <button onClick={() => setMedFor(p)} className="btn-primary w-full mt-4 !py-2">
                  <HeartPulse className="h-4 w-4" />État médical
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {medFor && <MedicalModal p={cur(medFor)} onClose={() => setMedFor(null)} />}
    </div>
  );

  function MedicalModal({ p, onClose }: { p: Player; onClose: () => void }) {
    const [form, setForm] = useState({ status: latestMedical(p)?.status ?? true, description: '', date: today() });
    const save = () => {
      const rec: MedicalRecord = {
        id: uid('med'), status: form.status, description: form.description,
        date: form.date || today(), doctorId: user?.doctorId,
      };
      updateItem('players', p.id, { medicalRecords: [rec, ...p.medicalRecords] });
      toast('État médical enregistré', 'success');
      setForm({ status: true, description: '', date: today() });
    };
    return (
      <Modal open onClose={onClose} size="lg" title="État médical" subtitle={L.playerName(p)}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-2 border border-line/10 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented value={form.status ? 'ok' : 'ko'} onChange={(v) => setForm({ ...form, status: v === 'ok' })}
                options={[{ value: 'ok', label: '✓ Apte' }, { value: 'ko', label: '✗ Inapte' }]} />
              <span className={cx('h-3 w-3 rounded-full', form.status ? 'bg-success' : 'bg-danger')} />
              <div className="flex-1 min-w-[140px]"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <Textarea label={t('common.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Diagnostic, remarques…" />
            <div className="flex justify-end"><button onClick={save} className="btn-primary !py-1.5"><Check className="h-4 w-4" />Enregistrer</button></div>
          </div>

          <div>
            <p className="label">Historique</p>
            {p.medicalRecords.length === 0 ? <p className="text-sm text-muted">Aucun historique</p> : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
        </div>
      </Modal>
    );
  }
}

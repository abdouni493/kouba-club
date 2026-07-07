import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, CalendarDays, Check, X, Clock, Lock, ScanLine, UserCheck, UserX, HelpCircle,
} from 'lucide-react';
import { PageHeader, Badge, EmptyState, Avatar, StatCard } from '../components/ui/Display';
import { Input, Select } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLookups } from '../lib/selectors';
import { usePermissions } from '../lib/permissions';
import { uid, today, fmtDate, cx } from '../lib/utils';
import { isScheduledOn, attendanceOn, notifyAttendanceEmail, notifyAttendanceSms } from '../lib/attendance';
import type { AttendanceRecord, Player, Timing } from '../lib/types';

interface ScheduledRow { player: Player; timing: Timing }

export default function Presence() {
  const { t } = useTranslation();
  const { data, loading, updateItem } = useData();
  const { toast } = useToast();
  const L = useLookups();
  const { canDo } = usePermissions();

  const [date, setDate] = useState(today());
  const [timingFilter, setTimingFilter] = useState('');
  const [closing, setClosing] = useState(false);
  // Past dates auto-close once per session — this remembers which ones already ran.
  const autoClosed = useRef<Set<string>>(new Set());

  // Every player scheduled on the selected date via their assigned timing.
  const scheduled: ScheduledRow[] = useMemo(() => {
    const rows: ScheduledRow[] = [];
    for (const p of data.players) {
      const timing = p.assignedSubscription ? L.tm[p.assignedSubscription.timingId] : undefined;
      if (!timing || !isScheduledOn(p, timing, date)) continue;
      if (timingFilter && timing.id !== timingFilter) continue;
      rows.push({ player: p, timing });
    }
    return rows.sort((a, b) => L.playerName(a.player).localeCompare(L.playerName(b.player)));
  }, [data.players, date, timingFilter, L]);

  const timingsOfDay = useMemo(() => {
    const ids = new Set<string>();
    for (const p of data.players) {
      const timing = p.assignedSubscription ? L.tm[p.assignedSubscription.timingId] : undefined;
      if (timing && isScheduledOn(p, timing, date)) ids.add(timing.id);
    }
    return data.timings.filter((tm) => ids.has(tm.id));
  }, [data.players, data.timings, date, L]);

  const withStatus = scheduled.map((row) => ({ ...row, record: attendanceOn(row.player, row.timing.id, date) }));
  const presentCount = withStatus.filter((r) => r.record?.status === 'present').length;
  const absentCount = withStatus.filter((r) => r.record?.status === 'absent').length;
  const pendingCount = withStatus.filter((r) => !r.record).length;

  /** Insert one attendance record + best-effort parent e-mail/SMS. Returns which channels went out. */
  const saveRecord = async (player: Player, timing: Timing, status: 'present' | 'absent'): Promise<{ emailSent: boolean; smsSent: boolean }> => {
    const existing = attendanceOn(player, timing.id, date);
    const rec: AttendanceRecord = { id: uid('att'), timingId: timing.id, date, status };
    const next = existing
      ? [rec, ...player.attendanceRecords.filter((a) => a.id !== existing.id)]
      : [rec, ...player.attendanceRecords];
    await updateItem('players', player.id, { attendanceRecords: next });
    const parent = player.parentId ? L.par[player.parentId] : undefined;
    const [emailSent, smsSent] = await Promise.all([
      notifyAttendanceEmail(data.club, player, parent, rec, timing.name),
      notifyAttendanceSms(player, parent, rec, timing.name),
    ]);
    return { emailSent, smsSent };
  };

  const mark = async (player: Player, timing: Timing, status: 'present' | 'absent') => {
    const { emailSent, smsSent } = await saveRecord(player, timing, status);
    const parts = [emailSent && 'e-mail envoyé', smsSent && 'SMS envoyé'].filter(Boolean).join(' · ');
    toast(`${L.playerName(player)} — ${status === 'present' ? 'présent(e)' : 'absent(e)'}${parts ? ` · ${parts}` : ''}`, 'success');
  };

  /** Mark every still-unmarked scheduled player of the date as absent. */
  const closeDay = async (silent = false) => {
    // Ignore the timing filter here — closing the day covers the whole date.
    const all: ScheduledRow[] = [];
    for (const p of data.players) {
      const timing = p.assignedSubscription ? L.tm[p.assignedSubscription.timingId] : undefined;
      if (timing && isScheduledOn(p, timing, date)) all.push({ player: p, timing });
    }
    const missing = all.filter(({ player, timing }) => !attendanceOn(player, timing.id, date));
    if (missing.length === 0) {
      if (!silent) toast('Journée déjà complète — aucune absence à enregistrer', 'info');
      return;
    }
    setClosing(true);
    try {
      const results = await Promise.all(missing.map(({ player, timing }) =>
        saveRecord(player, timing, 'absent').catch(() => ({ emailSent: false, smsSent: false })),
      ));
      const withEmail = missing.filter(({ player }) => {
        const parent = player.parentId ? L.par[player.parentId] : undefined;
        return !!parent?.email;
      }).length;
      const sentEmail = results.filter((r) => r.emailSent).length;
      const sentSms = results.filter((r) => r.smsSent).length;
      const failed = withEmail - sentEmail;
      toast(`${missing.length} absences enregistrées · ${sentEmail} e-mails envoyés${failed > 0 ? `, ${failed} échecs` : ''} · ${sentSms} SMS envoyés`, 'success');
    } finally {
      setClosing(false);
    }
  };

  // Opening the page on a PAST date lazily closes it — nothing to remember.
  useEffect(() => {
    if (loading || date >= today() || autoClosed.current.has(date)) return;
    if (!canDo('presence', 'close')) return;
    autoClosed.current.add(date);
    closeDay(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, loading, data.players.length]);

  return (
    <div>
      <PageHeader title={t('nav.presence')} subtitle={`${scheduled.length} joueurs programmés le ${fmtDate(date)}`} icon={<ClipboardCheck className="h-5 w-5" />}
        actions={canDo('presence', 'close') && (
          <button onClick={() => closeDay()} className="btn-primary" disabled={closing || pendingCount === 0}>
            <Lock className="h-4 w-4" />{closing ? '…' : 'Clôturer la journée'}
          </button>
        )} />

      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Présents" value={presentCount} icon={<UserCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Absents" value={absentCount} icon={<UserX className="h-5 w-5" />} tone="danger" delay={0.05} />
        <StatCard label="Non pointés" value={pendingCount} icon={<HelpCircle className="h-5 w-5" />} tone="warning" delay={0.1} />
      </div>

      <div className="card p-4 mb-5 flex flex-wrap items-end gap-3">
        <Input label={t('common.date')} type="date" value={date} onChange={(e) => { setDate(e.target.value); setTimingFilter(''); }} />
        <div className="min-w-[220px]">
          <Select label={t('subs.timing')} value={timingFilter} onChange={setTimingFilter} placeholder={t('common.all')}
            options={timingsOfDay.map((tm) => ({ value: tm.id, label: tm.name }))} />
        </div>
        <p className="text-xs text-muted ml-auto flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" />{fmtDate(date)} · {timingsOfDay.length} créneaux
        </p>
      </div>

      {withStatus.length === 0 ? (
        <EmptyState title="Aucun joueur programmé ce jour" hint="Les joueurs apparaissent ici selon les jours de leur créneau assigné." icon={<ClipboardCheck className="h-7 w-7" />} />
      ) : (
        <div className="card p-2 divide-y divide-line/10">
          {withStatus.map(({ player, timing, record }, i) => (
            <motion.div key={player.id + timing.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="flex flex-wrap items-center gap-3 px-3 py-3">
              <Avatar name={L.playerName(player)} id={player.id} size={40} src={player.photoUrl || undefined} />
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-semibold text-fg truncate">{L.playerName(player)}</p>
                <p className="text-xs text-muted flex items-center gap-1.5 truncate">
                  <Clock className="h-3.5 w-3.5" />{timing.name} · {timing.startTime}–{timing.endTime}
                </p>
              </div>
              {record ? (
                <Badge tone={record.status === 'present' ? 'success' : 'danger'} className="flex items-center gap-1">
                  {record.status === 'present' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {record.status === 'present' ? 'Présent' : 'Absent'}
                  {record.scannedAt && <ScanLine className="h-3 w-3 opacity-70" />}
                </Badge>
              ) : (
                <Badge tone="warning">Non pointé</Badge>
              )}
              {canDo('presence', 'mark') && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => mark(player, timing, 'present')}
                    disabled={record?.status === 'present'}
                    className={cx('btn-ghost !py-1.5 !px-3 text-xs', record?.status === 'present' && 'opacity-40 cursor-not-allowed')}>
                    <Check className="h-3.5 w-3.5 text-success" />Présent
                  </button>
                  <button onClick={() => mark(player, timing, 'absent')}
                    disabled={record?.status === 'absent'}
                    className={cx('btn-ghost !py-1.5 !px-3 text-xs', record?.status === 'absent' && 'opacity-40 cursor-not-allowed')}>
                    <X className="h-3.5 w-3.5 text-danger" />Absent
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

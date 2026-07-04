import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ScanLine, Camera, CameraOff, RotateCw, Keyboard, Search, Loader2,
  User, Phone, Mail, MapPin, Calendar, Ticket, CircleDollarSign,
  CheckCircle2, AlertTriangle, XCircle, Ban,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { Avatar, Badge } from '../ui/Display';
import { useData } from '../../context/DataContext';
import { useLookups } from '../../lib/selectors';
import { usePermissions } from '../../lib/permissions';
import { fmtDate, money } from '../../lib/utils';
import { resolvePlayerByCode, subStatus, type SubStatus } from '../../lib/scan';
import type { Player } from '../../lib/types';
import type { IScannerControls } from '@zxing/browser';

// ======================= Context / provider =======================

interface ScanCtx { open: () => void }
const Ctx = createContext<ScanCtx | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<ScanCtx>(() => ({ open: () => setIsOpen(true) }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ScanModal open={isOpen} onClose={() => setIsOpen(false)} />
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useScan() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useScan must be used within ScanProvider');
  return c;
}

// ======================= Camera scanner =======================

function CameraScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const cbRef = useRef(onDetected);
  useEffect(() => { cbRef.current = onDetected; });

  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<'denied' | 'unsupported' | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) { setError('unsupported'); return; }

    setReady(false);
    setError(null);
    let cancelled = false;

    (async () => {
      try {
        // Loaded on demand — the ZXing decoder is only needed while the scanner is open,
        // so it stays out of the app's main bundle.
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        if (cancelled) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints);

        const video = videoRef.current;
        if (!video) return;

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: facing } }, audio: false },
          video,
          (result) => {
            if (result) {
              controlsRef.current?.stop();
              controlsRef.current = null;
              cbRef.current(result.getText());
            }
            // decode errors (no code in the current frame) are expected between hits — ignore them
          },
        );
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
        setReady(true);
      } catch {
        if (!cancelled) setError('denied');
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [facing]);

  if (error) {
    return (
      <div className="rounded-2xl bg-surface-2 border border-line/10 p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/15 text-danger mb-3">
          <CameraOff className="h-7 w-7" />
        </div>
        <p className="font-semibold text-fg">
          {error === 'unsupported' ? t('scan.unsupported') : t('scan.camDenied')}
        </p>
        <p className="text-sm text-muted mt-1">{t('scan.camHint')}</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-sm aspect-square overflow-hidden rounded-2xl bg-black ring-1 ring-line/10">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

      {/* framing overlay */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="relative h-2/3 w-2/3">
          {['left-0 top-0 border-l-4 border-t-4 rounded-tl-xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-xl',
            'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-xl']
            .map((c) => <span key={c} className={`absolute h-8 w-8 border-white/90 ${c}`} />)}
          {ready && (
            <motion.span
              className="absolute inset-x-2 h-0.5 rounded bg-accent shadow-[0_0_12px_rgb(var(--accent))]"
              initial={{ top: '6%' }} animate={{ top: '94%' }}
              transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
          )}
        </div>
      </div>

      {/* status pill */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
        {ready
          ? <><ScanLine className="h-3.5 w-3.5 text-accent" />{t('scan.point')}</>
          : <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('common.loading')}</>}
      </div>

      {/* flip camera */}
      <button
        onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
        className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/70 transition-colors"
        title={t('scan.flip')} aria-label={t('scan.flip')}
      >
        <RotateCw className="h-5 w-5" />
      </button>
    </div>
  );
}

// ======================= Result view =======================

const STATUS_META: Record<SubStatus, { tone: string; icon: typeof CheckCircle2; box: string }> = {
  active: { tone: 'success', icon: CheckCircle2, box: 'bg-success/10 border-success/30 text-success' },
  soon: { tone: 'warning', icon: AlertTriangle, box: 'bg-warning/10 border-warning/30 text-warning' },
  expired: { tone: 'danger', icon: XCircle, box: 'bg-danger/10 border-danger/30 text-danger' },
  none: { tone: 'muted', icon: Ban, box: 'bg-surface-2 border-line/10 text-muted' },
};

function ScanResultView({ player, code }: { player: Player; code: string }) {
  const { t } = useTranslation();
  const L = useLookups();
  // Workers scanning a card must not see any prices / payment amounts.
  const { isAdmin } = usePermissions();
  const a = player.assignedSubscription;
  const tm = a ? L.tm[a.timingId] : undefined;
  const parent = player.parentId ? L.par[player.parentId] : undefined;
  const { status, days } = subStatus(player);
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  const statusLabel =
    status === 'active' ? t('scan.statusActive')
    : status === 'soon' ? t('scan.statusSoon')
    : status === 'expired' ? t('scan.statusExpired')
    : t('scan.statusNone');
  const statusDetail =
    status === 'active' ? `${days} ${t('players.daysLeft')}`
    : status === 'soon' ? `${days} ${t('players.daysLeft')}`
    : status === 'expired' ? `${t('players.expired')} · ${Math.abs(days)} j`
    : t('players.noSub');

  return (
    <div className="space-y-4">
      {/* status alert banner */}
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${meta.box}`}>
        <StatusIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="font-display font-bold leading-tight">{statusLabel}</p>
          <p className="text-sm opacity-90">{statusDetail}</p>
        </div>
      </div>

      {/* player identity */}
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
        <Avatar name={L.playerName(player)} id={player.id} size={52} />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-fg truncate">{L.playerName(player)}</p>
          <p className="text-xs text-muted flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />{player.phone || '—'}
          </p>
          <Badge tone={player.subscriptionCostPaid ? 'success' : 'muted'} className="mt-1">
            {player.subscriptionCostPaid ? t('players.regPaid') : t('players.regUnpaid')}
          </Badge>
        </div>
      </div>

      {/* player info grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <InfoLine icon={<Calendar className="h-4 w-4" />} label={t('common.birthDate')} value={fmtDate(player.birthDate)} />
        <InfoLine icon={<MapPin className="h-4 w-4" />} label={t('players.birthPlace')} value={player.birthPlace || '—'} />
        <InfoLine icon={<Mail className="h-4 w-4" />} label={t('common.email')} value={player.email || '—'} />
        <InfoLine icon={<User className="h-4 w-4" />} label={t('players.parentInfo')}
          value={parent ? `${parent.firstName} ${parent.lastName}` : t('common.none')} />
      </div>

      {/* subscription info */}
      <div>
        <p className="label flex items-center gap-2"><Ticket className="h-4 w-4 text-accent" />{t('players.subInfo')}</p>
        {a && tm ? (
          <div className="rounded-2xl bg-accent/10 border border-accent/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-bold text-fg truncate">{tm.name}</p>
              {isAdmin && (
                <Badge tone={a.status === 'payed' ? 'success' : 'warning'}>
                  {a.status === 'payed' ? t('common.paid') : t('players.debt')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted">
              {L.catName(tm.categoryId)} · {L.grpName(tm.groupId)}
            </p>
            <div className="flex items-center gap-2 text-sm text-fg">
              <Calendar className="h-4 w-4 text-accent" />
              {fmtDate(a.startDate)} → <span className="font-semibold">{fmtDate(a.expiryDate)}</span>
            </div>
            {isAdmin && (
              <div className="grid grid-cols-3 gap-2.5">
                <MiniStat label={t('common.price')} value={money(a.price)} />
                <MiniStat label={t('common.paid')} value={money(a.amountPaid)} />
                <MiniStat label={t('common.rest')} value={money(a.rest)} danger={a.rest > 0} />
              </div>
            )}
            {isAdmin && a.rest > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/20 px-3 py-2 text-sm font-semibold text-danger">
                <CircleDollarSign className="h-4 w-4" />{t('players.debt')}: {money(a.rest)}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-2 border border-line/10 p-4 text-center text-sm text-muted">
            {t('players.noSub')}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-faint">{t('scan.scanned')}: {code}</p>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-[11px] text-muted flex items-center gap-1.5">{icon}{label}</p>
      <p className="font-semibold text-fg text-sm mt-0.5 truncate">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-3 p-2.5 text-center">
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`font-bold text-sm mt-0.5 ${danger ? 'text-danger' : 'text-fg'}`}>{value}</p>
    </div>
  );
}

// ======================= Modal orchestration =======================

function ScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { data } = useData();
  const [code, setCode] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState('');

  // reset whenever it opens
  useEffect(() => {
    if (open) { setCode(null); setManual(false); setManualValue(''); }
  }, [open]);

  const player = useMemo(
    () => (code ? resolvePlayerByCode(code, data.players) : undefined),
    [code, data.players],
  );

  const reset = () => { setCode(null); setManual(false); setManualValue(''); };
  const submitManual = () => { if (manualValue.trim()) setCode(manualValue.trim()); };

  const footer = code ? (
    <>
      <button onClick={reset} className="btn-ghost"><ScanLine className="h-4 w-4" />{t('scan.again')}</button>
      <button onClick={onClose} className="btn-primary">{t('common.close')}</button>
    </>
  ) : (
    <button onClick={onClose} className="btn-ghost">{t('common.close')}</button>
  );

  return (
    <Modal open={open} onClose={onClose} size="lg" title={t('scan.title')} subtitle={t('scan.subtitle')} footer={footer}>
      {!code ? (
        <div className="space-y-4">
          {!manual ? (
            <>
              <CameraScanner onDetected={setCode} />
              <button onClick={() => setManual(true)} className="btn-ghost w-full">
                <Keyboard className="h-4 w-4" />{t('scan.manual')}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <label className="label flex items-center gap-2"><Keyboard className="h-4 w-4" />{t('scan.manual')}</label>
              <div className="flex gap-2">
                <input
                  autoFocus className="input flex-1" placeholder={t('scan.manualPh')}
                  value={manualValue} onChange={(e) => setManualValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitManual(); } }}
                />
                <button onClick={submitManual} className="btn-primary !px-4" disabled={!manualValue.trim()}>
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <button onClick={() => setManual(false)} className="btn-ghost w-full">
                <Camera className="h-4 w-4" />{t('scan.useCamera')}
              </button>
            </div>
          )}
        </div>
      ) : player ? (
        <ScanResultView player={player} code={code} />
      ) : (
        <div className="rounded-2xl bg-surface-2 border border-line/10 p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/15 text-danger mb-3">
            <XCircle className="h-7 w-7" />
          </div>
          <p className="font-semibold text-fg">{t('scan.notFound')}</p>
          <p className="text-sm text-muted mt-1">{t('scan.notFoundHint')}</p>
          <p className="text-[11px] text-faint mt-3">{t('scan.scanned')}: {code}</p>
        </div>
      )}
    </Modal>
  );
}

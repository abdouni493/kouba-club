import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCog, KeyRound, Wallet, CircleDollarSign, CalendarClock, Info as InfoIcon, Check } from 'lucide-react';
import { PageHeader, Badge } from '../../components/ui/Display';
import { Input } from '../../components/ui/Fields';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { money, fmtDate } from '../../lib/utils';

/**
 * "Mon compte" for doctors: edit own username/e-mail/password (via Supabase
 * Auth + profiles), view own pay data (doctor_money_entries / doctor_payments,
 * RLS-filtered to the signed-in doctor). Phone/address are read-only here —
 * the doctors table is only writable by admins (RLS).
 */
export default function DoctorAccount() {
  const { t } = useTranslation();
  const { user, updateProfile, updatePassword } = useAuth();
  const { data } = useData();
  const { toast } = useToast();
  const me = data.doctors.find((d) => d.id === user?.doctorId);

  const [profile, setProfile] = useState({ name: user?.name || '', username: user?.username || '', email: user?.email || '' });
  const [pwd, setPwd] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    const res = await updateProfile(profile);
    setSavingProfile(false);
    toast(res.ok ? 'Profil mis à jour' : `Erreur : ${res.error}`, res.ok ? 'success' : 'error');
  };

  const savePwd = async () => {
    if (pwd.length < 6) { toast('Mot de passe trop court (6 caractères min.)', 'error'); return; }
    setSavingPwd(true);
    const res = await updatePassword(pwd);
    setSavingPwd(false);
    if (res.ok) setPwd('');
    toast(res.ok ? 'Mot de passe modifié' : `Erreur : ${res.error}`, res.ok ? 'success' : 'error');
  };

  const payLabel = me ? { day: 'jour', month: 'mois', session: 'séance' }[me.payType] : '';

  return (
    <div>
      <PageHeader title="Mon compte" subtitle={user?.email} icon={<UserCog className="h-5 w-5" />} />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Profile */}
        <div className="card p-5 space-y-4">
          <h3 className="font-display font-bold text-fg">Profil</h3>
          <Input label={t('common.fullName')} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <Input label={t('auth.username')} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
          <Input label={t('common.email')} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          <button onClick={saveProfile} className="btn-primary" disabled={savingProfile}><Check className="h-4 w-4" />{savingProfile ? '…' : t('common.save')}</button>

          <div className="pt-4 border-t border-line/10 space-y-3">
            <h3 className="font-display font-bold text-fg flex items-center gap-2"><KeyRound className="h-4 w-4" />Mot de passe</h3>
            <Input label="Nouveau mot de passe" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="6 caractères minimum" />
            <button onClick={savePwd} className="btn-ghost" disabled={savingPwd}>{savingPwd ? '…' : 'Changer le mot de passe'}</button>
          </div>

          {me && (
            <div className="rounded-xl bg-surface-2 border border-line/10 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2"><InfoIcon className="h-4 w-4" />Coordonnées (gérées par l'administration)</p>
              <p className="text-sm text-fg">Téléphone : {me.phone || '—'}</p>
              <p className="text-sm text-fg">Adresse : {me.address || '—'}</p>
              <p className="text-sm text-fg">Rémunération : {money(me.payAmount)} / {payLabel}</p>
              <p className="text-xs text-muted">Contactez l'administrateur pour modifier ces informations.</p>
            </div>
          )}
        </div>

        {/* Payment history (read-only) */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-bold text-fg mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" />Mes paiements</h3>
            {!me || me.payments.length === 0 ? <p className="text-sm text-muted">{t('common.noData')}</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[...me.payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                    <div><p className="text-sm font-semibold text-fg">{p.description || 'Paiement'}</p><p className="text-xs text-muted">{fmtDate(p.date)}</p></div>
                    <span className="font-bold text-success">+{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-display font-bold text-fg mb-3 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-warning" />Mes acomptes</h3>
            {!me || me.acomptes.length === 0 ? <p className="text-sm text-muted">{t('common.noData')}</p> : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {[...me.acomptes].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                    <div><p className="text-sm font-semibold text-fg">{a.description || 'Acompte'}</p><p className="text-xs text-muted">{fmtDate(a.date)}</p></div>
                    <span className="font-bold text-warning">{money(a.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-display font-bold text-fg mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-danger" />Mes absences</h3>
            {!me || me.absences.length === 0 ? <p className="text-sm text-muted">{t('common.noData')}</p> : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {[...me.absences].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                    <div><p className="text-sm font-semibold text-fg">{a.description || 'Absence'}</p><p className="text-xs text-muted">{fmtDate(a.date)}</p></div>
                    <Badge tone="danger">{money(a.amount)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

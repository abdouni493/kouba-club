import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Building2, UserCog, Database, Save, Upload, Download, Trophy, ShieldCheck, Stamp } from 'lucide-react';
import { PageHeader, Tabs } from '../components/ui/Display';
import { Input, Textarea } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadImage } from '../lib/storage';
import { download } from '../lib/utils';

export default function Settings() {
  const { t } = useTranslation();
  const { data, patch, exportJSON } = useData();
  const { user, updateProfile, updatePassword } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState('club');
  const [club, setClub] = useState(data.club);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCachet, setUploadingCachet] = useState(false);
  const [account, setAccount] = useState({ name: user?.name || '', username: user?.username || '', email: user?.email || '' });
  const [newPassword, setNewPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    setClub(data.club);
  }, [data.club]);

  useEffect(() => {
    if (user) {
      setAccount({ name: user.name || '', username: user.username || '', email: user.email || '' });
    }
  }, [user]);

  const saveClub = () => { patch({ club }); toast('Informations enregistrées', 'success'); };

  const saveAccount = async () => {
    if (newPassword && newPassword.length < 6) { toast('Mot de passe trop court (6 caractères min.)', 'error'); return; }
    setSavingAccount(true);
    try {
      const r = await updateProfile(account);
      if (!r.ok) { toast(`Erreur : ${r.error}`, 'error'); return; }
      if (newPassword) {
        const rp = await updatePassword(newPassword);
        if (!rp.ok) { toast(`Mot de passe non changé : ${rp.error}`, 'error'); return; }
        setNewPassword('');
      }
      toast('Compte mis à jour', 'success');
    } finally {
      setSavingAccount(false);
    }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage('club-logo', file);
      const updatedClub = { ...club, logo: url };
      setClub(updatedClub);
      patch({ club: updatedClub });
      toast('Logo téléversé et enregistré', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur de téléversement', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Cachet (official stamp) reuses the same club-logo bucket — no separate bucket.
  const onCachet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingCachet(true);
    try {
      const url = await uploadImage('club-logo', file);
      const updatedClub = { ...club, cachet: url };
      setClub(updatedClub);
      patch({ club: updatedClub });
      toast('Cachet téléversé et enregistré', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur de téléversement', 'error');
    } finally {
      setUploadingCachet(false);
    }
  };

  const backup = () => { download(`orangefc-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON()); toast('Sauvegarde téléchargée', 'success'); };

  return (
    <div>
      <PageHeader title={t('settings.title')} icon={<SettingsIcon className="h-5 w-5" />} />
      <div className="mb-5"><Tabs active={tab} onChange={setTab} tabs={[
        { key: 'club', label: t('settings.club'), icon: <Building2 className="h-4 w-4" /> },
        { key: 'account', label: t('settings.account'), icon: <UserCog className="h-4 w-4" /> },
        { key: 'database', label: t('settings.database'), icon: <Database className="h-4 w-4" /> },
      ]} /></div>

      {tab === 'club' && (
        <div className="card p-6 max-w-3xl">
          <div className="flex flex-wrap items-center gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-accent-grad text-black overflow-hidden shadow-glow">
                {club.logo ? <img src={club.logo} alt="logo" className="h-full w-full object-cover" /> : <Trophy className="h-9 w-9" />}
              </div>
              <label className="btn-ghost cursor-pointer">
                <Upload className="h-4 w-4" />{uploadingLogo ? 'Envoi…' : t('settings.logo')}
                <input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={uploadingLogo} />
              </label>
            </div>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-surface-2 border border-line/10 text-muted overflow-hidden">
                {club.cachet ? <img src={club.cachet} alt="cachet" className="h-full w-full object-contain p-1" /> : <Stamp className="h-9 w-9" />}
              </div>
              <label className="btn-ghost cursor-pointer">
                <Upload className="h-4 w-4" />{uploadingCachet ? 'Envoi…' : 'Cachet du club'}
                <input type="file" accept="image/*" className="hidden" onChange={onCachet} disabled={uploadingCachet} />
              </label>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('common.name')} value={club.name} onChange={(e) => setClub({ ...club, name: e.target.value })} />
            <Input label={t('common.email')} value={club.email} onChange={(e) => setClub({ ...club, email: e.target.value })} />
            <Input label={t('common.phone')} value={club.phone} onChange={(e) => setClub({ ...club, phone: e.target.value })} />
            <Input label={t('common.address')} value={club.address} onChange={(e) => setClub({ ...club, address: e.target.value })} />
            <div className="sm:col-span-2"><Textarea label={t('common.description')} value={club.description} onChange={(e) => setClub({ ...club, description: e.target.value })} /></div>
            <Input label="NIF" value={club.nif} onChange={(e) => setClub({ ...club, nif: e.target.value })} />
            <Input label="NIS" value={club.nis} onChange={(e) => setClub({ ...club, nis: e.target.value })} />
            <Input label="Article" value={club.article} onChange={(e) => setClub({ ...club, article: e.target.value })} />
            <Input label="RC" value={club.rc} onChange={(e) => setClub({ ...club, rc: e.target.value })} />
          </div>
          <button onClick={saveClub} className="btn-primary mt-5"><Save className="h-4 w-4" />{t('common.save')}</button>
        </div>
      )}

      {tab === 'account' && (
        <div className="card p-6 max-w-xl">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('common.name')} value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
            <Input label={t('auth.username')} value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} />
            <Input label={t('common.email')} type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            <Input label="Nouveau mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" />
          </div>
          <button onClick={saveAccount} className="btn-primary mt-5" disabled={savingAccount}><Save className="h-4 w-4" />{savingAccount ? '…' : t('common.save')}</button>
          <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Rôle : {user?.role === 'admin' ? 'Administrateur' : 'Employé'} — authentifié via Supabase
          </p>
        </div>
      )}

      {tab === 'database' && (
        <div className="card p-6 max-w-2xl">
          <p className="text-sm text-muted mb-5">
            Les données sont stockées en direct sur Supabase. Téléchargez une copie JSON à tout moment pour vos archives.
            Pour restaurer une sauvegarde ou revenir à un état antérieur, utilisez le tableau de bord Supabase
            (Database → Backups) ou ré-exécutez <code>supabase/schema.sql</code>.
          </p>
          <button onClick={backup} className="card-hover card p-6 flex flex-col items-center gap-3 text-center w-full sm:w-64">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success"><Download className="h-7 w-7" /></span>
            <span className="font-semibold text-fg">{t('settings.backup')}</span><span className="text-xs text-muted">Exporter en JSON</span>
          </button>
        </div>
      )}
    </div>
  );
}

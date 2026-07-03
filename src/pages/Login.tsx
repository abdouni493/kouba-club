import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Moon, Sun, Languages, ArrowRight, Globe, User, AtSign, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const { data } = useData();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ identifier: '', password: '', name: '', username: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const r = await login(form.identifier, form.password);
        if (r.ok) navigate('/app');
        else if (r.error === 'invalid') toast(t('auth.loginError'), 'error');
        else if (r.error === 'inactive') toast('Ce compte employé est désactivé', 'error');
        else toast(r.error || t('auth.loginError'), 'error');
      } else {
        const r = await register({ name: form.name, username: form.username, email: form.email, password: form.password });
        if (r.ok) { toast(t('auth.welcome') + ' ' + form.name, 'success'); navigate('/app'); }
        else if (r.error === 'exists') toast(t('auth.existsError'), 'error');
        else if (r.error === 'confirm_email') toast("Confirmation d'e-mail requise — désactivez-la dans Supabase (Authentication → Providers → Email) pour une connexion immédiate.", 'error');
        else toast(r.error || t('auth.existsError'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchLang = () => i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ backgroundImage: 'linear-gradient(150deg, rgb(var(--accent-strong)) 0%, #0a0a0b 60%)' }}>
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(40rem 30rem at 20% 20%, rgb(255 176 32 / 0.4), transparent 60%), radial-gradient(30rem 30rem at 90% 90%, rgb(255 122 0 / 0.35), transparent 60%)' }} />
        <div className="relative z-10 flex items-center gap-3">
          <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur overflow-hidden">
            {data.club.logo ? (
              <img src={data.club.logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Trophy className="h-6 w-6" />
            )}
          </motion.div>
          <span className="font-display text-xl font-extrabold">{data.club.name || 'Orange FC'}</span>
        </div>

        <div className="relative z-10">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15 }}>
              {i === 0 && <h1 className="font-display text-5xl font-extrabold leading-tight">Gérez votre<br /><span className="text-black/80" style={{ WebkitTextStroke: '1px white' }}>club</span> comme un pro.</h1>}
            </motion.div>
          ))}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 text-lg text-white/80 max-w-md">
            {t('auth.tagline')}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 flex flex-wrap gap-3">
            {['Joueurs', 'Abonnements', 'Entraîneurs', 'Caisse', 'Analyse'].map((x) => (
              <span key={x} className="rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-sm font-medium border border-white/20">{x}</span>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 text-white/60 text-sm font-medium tracking-wide">{t('auth.slogan')}</div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col justify-center px-6 sm:px-12 py-10 bg-bg">
        <div className="absolute top-5 right-5 flex gap-2">
          <button onClick={switchLang} className="btn-ghost !px-3 !py-2 gap-2">
            <Languages className="h-4 w-4" /><span className="text-xs font-bold">{i18n.language === 'fr' ? 'العربية' : 'Français'}</span>
          </button>
          <button onClick={toggle} className="btn-icon">{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-grad text-black shadow-glow overflow-hidden">
              {data.club.logo ? (
                <img src={data.club.logo} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-6 w-6" />
              )}
            </div>
            <span className="font-display text-xl font-extrabold">{data.club.name || 'Orange FC'}</span>
          </div>

          <h2 className="font-display text-3xl font-extrabold text-fg">
            {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
          </h2>
          <p className="text-muted mt-1.5">{mode === 'login' ? t('auth.welcome') + ' 👋' : t('auth.tagline')}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <Labeled icon={<User className="h-4 w-4" />} label={t('common.name')}>
                      <input className="input !pl-10" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ahmed Benali" />
                    </Labeled>
                    <Labeled icon={<UserPlus className="h-4 w-4" />} label={t('auth.username')}>
                      <input className="input !pl-10" required value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="ahmed" />
                    </Labeled>
                    <Labeled icon={<AtSign className="h-4 w-4" />} label={t('common.email')}>
                      <input type="email" className="input !pl-10" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ahmed@club.dz" />
                    </Labeled>
                  </>
                )}
                {mode === 'login' && (
                  <Labeled icon={<AtSign className="h-4 w-4" />} label={t('auth.identifier')}>
                    <input className="input !pl-10" required value={form.identifier} onChange={(e) => set('identifier', e.target.value)} placeholder="nom d'utilisateur ou e-mail" />
                  </Labeled>
                )}
                <Labeled icon={<Lock className="h-4 w-4" />} label={t('auth.password')}>
                  <input type="password" className="input !pl-10" required value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
                </Labeled>
              </motion.div>
            </AnimatePresence>

            <button type="submit" className="btn-primary w-full !py-3 group" disabled={submitting}>
              {submitting ? '…' : (mode === 'login' ? t('auth.signIn') : t('auth.register'))}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-faint">
            <div className="h-px flex-1 bg-line/10" /> OU <div className="h-px flex-1 bg-line/10" />
          </div>

          <div className="space-y-3">
            <button onClick={() => navigate('/website')} className="btn-ghost w-full !py-3">
              <Globe className="h-4 w-4" /> {t('auth.viewWebsite')}
            </button>
          </div>

          <p className="text-center text-sm text-muted mt-6">
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-semibold text-accent hover:underline">
              {mode === 'login' ? t('auth.register') : t('auth.signIn')}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Labeled({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint">{icon}</span>
        {children}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Users, LineChart, UserCog, LogOut, Loader2, Menu, X, Trophy, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { cx } from '../../lib/utils';

// Minimal layout used ONLY for user.role === 'doctor' — exactly four sections,
// no admin/worker sidebar (see App.tsx routing).
const LINKS = [
  { to: '/app', end: true, icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/app/players', end: false, icon: Users, label: 'Joueurs' },
  { to: '/app/analyse', end: false, icon: LineChart, label: 'Analyse' },
  { to: '/app/account', end: false, icon: UserCog, label: 'Mon compte' },
];

export default function DoctorLayout() {
  const { t } = useTranslation();
  const { user, loading: authLoading, logout } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="grid h-screen place-items-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const doLogout = async () => { await logout(); navigate('/login'); };

  const sidebar = (
    <div className="flex h-full flex-col bg-[rgb(var(--sidebar))] border-r border-line/10 w-[264px]">
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-line/10">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-grad text-black shadow-glow overflow-hidden">
          {data.club.logo ? <img src={data.club.logo} alt="logo" className="h-full w-full object-cover" /> : <Trophy className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="font-display font-extrabold text-fg leading-none">{data.club.name || 'Club'}</p>
          <p className="text-[11px] text-muted mt-1 flex items-center gap-1"><Stethoscope className="h-3 w-3" />Espace médecin</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="btn-icon lg:hidden"><X className="h-5 w-5" /></button>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cx('sidebar-link group', isActive && 'sidebar-link-active')}>
              {({ isActive }) => (
                <>
                  <Icon className={cx('h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110', isActive && 'text-black')} />
                  <span className="flex-1">{l.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-line/10">
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 mb-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-grad text-black font-bold text-sm">
            {(user.name || 'D').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg truncate">{user.name}</p>
            <p className="text-[11px] text-muted truncate">Médecin</p>
          </div>
        </div>
        <button onClick={doLogout} className="sidebar-link w-full text-danger hover:bg-danger/10 hover:text-danger">
          <LogOut className="h-[18px] w-[18px]" /><span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:block shrink-0">{sidebar}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-[60] lg:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 h-16 px-4 sm:px-6 border-b border-line/10 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="btn-icon"><Menu className="h-5 w-5" /></button>
          <p className="font-display font-bold text-fg">Espace médecin</p>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, X, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAV } from '../../lib/nav';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../lib/permissions';
import { cx } from '../../lib/utils';

const groups: { key: 'management' | 'finance' | 'system'; label: string }[] = [
  { key: 'management', label: 'management' },
  { key: 'finance', label: 'finance' },
  { key: 'system', label: 'system' },
];

export default function Sidebar({ onClose, mobile }: { onClose?: () => void; mobile?: boolean }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { data } = useData();
  const { canView } = usePermissions();
  const navigate = useNavigate();

  const allowed = canView;

  const doLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="flex h-full flex-col bg-[rgb(var(--sidebar))] border-r border-line/10 w-[264px]">
      {/* logo */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-line/10">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-grad text-black shadow-glow overflow-hidden">
          {data.club.logo ? (
            <img src={data.club.logo} alt="logo" className="h-full w-full object-cover" />
          ) : (
            <Trophy className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-display font-extrabold text-fg leading-none">{data.club.name || 'Orange FC'}</p>
          <p className="text-[11px] text-muted mt-1">{t('auth.slogan')}</p>
        </div>
        {mobile && <button onClick={onClose} className="btn-icon"><X className="h-5 w-5" /></button>}
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
        {groups.map((g) => {
          const items = NAV.filter((n) => n.group === g.key && allowed(n.key));
          if (!items.length) return null;
          return (
            <div key={g.key}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-faint">{t(`nav.${g.label}`)}</p>
              <div className="space-y-1">
                {items.map((n) => {
                  const Icon = n.icon;
                  return (
                    <NavLink key={n.key} to={n.path} end={n.path === '/app'} onClick={onClose}
                      className={({ isActive }) => cx('sidebar-link group', isActive && 'sidebar-link-active')}>
                      {({ isActive }) => (
                        <>
                          <Icon className={cx('h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110', isActive && 'text-black')} />
                          <span className="flex-1">{t(`nav.${n.key}`)}</span>
                          {isActive && <motion.span layoutId="side-dot" className="h-1.5 w-1.5 rounded-full bg-black/70" />}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* user + logout */}
      <div className="p-3 border-t border-line/10">
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 mb-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-grad text-black font-bold text-sm">
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg truncate">{user?.name}</p>
            <p className="text-[11px] text-muted truncate">{user?.role === 'admin' ? 'Administrateur' : 'Employé'}</p>
          </div>
        </div>
        <button onClick={doLogout} className="sidebar-link w-full text-danger hover:bg-danger/10 hover:text-danger">
          <LogOut className="h-[18px] w-[18px]" /><span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}

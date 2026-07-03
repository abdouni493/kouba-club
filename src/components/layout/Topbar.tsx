import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Languages, Menu, Bell, ScanLine } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { useScan } from '../scan/ScanCenter';
import { daysUntil } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const { data } = useData();
  const scan = useScan();

  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const expiringPlayers = data.players.filter((p) => {
    if (!p.assignedSubscription) return false;
    const d = daysUntil(p.assignedSubscription.expiryDate);
    return d >= 0 && d <= 7;
  }).map(p => {
    const sub = data.subscriptions.find(s => s.id === p.assignedSubscription?.subscriptionId);
    return {
      ...p,
      subscriptionName: sub ? sub.name : '',
      daysLeft: daysUntil(p.assignedSubscription!.expiryDate)
    };
  });

  const expiringSoon = expiringPlayers.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLang = () => i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');

  return (
    <header className="sticky top-0 z-40 glass border-b border-line/10">
      <div className="flex items-center gap-3 h-16 px-4 sm:px-6">
        <button onClick={onMenu} className="btn-icon lg:hidden"><Menu className="h-5 w-5" /></button>
        <div className="flex-1" />

        <button onClick={scan.open} className="btn-primary !px-3 !py-2 gap-2" title={t('scan.title')}>
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline text-sm font-semibold">{t('scan.button')}</span>
        </button>

        <button onClick={switchLang} className="btn-ghost !px-3 !py-2 gap-2" title="Langue / اللغة">
          <Languages className="h-4 w-4" />
          <span className="text-xs font-bold uppercase">{i18n.language === 'fr' ? 'ع' : 'FR'}</span>
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`btn-icon relative transition-colors ${showNotifications ? 'text-accent bg-surface-3' : ''}`} 
            title={t('players.expiryAlert')}
          >
            <Bell className="h-5 w-5" />
            {expiringSoon > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white animate-pulse">
                {expiringSoon}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface-2 border border-line/10 shadow-card z-50 p-4 max-h-[350px] overflow-y-auto backdrop-blur-md"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-line/5">
                  <span className="font-display font-bold text-sm text-fg flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-accent" />
                    {i18n.language === 'ar' ? 'الإشعارات' : 'Notifications'}
                  </span>
                  <span className="text-[10px] font-extrabold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                    {expiringSoon} {i18n.language === 'ar' ? 'تنبيهات' : 'alertes'}
                  </span>
                </div>

                {expiringPlayers.length > 0 ? (
                  <div className="space-y-2">
                    {expiringPlayers.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-surface-3/50 border border-line/5 flex flex-col gap-1 hover:bg-surface-3/95 transition-all duration-200">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-xs text-fg">{p.firstName} {p.lastName}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0 ${p.daysLeft === 0 ? 'bg-danger/20 text-danger border border-danger/30' : 'bg-warning/20 text-warning border border-warning/30'}`}>
                            {p.daysLeft === 0 
                              ? (i18n.language === 'ar' ? 'منتهي' : 'Expiré') 
                              : (i18n.language === 'ar' ? `${p.daysLeft} أيام متبقية` : `${p.daysLeft}j restant${p.daysLeft > 1 ? 's' : ''}`)}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted truncate">{p.subscriptionName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-muted font-medium">
                    {i18n.language === 'ar' ? 'لا توجد تنبيهات انتهاء الصلاحية' : "Aucune alerte d'expiration"}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={toggle} className="btn-icon relative overflow-hidden" title="Theme">
          <motion.span key={theme} initial={{ y: 20, opacity: 0, rotate: -90 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </motion.span>
        </button>
      </div>
    </header>
  );
}

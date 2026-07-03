import { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../lib/permissions';
import { NAV } from '../../lib/nav';
import { ScanProvider } from '../scan/ScanCenter';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useData();
  const { canView } = usePermissions();

  if (authLoading) {
    return (
      <div className="grid h-screen place-items-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Block direct URL access to a page the admin hasn't granted this worker
  // (the sidebar already hides the link — this guards manual navigation too).
  const pageKey = NAV.find((n) => n.path === location.pathname)?.key;
  if (!dataLoading && pageKey && !canView(pageKey)) return <Navigate to="/app" replace />;

  return (
    <ScanProvider>
    <div className="flex h-screen overflow-hidden">
      {/* desktop sidebar */}
      <aside className="hidden lg:block shrink-0"><Sidebar /></aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-[60] lg:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
              <Sidebar mobile onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setMobileOpen(true)} />
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
    </ScanProvider>
  );
}

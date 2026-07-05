import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DoctorLayout from './components/layout/DoctorLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Planificateur from './pages/Planificateur';
import Subscriptions from './pages/Subscriptions';
import Players from './pages/Players';
import Presence from './pages/Presence';
import Parents from './pages/Parents';
import Trainers from './pages/Trainers';
import Workers from './pages/Workers';
import Doctors from './pages/Doctors';
import Matches from './pages/Matches';
import Expenses from './pages/Expenses';
import Caisse from './pages/Caisse';
import Analyse from './pages/Analyse';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DoctorHome from './pages/doctor/DoctorHome';
import DoctorPlayers from './pages/doctor/DoctorPlayers';
import DoctorAnalyse from './pages/doctor/DoctorAnalyse';
import DoctorAccount from './pages/doctor/DoctorAccount';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();

  // Doctors get their own minimal, restricted experience — they never see the
  // admin/worker sidebar or routes (see DoctorLayout).
  if (user?.role === 'doctor') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<DoctorLayout />}>
          <Route index element={<DoctorHome />} />
          <Route path="players" element={<DoctorPlayers />} />
          <Route path="analyse" element={<DoctorAnalyse />} />
          <Route path="account" element={<DoctorAccount />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="planificateur" element={<Planificateur />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="players" element={<Players />} />
        <Route path="presence" element={<Presence />} />
        <Route path="parents" element={<Parents />} />
        <Route path="trainers" element={<Trainers />} />
        <Route path="workers" element={<Workers />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="matches" element={<Matches />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="caisse" element={<Caisse />} />
        <Route path="analyse" element={<Analyse />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

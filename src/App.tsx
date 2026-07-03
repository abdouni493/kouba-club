import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import PublicWebsite from './pages/PublicWebsite';
import Dashboard from './pages/Dashboard';
import Planificateur from './pages/Planificateur';
import Subscriptions from './pages/Subscriptions';
import Players from './pages/Players';
import Parents from './pages/Parents';
import Trainers from './pages/Trainers';
import WebsiteManagement from './pages/WebsiteManagement';
import Workers from './pages/Workers';
import Expenses from './pages/Expenses';
import Caisse from './pages/Caisse';
import Analyse from './pages/Analyse';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/website" element={<PublicWebsite />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="planificateur" element={<Planificateur />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="players" element={<Players />} />
        <Route path="parents" element={<Parents />} />
        <Route path="trainers" element={<Trainers />} />
        <Route path="website" element={<WebsiteManagement />} />
        <Route path="workers" element={<Workers />} />
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

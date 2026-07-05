import { useTranslation } from 'react-i18next';
import { Users, Dumbbell, Ticket, TrendingUp, AlertTriangle, CircleDollarSign, Wallet, Clock, Shield, Flag, MapPin } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader, StatCard, Badge, Avatar } from '../components/ui/Display';
import { ChartCard, CHART, tooltipStyle } from '../components/ui/Charts';
import { useData } from '../context/DataContext';
import { useLookups } from '../lib/selectors';
import { money, fmtDate, daysUntil } from '../lib/utils';
import { insuranceStatus } from '../lib/insurance';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil'];

export default function Dashboard() {
  const { t } = useTranslation();
  const { data } = useData();
  const L = useLookups();

  const revenueData = MONTHS.map((m, i) => ({
    m, revenue: 40000 + i * 12000 + (i % 2) * 8000, expenses: 25000 + i * 6000,
  }));
  revenueData[revenueData.length - 1].revenue = L.totalRevenue || revenueData[revenueData.length - 1].revenue;
  revenueData[revenueData.length - 1].expenses = L.totalExpenses || revenueData[revenueData.length - 1].expenses;

  const byCategory = data.categories.map((c) => ({
    name: c.name,
    value: data.players.filter((p) => p.assignedSubscription && L.tm[p.assignedSubscription.timingId]?.categoryId === c.id).length,
  })).filter((x) => x.value > 0);

  const paidCount = data.players.filter((p) => p.assignedSubscription?.status === 'payed').length;
  const debtCount = data.players.filter((p) => p.assignedSubscription?.status === 'debt').length;
  const noSub = data.players.filter((p) => !p.assignedSubscription).length;
  const payStatus = [
    { name: 'Payé', value: paidCount, color: CHART.green },
    { name: 'Créance', value: debtCount, color: CHART.accent },
    { name: 'Sans abo.', value: noSub, color: CHART.tick },
  ];

  const recentPayments = data.players.flatMap((p) => p.payments.map((pay) => ({ ...pay, player: p })))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  // Insurance alerts: players with no / expired / soon-expiring insurance.
  const insuranceAlerts = data.players
    .map((p) => ({ player: p, ins: insuranceStatus(p) }))
    .filter(({ ins }) => ins.status !== 'valid');

  // Matches in the next 7 days.
  const upcomingMatches = data.matches
    .filter((m) => { const d = daysUntil(m.matchDate); return d >= 0 && d <= 7; })
    .sort((a, b) => a.matchDate.localeCompare(b.matchDate));

  return (
    <div>
      <PageHeader title={t('dash.title')} subtitle={t('dash.overview')} icon={<TrendingUp className="h-5 w-5" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('dash.players')} value={data.players.length} icon={<Users className="h-5 w-5" />} sub={`${L.activeSubs} ${t('players.active').toLowerCase()}`} delay={0} />
        <StatCard label={t('dash.trainers')} value={data.trainers.length} icon={<Dumbbell className="h-5 w-5" />} tone="info" delay={0.05} />
        <StatCard label={t('dash.activeSubs')} value={L.activeSubs} icon={<Ticket className="h-5 w-5" />} tone="warning" delay={0.1} />
        <StatCard label={t('dash.revenue')} value={money(L.totalRevenue)} icon={<CircleDollarSign className="h-5 w-5" />} tone="success" delay={0.15} />
        <StatCard label={t('dash.cashBalance')} value={money(L.cashBalance)} icon={<Wallet className="h-5 w-5" />} delay={0.2} />
        <StatCard label={t('dash.debts')} value={money(L.totalDebt)} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" delay={0.25} />
        <StatCard label={t('expenses.title')} value={money(L.totalExpenses)} icon={<TrendingUp className="h-5 w-5" />} tone="muted" delay={0.3} />
        <StatCard label={t('dash.expiring')} value={L.expiringSoon.length} icon={<Clock className="h-5 w-5" />} tone="danger" delay={0.35} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title={t('dash.revenueVsExpenses')} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.tick} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CHART.tick} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="m" tick={{ fill: CHART.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART.tick, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip {...tooltipStyle} formatter={(v) => money(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" name="Revenus" stroke={CHART.accent} strokeWidth={3} fill="url(#gRev)" />
              <Area type="monotone" dataKey="expenses" name="Dépenses" stroke={CHART.tick} strokeWidth={2} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dash.paymentStatus')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={payStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {payStatus.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title={t('dash.playersByCategory')}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCategory} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART.tick, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,122,0,0.08)' }} />
              <Bar dataKey="value" name="Joueurs" radius={[8, 8, 0, 0]}>
                {byCategory.map((_, i) => <Cell key={i} fill={CHART.series[i % CHART.series.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dash.recentPayments')} className="lg:col-span-2">
          <div className="divide-y divide-line/10">
            {recentPayments.length === 0 && <p className="text-sm text-muted py-6 text-center">{t('common.noData')}</p>}
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={L.playerName(p.player)} id={p.player.id} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{L.playerName(p.player)}</p>
                  <p className="text-xs text-muted">{p.note} · {fmtDate(p.date)}</p>
                </div>
                <span className="font-bold text-success text-sm">+{money(p.amount)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {L.expiringSoon.length > 0 && (
        <div className="card p-5 mt-4 border-danger/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <h3 className="font-display font-bold text-fg">{t('dash.expiring')}</h3>
            <Badge tone="danger">{L.expiringSoon.length}</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {L.expiringSoon.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <Avatar name={L.playerName(p)} id={p.id} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{L.playerName(p)}</p>
                  <p className="text-xs text-muted">{t('players.expiry')}: {fmtDate(p.assignedSubscription!.expiryDate)}</p>
                </div>
                <Badge tone="danger">{daysUntil(p.assignedSubscription!.expiryDate)}j</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <div className="card p-5 mt-4 border-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="h-5 w-5 text-accent" />
            <h3 className="font-display font-bold text-fg">Matchs à venir (7 jours)</h3>
            <Badge tone="accent">{upcomingMatches.length}</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingMatches.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent shrink-0"><Flag className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">vs {m.opponent || 'Adversaire'}</p>
                  <p className="text-xs text-muted flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />{L.stName(m.stadiumId)} · {L.catName(m.categoryId)}
                  </p>
                </div>
                <Badge tone={daysUntil(m.matchDate) === 0 ? 'danger' : 'accent'}>
                  {daysUntil(m.matchDate) === 0 ? 'Aujourd\'hui' : fmtDate(m.matchDate)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {insuranceAlerts.length > 0 && (
        <div className="card p-5 mt-4 border-warning/30">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-warning" />
            <h3 className="font-display font-bold text-fg">Alertes assurance</h3>
            <Badge tone="warning">{insuranceAlerts.length}</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insuranceAlerts.map(({ player: p, ins }) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <Avatar name={L.playerName(p)} id={p.id} size={38} src={p.photoUrl || undefined} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{L.playerName(p)}</p>
                  <p className="text-xs text-muted truncate">
                    {ins.status === 'none' ? 'Aucune assurance' : ins.status === 'expired' ? `Expirée le ${fmtDate(ins.current!.endDate)}` : `Expire le ${fmtDate(ins.current!.endDate)}`}
                  </p>
                </div>
                <Badge tone={ins.status === 'soon' ? 'warning' : 'danger'}>
                  {ins.status === 'none' ? 'Sans' : ins.status === 'expired' ? 'Expirée' : `${ins.days}j`}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

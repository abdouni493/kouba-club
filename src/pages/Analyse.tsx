import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { LineChart as LineIcon, Sparkles, Users, CircleDollarSign, Ticket, TrendingUp } from 'lucide-react';
import { PageHeader, StatCard, EmptyState } from '../components/ui/Display';
import { ChartCard, CurveChart, CHART, tooltipStyle } from '../components/ui/Charts';
import { Input, Select } from '../components/ui/Fields';
import { useData } from '../context/DataContext';
import { useLookups } from '../lib/selectors';
import { money } from '../lib/utils';

export default function Analyse() {
  const { t } = useTranslation();
  const { data } = useData();
  const L = useLookups();

  const [from, setFrom] = useState(dayjs().subtract(90, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [group, setGroup] = useState('');
  const [trainer, setTrainer] = useState('');
  const [result, setResult] = useState<null | ReturnType<typeof compute>>(null);

  function compute() {
    const inR = (d: string) => d >= from && d <= to;
    let players = data.players.filter((p) => inR(p.createdAt));
    if (group) players = players.filter((p) => p.assignedSubscription && L.tm[p.assignedSubscription.timingId]?.groupId === group);
    if (trainer) players = players.filter((p) => p.assignedSubscription && L.tm[p.assignedSubscription.timingId]?.trainerId === trainer);

    const payments = data.players.flatMap((p) => p.payments).filter((pay) => inR(pay.date));
    const revenue = payments.reduce((s, p) => s + p.amount, 0);

    // players by group
    const byGroup = data.groups.map((g) => ({
      name: g.name,
      joueurs: data.players.filter((p) => p.assignedSubscription && L.tm[p.assignedSubscription.timingId]?.groupId === g.id && inR(p.createdAt)).length,
    })).filter((x) => x.joueurs > 0 || !group);

    // players by trainer
    const byTrainer = data.trainers.map((tr) => ({
      name: tr.fullName.split(' ')[0],
      joueurs: L.playersOfTrainer(tr.id).filter((p) => inR(p.createdAt)).length,
    }));

    // registration timeline by week
    const weeks: Record<string, number> = {};
    players.forEach((p) => { const wk = dayjs(p.createdAt).format('DD/MM'); weeks[wk] = (weeks[wk] || 0) + 1; });
    const timeline = Object.entries(weeks).map(([name, v]) => ({ name, inscriptions: v }));

    const payed = players.filter((p) => p.assignedSubscription?.status === 'payed').length;
    const debt = players.filter((p) => p.assignedSubscription?.status === 'debt').length;

    return { players, revenue, byGroup, byTrainer, timeline, payed, debt, count: players.length };
  }

  const generate = () => setResult(compute());

  return (
    <div>
      <PageHeader title={t('analyse.title')} icon={<LineIcon className="h-5 w-5" />} />

      <div className="card p-4 mb-5 flex flex-wrap items-end gap-3">
        <Input label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="min-w-[160px]"><Select label={t('planner.group')} value={group} onChange={setGroup} placeholder={t('common.all')} options={data.groups.map((g) => ({ value: g.id, label: g.name }))} /></div>
        <div className="min-w-[160px]"><Select label={t('planner.trainer')} value={trainer} onChange={setTrainer} placeholder={t('common.all')} options={data.trainers.map((tr) => ({ value: tr.id, label: tr.fullName }))} /></div>
        <button onClick={generate} className="btn-primary"><Sparkles className="h-4 w-4" />{t('analyse.generate')}</button>
      </div>

      {!result ? (
        <EmptyState title={t('analyse.selectPeriod')} icon={<LineIcon className="h-7 w-7" />} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Nouveaux joueurs" value={result.count} icon={<Users className="h-5 w-5" />} />
            <StatCard label={t('dash.revenue')} value={money(result.revenue)} icon={<CircleDollarSign className="h-5 w-5" />} tone="success" />
            <StatCard label={t('common.paid')} value={result.payed} icon={<Ticket className="h-5 w-5" />} tone="info" />
            <StatCard label={t('players.debt')} value={result.debt} icon={<TrendingUp className="h-5 w-5" />} tone="danger" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Joueurs par groupe">
              <CurveChart id="groupe" data={result.byGroup} dataKey="joueurs" name="Joueurs" />
            </ChartCard>

            <ChartCard title="Joueurs par entraîneur">
              <CurveChart id="trainer" data={result.byTrainer} dataKey="joueurs" name="Joueurs" color={CHART.accentSoft} />
            </ChartCard>

            <ChartCard title="Inscriptions sur la période">
              {result.timeline.length ? (
                <CurveChart id="timeline" data={result.timeline} dataKey="inscriptions" name="Inscriptions" />
              ) : <p className="text-sm text-muted py-16 text-center">Aucune inscription sur cette période</p>}
            </ChartCard>

            <ChartCard title={t('dash.paymentStatus')}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[{ name: t('common.paid'), value: result.payed, color: CHART.green }, { name: t('players.debt'), value: result.debt, color: CHART.accent }]}
                    dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    <Cell fill={CHART.green} /><Cell fill={CHART.accent} />
                  </Pie>
                  <Tooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Détails des joueurs analysés">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="text-left text-muted border-b border-line/10">
                  <th className="py-2 font-semibold">Joueur</th><th className="font-semibold">Groupe</th><th className="font-semibold">Entraîneur</th><th className="font-semibold">Abonnement</th><th className="font-semibold text-right">Payé</th>
                </tr></thead>
                <tbody>
                  {result.players.map((p) => (
                    <tr key={p.id} className="border-b border-line/5">
                      <td className="py-2.5 font-medium text-fg">{L.playerName(p)}</td>
                      <td className="text-muted">{p.assignedSubscription ? L.grpName(L.tm[p.assignedSubscription.timingId]?.groupId) : '—'}</td>
                      <td className="text-muted">{p.assignedSubscription ? L.trName(L.tm[p.assignedSubscription.timingId]?.trainerId) : '—'}</td>
                      <td className="text-muted">{p.assignedSubscription ? money(p.assignedSubscription.price) : '—'}</td>
                      <td className="text-right font-semibold text-success">{money(p.payments.reduce((s, x) => s + x.amount, 0))}</td>
                    </tr>
                  ))}
                  {result.players.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted">Aucun joueur</td></tr>}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

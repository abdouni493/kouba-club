import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ClipboardList } from 'lucide-react';
import { ChartCard, CHART, tooltipStyle } from '../ui/Charts';
import { EmptyState } from '../ui/Display';
import { Select } from '../ui/Fields';
import { useData } from '../../context/DataContext';
import { useLookups } from '../../lib/selectors';
import { fmtDate } from '../../lib/utils';

const METRICS = [
  { key: 'speed', label: 'Vitesse', color: CHART.series[0] },
  { key: 'ballControl', label: 'Contrôle', color: CHART.series[1] },
  { key: 'dribbling', label: 'Dribble', color: CHART.series[2] },
  { key: 'passing', label: 'Passes', color: CHART.blue },
  { key: 'fitness', label: 'Physique', color: CHART.green },
  { key: 'discipline', label: 'Discipline', color: CHART.red },
] as const;

/**
 * Player development section: pick a player, see a radar of the latest
 * evaluation plus the progression of the 6 metrics across all evaluations.
 * Used on the Analyse page and (read-only) in the doctor's Analyse view.
 */
export default function EvaluationSection() {
  const { data } = useData();
  const L = useLookups();
  const [playerId, setPlayerId] = useState('');

  const player = data.players.find((p) => p.id === playerId);
  const evals = useMemo(
    () => (player ? [...player.evaluations].sort((a, b) => a.date.localeCompare(b.date)) : []),
    [player],
  );
  const latest = evals.length ? evals[evals.length - 1] : undefined;

  const radarData = latest
    ? METRICS.map((m) => ({ metric: m.label, value: latest[m.key] }))
    : [];

  const timeline = evals.map((ev) => ({
    name: dayjs(ev.date).format('DD/MM/YY'),
    Vitesse: ev.speed, Contrôle: ev.ballControl, Dribble: ev.dribbling,
    Passes: ev.passing, Physique: ev.fitness, Discipline: ev.discipline,
  }));

  const evaluatedPlayers = data.players.filter((p) => p.evaluations.length > 0);

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-fg font-display font-bold">
          <ClipboardList className="h-5 w-5 text-accent" />Développement du joueur
        </div>
        <div className="min-w-[240px] ml-auto">
          <Select value={playerId} onChange={setPlayerId} placeholder="Sélectionner un joueur…"
            options={evaluatedPlayers.map((p) => ({ value: p.id, label: `${L.playerName(p)} (${p.evaluations.length} éval.)` }))} />
        </div>
      </div>

      {!player ? (
        <EmptyState title="Sélectionnez un joueur évalué" hint={evaluatedPlayers.length === 0 ? 'Aucun joueur n\'a encore d\'évaluation — créez-en depuis la page Joueurs.' : undefined} icon={<ClipboardList className="h-7 w-7" />} />
      ) : evals.length === 0 ? (
        <EmptyState title="Aucune évaluation pour ce joueur" icon={<ClipboardList className="h-7 w-7" />} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title={`Profil actuel — ${latest ? fmtDate(latest.date) : ''}`}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={CHART.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: CHART.tick, fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: CHART.tick, fontSize: 10 }} axisLine={false} />
                <Radar name={L.playerName(player)} dataKey="value" stroke={CHART.accent} fill={CHART.accent} fillOpacity={0.35} strokeWidth={2.5} />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Progression dans le temps">
            {timeline.length < 2 ? (
              <p className="text-sm text-muted py-16 text-center">Au moins deux évaluations sont nécessaires pour tracer une progression.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline} margin={{ left: -16, right: 10, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {METRICS.map((m) => (
                    <Line key={m.key} type="monotone" dataKey={m.label} stroke={m.color} strokeWidth={2} dot={{ r: 2.5 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

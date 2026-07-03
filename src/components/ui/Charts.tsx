import type { ReactNode } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export const CHART = {
  accent: '#ff7a00',
  accentSoft: '#ffb020',
  accentStrong: '#ea580c',
  grid: 'rgba(128,128,140,0.15)',
  tick: '#a1a1aa',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#38bdf8',
  series: ['#ff7a00', '#ffb020', '#ea580c', '#f59e0b', '#fb923c', '#facc15'],
};

export function ChartCard({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-fg">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Smooth curve graph (منحنى بياني) — gradient-filled area with a monotone curve. */
export function CurveChart({
  id, data, dataKey, name, color = CHART.accent, height = 260, formatter,
}: {
  id: string;
  data: Array<Record<string, unknown>>;
  dataKey: string;
  name?: string;
  color?: string;
  height?: number;
  formatter?: (value: number) => string;
}) {
  const gid = `curve-${id}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -16, right: 10, top: 8 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.42} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: CHART.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: CHART.tick, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
        <Tooltip {...tooltipStyle} formatter={formatter ? (v) => formatter(Number(v)) : undefined} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={3}
          fill={`url(#${gid})`}
          dot={{ fill: color, stroke: color, r: 3.5 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const tooltipStyle = {
  contentStyle: {
    background: 'rgb(24 24 27)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#fff', fontSize: 12, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.6)',
  },
  labelStyle: { color: '#a1a1aa', fontWeight: 600 },
  itemStyle: { color: '#fff' },
};

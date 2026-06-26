import { useMemo } from 'react';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GlassCard } from './GlassCard';
import { Shield } from 'lucide-react';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-md px-4 py-2.5 shadow-xl">
      <p className="text-[11px] text-gold font-medium">{payload[0].payload?.name}</p>
      <p className="text-xs text-foreground font-semibold">{payload[0].value} players</p>
    </div>
  );
}

function ClassChart({ data = [] }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);

  return (
    <GlassCard glow className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Class Distribution</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">{total} players</span>
      </div>
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 15, left: 0, bottom: 0 }} barCategoryGap="25%">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#b0b0c8' }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={24} name="Players">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export { ClassChart };

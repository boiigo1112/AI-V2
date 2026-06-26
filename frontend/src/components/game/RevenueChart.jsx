import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';
import { GlassCard } from './GlassCard';

const periodData = {
  '7d': [
    { t: 'จ.', v: 8200 }, { t: 'อ.', v: 12500 }, { t: 'พ.', v: 9800 },
    { t: 'พฤ.', v: 15200 }, { t: 'ศ.', v: 11400 }, { t: 'ส.', v: 18600 }, { t: 'อา.', v: 14300 },
  ],
  '30d': [
    { t: 'ส.1', v: 45000 }, { t: 'ส.2', v: 52000 }, { t: 'ส.3', v: 48000 }, { t: 'ส.4', v: 61000 },
  ],
  '90d': [
    { t: 'ม.ค', v: 120000 }, { t: 'ก.พ', v: 145000 }, { t: 'มี.ค', v: 168000 },
  ],
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-md px-4 py-2.5 shadow-xl">
      <p className="text-[11px] text-gold font-medium mb-0.5">{label}</p>
      <p className="text-xs text-foreground font-semibold">฿{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function RevenueChart() {
  const [period, setPeriod] = useState('7d');
  const data = useMemo(() => periodData[period] || periodData['7d'], [period]);
  const total = useMemo(() => data.reduce((s, d) => s + d.v, 0), [data]);
  const prevTotal = period === '7d' ? 78500 : period === '30d' ? 145000 : 433000;
  const change = ((total - prevTotal) / prevTotal * 100).toFixed(1);

  return (
    <GlassCard glow className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                period === p
                  ? 'bg-gold/15 text-gold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl font-bold text-foreground">฿{total.toLocaleString()}</span>
        <span className={`text-xs font-semibold ${Number(change) >= 0 ? 'text-success' : 'text-danger'}`}>
          {Number(change) >= 0 ? '+' : ''}{change}%
        </span>
      </div>

      <div className="flex-1 min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#b0b0c8' }} />
            <YAxis hide />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="v" stroke="#c9a84c" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export { RevenueChart };

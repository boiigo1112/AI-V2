import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Coins } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { GlassCard } from './GlassCard';

const periodData = {
  '24h': [
    { t: '00', v: 1200 }, { t: '04', v: 800 }, { t: '08', v: 2400 },
    { t: '12', v: 3800 }, { t: '16', v: 4200 }, { t: '20', v: 3100 },
  ],
  '7d': [
    { t: 'จ.', v: 8200 }, { t: 'อ.', v: 12500 }, { t: 'พ.', v: 9800 },
    { t: 'พฤ.', v: 15200 }, { t: 'ศ.', v: 11400 }, { t: 'ส.', v: 18600 }, { t: 'อา.', v: 14300 },
  ],
  '30d': [
    { t: 'W1', v: 45000 }, { t: 'W2', v: 52000 }, { t: 'W3', v: 48000 }, { t: 'W4', v: 61000 },
  ],
};

const trendMap = { '24h': 8.3, '7d': 12.5, '30d': 15.2 };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-md px-4 py-2.5 shadow-xl">
      <p className="text-[11px] text-gold font-medium mb-0.5">{label}</p>
      <p className="text-xs text-foreground font-semibold">฿{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function HeroRevenue() {
  const [period, setPeriod] = useState('7d');

  const data = useMemo(() => periodData[period] || periodData['7d'], [period]);
  const trend = trendMap[period] || 0;
  const totalRevenue = useMemo(() => data.reduce((s, d) => s + d.v, 0), [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard glow glowColor="rgba(201,168,76,0.08)" className="overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Revenue info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-gold" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Revenue</span>
              </div>
              <div className="flex items-end gap-3 mb-2">
                <h2 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                  ฿<AnimatedCounter value={totalRevenue} duration={1200} />
                </h2>
                <div className={`flex items-center gap-1 text-sm font-semibold mb-1.5 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                  {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {trend >= 0 ? '+' : ''}{trend}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {period === '24h' ? 'ชั่วโมงนี้' : period === '7d' ? 'สัปดาห์นี้' : 'เดือนนี้'} · เปรียบเทียบกับ period ก่อนหน้า
              </p>
            </div>

            {/* Right: Period selector */}
            <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
              {['24h', '7d', '30d'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    period === p
                      ? 'bg-gold text-[#08080e] shadow-lg shadow-gold/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                  }`}
                >
                  {p === '24h' ? '24h' : p === '7d' ? '7 วัน' : '30 วัน'}
                </button>
              ))}
            </div>
          </div>

          {/* Mini Chart */}
          <div className="h-[120px] mt-6 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#b0b0c8' }} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#c9a84c"
                  strokeWidth={2.5}
                  fill="url(#heroGoldGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#c9a84c', stroke: '#08080e', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export { HeroRevenue };

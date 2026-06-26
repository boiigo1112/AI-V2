import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function QuickStatItem({ icon: Icon, label, value, suffix, color, trend, delay }) {
  const trendConfig = trend > 0
    ? { icon: TrendingUp, color: '#34d399', text: `+${trend}%` }
    : trend < 0
    ? { icon: TrendingDown, color: '#f87171', text: `${trend}%` }
    : trend === 0
    ? { icon: Minus, color: '#6b7280', text: '0%' }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 transition-all duration-200 hover:bg-white/[0.05] hover:border-white/[0.1] group"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: `${color}12` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-foreground">
            <AnimatedCounter value={value} suffix={suffix} duration={1000} />
          </p>
          {trendConfig && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: trendConfig.color }}>
              <trendConfig.icon className="w-2.5 h-2.5" />
              {trendConfig.text}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function QuickStatsRow({ stats = [] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <QuickStatItem key={stat.label} {...stat} delay={0.15 + i * 0.06} />
      ))}
    </div>
  );
}

export { QuickStatsRow };

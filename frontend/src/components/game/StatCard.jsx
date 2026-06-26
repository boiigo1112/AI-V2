import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function StatCard({ icon: Icon, label, value, suffix, color = '#c9a84c', trend, delay = 0, className }) {
  const trendConfig = trend > 0
    ? { icon: TrendingUp, color: '#34d399', text: `+${trend}%` }
    : trend < 0
    ? { icon: TrendingDown, color: '#f87171', text: `${trend}%` }
    : trend === 0
    ? { icon: Minus, color: '#6b7280', text: '0%' }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative backdrop-blur-xl bg-white/[0.04] rounded-2xl border border-white/[0.06] p-5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1]',
        className
      )}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `0 0 30px ${color}15` }}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {trendConfig && (
            <div className="flex items-center gap-1 text-xs font-medium" style={{ color: trendConfig.color }}>
              <trendConfig.icon className="w-3 h-3" />
              {trendConfig.text}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">
          <AnimatedCounter value={value} suffix={suffix} />
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
      </div>
    </motion.div>
  );
}

export { StatCard };

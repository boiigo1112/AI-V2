import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { UserPlus, Swords, ShoppingCart, Shield, Trophy, Zap, ChevronRight, Activity } from 'lucide-react';

const typeConfig = {
  join: { icon: UserPlus, color: '#34d399' },
  kill: { icon: Swords, color: '#f87171' },
  purchase: { icon: ShoppingCart, color: '#fbbf24' },
  guild: { icon: Shield, color: '#818cf8' },
  achievement: { icon: Trophy, color: '#c9a84c' },
  levelup: { icon: Zap, color: '#3b82f6' },
};

function ActivityItem({ item, index }) {
  const config = typeConfig[item.type] || typeConfig.join;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
    >
      <div
        className="size-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${config.color}12` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          <span className="font-medium">{item.player}</span>
          <span className="text-muted-foreground mx-1">{item.action}</span>
          {item.target && <span className="font-medium text-gold">{item.target}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground">{item.time}</p>
      </div>
    </motion.div>
  );
}

function ActivityFeed({ items = [], maxItems = 8, title = 'กิจกรรมล่าสุด', showHeader = true }) {
  return (
    <GlassCard glow className="h-full flex flex-col">
      <div className="p-4 pb-0">
        {showHeader && (
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gold font-semibold px-2 py-0.5 rounded-full bg-gold/10">LIVE</span>
              {items.length > maxItems && (
                <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                  ดูทั้งหมด <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-0.5 max-h-[320px]">
        {items.slice(0, maxItems).map((item, i) => (
          <ActivityItem key={i} item={item} index={i} />
        ))}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="w-8 mb-2 opacity-30" />
            <p className="text-sm">ยังไม่มีกิจกรรม</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export { ActivityFeed };

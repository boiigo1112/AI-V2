import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Crown, Medal, Award, ChevronRight } from 'lucide-react';

const rankIcons = [Crown, Medal, Award];
const rankColors = ['#c9a84c', '#94a3b8', '#cd7f32'];

function LeaderboardItem({ player, rank, index, onClick }) {
  const Icon = rankIcons[Math.min(rank - 1, 2)] || Crown;
  const color = rankColors[Math.min(rank - 1, 2)] || '#c9a84c';

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={onClick}
      className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
    >
      <div className="flex items-center justify-center w-6">
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div
        className="size-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
        <p className="text-[10px] text-muted-foreground">{player.className} · Lv.{player.level}</p>
      </div>
      <div className="text-right flex items-center gap-1">
        <p className="text-sm font-bold text-gold">{player.power?.toLocaleString()}</p>
        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
}

function Leaderboard({ players = [], maxItems = 5, title = 'Top Players', onPlayerClick }) {
  return (
    <GlassCard glow className="h-full flex flex-col">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-[10px] text-muted-foreground">Power Ranking</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-0.5">
        {players.slice(0, maxItems).map((player, i) => (
          <LeaderboardItem
            key={i}
            player={player}
            rank={i + 1}
            index={i}
            onClick={() => onPlayerClick?.(player)}
          />
        ))}
        {players.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Crown className="w-8 mb-2 opacity-30" />
            <p className="text-sm">ยังไม่มีข้อมูล</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export { Leaderboard };

import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserCheck, Gamepad2, Coins, Wallet, GraduationCap, Loader2, Trophy } from 'lucide-react';
import { useCharacterStats, useOnlineMapStats, useBanManagerStats, usePKRanking, useGameStats, useTopPoints, useTopMoney } from '@/hooks/use-game';
import { ServerStatusBar } from '@/components/game/ServerStatusBar';
import { HeroRevenue } from '@/components/game/HeroRevenue';
import { QuickStatsRow } from '@/components/game/QuickStatsRow';
import { ClassChart } from '@/components/game/ClassChart';
import { RevenueChart } from '@/components/game/RevenueChart';
import { Leaderboard } from '@/components/game/Leaderboard';
import { GlassCard } from '@/components/game/GlassCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { schoolNames } from '@/lib/ran-online';
import { getClassName } from '@/lib/ran-online';

const classConfig = [
  { key: 'fighter_male', name: 'Fighter Male', color: '#818cf8' },
  { key: 'knight_male', name: 'Knight Male', color: '#3b82f6' },
  { key: 'archer_female', name: 'Archer Female', color: '#34d399' },
  { key: 'spirit_female', name: 'Spirit Female', color: '#c9a84c' },
  { key: 'extreme_male', name: 'Extreme Male', color: '#f87171' },
  { key: 'extreme_female', name: 'Extreme Female', color: '#a78bfa' },
  { key: 'fighter_female', name: 'Fighter Female', color: '#f472b6' },
  { key: 'knight_female', name: 'Knight Female', color: '#fb923c' },
  { key: 'archer_male', name: 'Archer Male', color: '#e11d48' },
  { key: 'spirit_male', name: 'Spirit Male', color: '#6b7280' },
  { key: 'scientist_male', name: 'Scientist Male', color: '#06b6d4' },
  { key: 'scientist_female', name: 'Scientist Female', color: '#f59e0b' },
  { key: 'assassin_male', name: 'Assassin Male', color: '#8b5cf6' },
  { key: 'assassin_female', name: 'Assassin Female', color: '#ec4899' },
  { key: 'magician_male', name: 'Magician Male', color: '#14b8a6' },
  { key: 'magician_female', name: 'Magician Female', color: '#f97316' },
];

const fmt = (v) => v == null ? '—' : Number(v).toLocaleString();

const LIMIT = 10;

function Dashboard() {
  const navigate = useNavigate();
  const { data: charStats } = useCharacterStats();
  const { data: onlineStats } = useOnlineMapStats();
  const { data: banStats } = useBanManagerStats();
  const { data: pkData } = usePKRanking({ limit: 5, offset: 0 });
  const { data: gameStats } = useGameStats();

  const { data: topPointsData, refetch: refetchTopPoints, isFetching: pointsLoading } = useTopPoints(LIMIT);
  const { data: topMoneyData, refetch: refetchTopMoney, isFetching: moneyLoading } = useTopMoney(LIMIT);

  const [rankingOpen, setRankingOpen] = useState(null);

  const handleRankingOpen = useCallback(async (type) => {
    setRankingOpen(type);
    if (type === 'points') await refetchTopPoints();
    else await refetchTopMoney();
  }, [refetchTopPoints, refetchTopMoney]);

  const quickStats = useMemo(() => [
    { icon: Users, label: 'Total Characters', value: charStats?.total || 0, color: '#818cf8', trend: null },
    { icon: UserCheck, label: 'Online Now', value: onlineStats?.online || 0, color: '#34d399', trend: null },
    { icon: Gamepad2, label: 'Bans', value: banStats?.total || 0, color: '#f87171', trend: null },
  ], [charStats, onlineStats, banStats]);

  const classData = useMemo(() =>
    classConfig.map(c => ({
      name: c.name,
      count: charStats?.[c.key] || 0,
      color: c.color,
    })),
  [charStats]);

  const topPKPlayers = useMemo(() => (pkData?.ranking || []).slice(0, 5).map(p => ({
    name: p.ChaName || 'Unknown',
    className: p.ChaClass,
    level: p.ChaLevel,
    power: p.ChaPK || 0,
  })), [pkData]);

  const handlePlayerClick = (player) => {
    navigate(`/game/characters?search=${encodeURIComponent(player.name)}`);
  };

  const schoolsList = gameStats?.schools || [];
  const totalSchoolChars = schoolsList.reduce((s, sc) => s + (sc.count || 0), 0);

  const rankingData = rankingOpen === 'points' ? topPointsData : topMoneyData;
  const rankingLoading = rankingOpen === 'points' ? pointsLoading : moneyLoading;

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">
      <ServerStatusBar online={onlineStats?.online || 0} />
      <HeroRevenue />
      <QuickStatsRow stats={quickStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <button onClick={() => handleRankingOpen('points')} className="text-left transition-all hover:opacity-80">
          <GlassCard className="p-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center"><Coins className="w-4.5 h-4.5 text-gold" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">💰 Total Points</p>
                <p className="text-xl font-bold text-foreground">{fmt(gameStats?.total_points)}</p></div>
              <Trophy className="w-4 h-4 text-gold/40 ml-auto" />
            </div>
          </GlassCard>
        </button>
        <button onClick={() => handleRankingOpen('money')} className="text-left transition-all hover:opacity-80">
          <GlassCard className="p-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-success/12 flex items-center justify-center"><Wallet className="w-4.5 h-4.5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">💰 Total Game Money</p>
                <p className="text-xl font-bold text-foreground">{fmt(gameStats?.total_money)}</p></div>
              <Trophy className="w-4 h-4 text-success/40 ml-auto" />
            </div>
          </GlassCard>
        </button>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center"><GraduationCap className="w-4.5 h-4.5 text-blue" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">📊 Total Characters</p>
              <p className="text-xl font-bold text-foreground">{fmt(charStats?.total)}</p></div>
          </div>
        </GlassCard>
      </div>

      {schoolsList.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">🏫 Characters by School</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {schoolsList.map(s => (
              <div key={s.school} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{schoolNames[s.school] || `School ${s.school}`}</p>
                  <p className="text-[10px] text-muted-foreground">{s.count} ตัวละคร</p>
                </div>
                <span className="text-sm font-bold text-gold">{s.count}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 flex flex-col gap-5">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <ClassChart data={classData} />
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }} className="lg:col-span-2">
          <Leaderboard title="🏆 PK Ranking" players={topPKPlayers} maxItems={5} onPlayerClick={handlePlayerClick} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
        <RevenueChart />
      </motion.div>

      {/* Ranking Dialog */}
      <Dialog open={!!rankingOpen} onOpenChange={() => setRankingOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{rankingOpen === 'points' ? '💰 Top Points' : '💰 Top Money'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {rankingLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
            ) : rankingOpen === 'points' ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2 w-8">#</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2">User</th>
                    <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2">Points</th>
                    <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {(topPointsData?.players || []).map((p, i) => (
                    <tr key={p.UserNum || i} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-2.5 text-xs font-medium text-foreground">{p.UserID}</td>
                      <td className="px-2 py-2.5 text-xs text-right font-semibold text-gold">{fmt(p.UserPoint)}</td>
                      <td className="px-2 py-2.5 text-xs text-right text-muted-foreground">{p.LastLoginDate ? new Date(p.LastLoginDate).toLocaleDateString('th-TH') : '—'}</td>
                    </tr>
                  ))}
                  {(!topPointsData?.players || topPointsData.players.length === 0) && (
                    <tr><td colSpan={4} className="text-center py-8 text-xs text-muted-foreground">ไม่มีข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2 w-8">#</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2">Character</th>
                    <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2">Class</th>
                    <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2">Money</th>
                    <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {(topMoneyData?.characters || []).map((c, i) => (
                    <tr key={c.ChaNum || i} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-2.5 text-xs font-medium text-foreground">{c.ChaName}</td>
                      <td className="px-2 py-2.5 text-xs text-center text-muted-foreground">{getClassName(c.ChaClass)}</td>
                      <td className="px-2 py-2.5 text-xs text-right font-semibold text-gold">{fmt(c.ChaMoney)}</td>
                      <td className="px-2 py-2.5 text-xs text-right text-muted-foreground">{c.UserID || `#${c.UserNum}`}</td>
                    </tr>
                  ))}
                  {(!topMoneyData?.characters || topMoneyData.characters.length === 0) && (
                    <tr><td colSpan={5} className="text-center py-8 text-xs text-muted-foreground">ไม่มีข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Dashboard;

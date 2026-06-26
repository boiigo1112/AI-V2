import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Gamepad2 } from 'lucide-react';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { ServerStatusBar } from '@/components/game/ServerStatusBar';
import { HeroRevenue } from '@/components/game/HeroRevenue';
import { QuickStatsRow } from '@/components/game/QuickStatsRow';
import { ClassChart } from '@/components/game/ClassChart';
import { RevenueChart } from '@/components/game/RevenueChart';
import { ActivityFeed } from '@/components/game/ActivityFeed';
import { Leaderboard } from '@/components/game/Leaderboard';

function Dashboard() {
  const { data: stats } = useDashboardStats('7d');

  const quickStats = useMemo(() => [
    { icon: Users, label: 'Total Players', value: stats?.total_users, color: '#818cf8', trend: 8 },
    { icon: UserCheck, label: 'Active Today', value: stats?.active_users, color: '#34d399', trend: 5 },
    { icon: Gamepad2, label: 'GM Actions', value: 156, color: '#3b82f6', trend: -3 },
  ], [stats]);

  const classData = useMemo(() => [
    { name: 'Buster', count: 145, color: '#818cf8' },
    { name: 'Tempster', count: 128, color: '#3b82f6' },
    { name: 'Engineer', count: 98, color: '#34d399' },
    { name: 'Prowler', count: 87, color: '#c9a84c' },
    { name: 'Force Gunner', count: 72, color: '#f87171' },
    { name: 'Defender', count: 65, color: '#a78bfa' },
  ], []);

  const activityData = useMemo(() => [
    { player: 'Sakura', action: 'ได้ kill Boss', target: 'Dark Dragon', type: 'kill', time: '2 นาทีที่แล้ว' },
    { player: 'Neko', action: 'เข้าร่วมกิลด์', target: 'Shadow Blade', type: 'guild', time: '5 นาทีที่แล้ว' },
    { player: 'Phoenix', action: 'เติมเงิน', target: '2,500 Gold', type: 'purchase', time: '8 นาทีที่แล้ว' },
    { player: 'Storm', action: 'ถึง Level', target: 'Lv.150', type: 'levelup', time: '12 นาทีที่แล้ว' },
    { player: 'Dragon', action: 'ได้ achievement', target: 'First Blood', type: 'achievement', time: '15 นาทีที่แล้ว' },
    { player: 'Blade', action: 'PK Kill', target: 'Shadow Knight', type: 'kill', time: '18 นาทีที่แล้ว' },
    { player: 'Miku', action: 'เข้าร่วมกิลด์', target: 'Dragon Fury', type: 'guild', time: '22 นาทีที่แล้ว' },
    { player: 'Kaze', action: 'เติมเงิน', target: '5,000 Gold', type: 'purchase', time: '25 นาทีที่แล้ว' },
  ], []);

  const topPlayers = useMemo(() => [
    { name: 'Sakura', className: 'Buster', level: 180, power: 245000 },
    { name: 'Phoenix', className: 'Tempster', level: 175, power: 228000 },
    { name: 'Dragon', className: 'Engineer', level: 172, power: 215000 },
    { name: 'Storm', className: 'Prowler', level: 168, power: 198000 },
    { name: 'Blade', className: 'Force Gunner', level: 165, power: 187000 },
  ], []);

  const handlePlayerClick = (player) => {
    console.log('Navigate to player:', player.name);
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">
      {/* Top Bar */}
      <ServerStatusBar online={stats?.active_users || 0} />

      {/* Hero Revenue */}
      <HeroRevenue />

      {/* Quick Stats */}
      <QuickStatsRow stats={quickStats} />

      {/* 2-Column Layout: Charts + Activity | Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left Column: Class Chart + Activity */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <ClassChart data={classData} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <ActivityFeed items={activityData} maxItems={6} />
          </motion.div>
        </div>

        {/* Right Column: Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <Leaderboard players={topPlayers} maxItems={5} onPlayerClick={handlePlayerClick} />
        </motion.div>
      </div>

      {/* Revenue Chart (Full Width) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <RevenueChart />
      </motion.div>
    </div>
  );
}

export default Dashboard;

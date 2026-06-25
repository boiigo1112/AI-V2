import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, UserPlus, Shield, UserCog } from 'lucide-react';
import { useDashboardStats, useUsers } from '../hooks/use-dashboard';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

const icons = {
  total_users: Users,
  active_users: UserCheck,
  new_users: UserPlus,
  total_roles: Shield,
  total_admins: UserCog,
};

const colors = {
  total_users: '#4a4aff',
  active_users: '#22c55e',
  new_users: '#8b5cf6',
  total_roles: '#f59e0b',
  total_admins: '#ef4444',
};

function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const { data: stats, isLoading: statsLoading } = useDashboardStats(timeRange);
  const { data: users = [] } = useUsers();

  const cards = [
    { key: 'total_users', label: 'Total Users', value: stats?.total_users },
    { key: 'active_users', label: 'Active Users', value: stats?.active_users },
    { key: 'new_users', label: 'New Users', value: stats?.new_users },
    { key: 'total_roles', label: 'Roles', value: stats?.total_roles },
    { key: 'total_admins', label: 'Admins', value: stats?.total_admins },
  ];

  const roleData = [
    { name: 'Super Admins', count: users.filter((u) => u.role?.name === 'superadmin').length, fill: '#4a4aff' },
    { name: 'Admins', count: users.filter((u) => u.role?.name === 'admin').length, fill: '#f59e0b' },
    { name: 'Users', count: users.filter((u) => u.role?.name === 'user').length, fill: '#22c55e' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-primary cursor-pointer"
          >
            <option value="24h">24h</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card, i) => {
          const Icon = icons[card.key];
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <Card className="border-l-4 overflow-hidden" style={{ borderLeftColor: colors[card.key] }}>
                <CardContent className="p-5">
                  {statsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="w-5 h-5" style={{ color: colors[card.key] }} />
                        <span className="text-2xl font-bold" style={{ color: colors[card.key] }}>
                          {card.value ?? '—'}
                        </span>
                      </div>
                      <p className="text-sm text-muted">{card.label}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Users by Role</h2>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a5e" />
                    <XAxis dataKey="name" stroke="#8080a0" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#8080a0" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#1a1a3e',
                        border: '1px solid #2a2a5e',
                        borderRadius: 8,
                        color: '#e0e0f0',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={80} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Recent Users</h2>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-muted text-sm">No users yet.</p>
              ) : (
                <div className="space-y-1">
                  {users.slice(0, 5).map((u, i) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-hover transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {(u.full_name || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name || u.username}</p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                      </div>
                      <span className="text-xs bg-primary/15 text-primary px-2.5 py-0.5 rounded-full capitalize font-medium">
                        {u.role?.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;

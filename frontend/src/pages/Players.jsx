import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Users, Search, ChevronLeft, ChevronRight, Eye, Gamepad2 } from 'lucide-react';
import { gameApi } from '../services/game';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

function Players() {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerChars, setPlayerChars] = useState([]);
  const limit = 20;

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gameApi.listUsers({ search, page, limit });
      setPlayers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลผู้เล่นได้');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  const viewPlayer = async (player) => {
    setSelectedPlayer(player);
    try {
      const res = await gameApi.listUserCharacters(player.user_num);
      setPlayerChars(res.data.characters || []);
    } catch {
      setPlayerChars([]);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">จัดการผู้เล่น</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ค้นหา ID หรือชื่อ..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-text outline-none focus:border-primary w-64"
            />
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{selectedPlayer.user_name}</h2>
                <p className="text-sm text-muted">ID: {selectedPlayer.user_id} | UserNum: {selectedPlayer.user_num}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedPlayer(null); setPlayerChars([]); }}>
                ปิด
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div><span className="text-muted">Email:</span> {selectedPlayer.email || '—'}</div>
              <div><span className="text-muted">IP ล่าสุด:</span> {selectedPlayer.last_ip || '—'}</div>
              <div><span className="text-muted">ตัวละคร:</span> {selectedPlayer.char_count}</div>
              <div><span className="text-muted">สมัคร:</span> {selectedPlayer.reg_date ? new Date(selectedPlayer.reg_date).toLocaleDateString() : '—'}</div>
            </div>
            <h3 className="font-medium mb-2">ตัวละคร ({playerChars.length})</h3>
            {playerChars.length > 0 ? (
              <div className="space-y-2">
                {playerChars.map((ch) => (
                  <div key={ch.cha_num} className="flex items-center gap-3 p-2.5 rounded-lg bg-hover/30">
                    <Gamepad2 className="w-4 h-4 text-muted" />
                    <div className="flex-1">
                      <span className="font-medium">{ch.cha_name}</span>
                      <span className="text-xs text-muted ml-2">Lv.{ch.cha_level}</span>
                    </div>
                    <span className="text-xs text-muted">
                      {ch.cha_class === 0 ? 'Fighter' : ch.cha_class === 1 ? 'Gunner' : ch.cha_class === 2 ? 'Healer' : ch.cha_class === 3 ? 'Blader' : `Class ${ch.cha_class}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm">ไม่มีตัวละคร</p>
            )}
          </Card>
        </motion.div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">UserNum</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">UserID</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">UserName</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">Email</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">ตัวละคร</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">เข้าสู่ระบบล่าสุด</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={7} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : players.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-12">ไม่พบข้อมูลผู้เล่น</td></tr>
              ) : (
                players.map((u) => (
                  <tr key={u.user_num} className="border-b border-border hover:bg-hover/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-medium">{u.user_num}</td>
                    <td className="px-4 py-3.5 text-sm">{u.user_id}</td>
                    <td className="px-4 py-3.5 text-sm">{u.user_name}</td>
                    <td className="px-4 py-3.5 text-sm text-muted">{u.email || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">{u.char_count}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Button variant="ghost" size="sm" onClick={() => viewPlayer(u)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted">แสดง {(page - 1) * limit + 1}-{Math.min(page * limit, total)} จาก {total}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">{page}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Players;

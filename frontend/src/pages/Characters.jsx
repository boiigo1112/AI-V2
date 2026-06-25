import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Swords, Search, ChevronLeft, ChevronRight, Edit2, X } from 'lucide-react';
import { gameApi } from '../services/game';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';

const classNames = { 0: 'Fighter', 1: 'Gunner', 2: 'Healer', 3: 'Blader', 4: 'Paladin' };
const schoolNames = { 0: 'None', 1: 'Siena', 2: 'Erench', 3: 'Ruco' };

function formatMoney(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function Characters() {
  const [chars, setChars] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editChar, setEditChar] = useState(null);
  const limit = 20;

  const loadChars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gameApi.listCharacters({ search, page, limit });
      setChars(res.data.characters || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลตัวละครได้');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadChars(); }, [loadChars]);

  const handleUpdateLevel = async (chaNum, level) => {
    try {
      await gameApi.updateLevel(chaNum, level);
      toast.success('อัปเดต Level สำเร็จ');
      setEditChar(null);
      loadChars();
    } catch {
      toast.error('อัปเดตไม่สำเร็จ');
    }
  };

  const handleUpdateMoney = async (chaNum, money) => {
    try {
      await gameApi.updateMoney(chaNum, money);
      toast.success('อัปเดต Money สำเร็จ');
      setEditChar(null);
      loadChars();
    } catch {
      toast.error('อัปเดตไม่สำเร็จ');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">จัดการตัวละคร</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ค้นหาชื่อตัวละคร..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-text outline-none focus:border-primary w-64"
            />
          </div>
        </div>
      </div>

      {editChar && (
        <EditModal
          character={editChar}
          onUpdate={(updates) => {
            if (updates.level !== undefined) handleUpdateLevel(editChar.cha_num, updates.level);
            if (updates.money !== undefined) handleUpdateMoney(editChar.cha_num, updates.money);
          }}
          onClose={() => setEditChar(null)}
        />
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">ChaNum</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">ชื่อตัวละคร</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">Level</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">คลาส</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">โรงเรียน</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">Money</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">Exp</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">Reborn</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5">Status</th>
                <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={10} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : chars.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-muted py-12">ไม่พบข้อมูลตัวละคร</td></tr>
              ) : (
                chars.map((ch) => (
                  <tr key={ch.cha_num} className="border-b border-border hover:bg-hover/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-medium">{ch.cha_num}</td>
                    <td className="px-4 py-3.5 text-sm font-medium">{ch.cha_name}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <span className="bg-primary/15 text-primary px-2 py-0.5 rounded-full text-xs font-medium">Lv.{ch.cha_level}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm">{classNames[ch.cha_class] || `Class ${ch.cha_class}`}</td>
                    <td className="px-4 py-3.5 text-sm">{schoolNames[ch.cha_school] || `School ${ch.cha_school}`}</td>
                    <td className="px-4 py-3.5 text-sm">{formatMoney(ch.cha_money)}</td>
                    <td className="px-4 py-3.5 text-sm">{formatMoney(ch.cha_exp)}</td>
                    <td className="px-4 py-3.5 text-sm">{ch.cha_reborn}</td>
                    <td className="px-4 py-3.5">
                      {ch.cha_deleted ? (
                        <span className="text-xs text-danger font-medium">Deleted</span>
                      ) : ch.cha_online ? (
                        <span className="text-xs text-success font-medium">Online</span>
                      ) : (
                        <span className="text-xs text-muted">Offline</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Button variant="ghost" size="sm" onClick={() => setEditChar(ch)}>
                        <Edit2 className="w-4 h-4" />
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

function EditModal({ character, onUpdate, onClose }) {
  const [level, setLevel] = useState(character.cha_level);
  const [money, setMoney] = useState(character.cha_money);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-card rounded-2xl p-6 shadow-2xl border border-border w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">แก้ไขตัวละคร</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-sm text-muted mb-4">{character.cha_name} (ChaNum: {character.cha_num})</p>
        <div className="space-y-4">
          <Input label="Level" type="number" value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          <Input label="Money" type="number" value={money} onChange={(e) => setMoney(Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => onUpdate({ level, money })}>บันทึก</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Characters;

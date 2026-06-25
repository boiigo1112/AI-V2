import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, ChevronRight, Gamepad2, Ban, Unlock, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGamePlayers, useGamePlayer, useGamePlayerCharacters, useBlockPlayer, useUnblockPlayer, useUpdateCharacter } from '../hooks/use-game';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

const editableFields = [
  { key: 'ChaLevel', label: 'Level' },
  { key: 'ChaMoney', label: 'Money' },
  { key: 'ChaExp', label: 'EXP' },
  { key: 'ChaPower', label: 'Power' },
  { key: 'ChaReborn', label: 'Reborn' },
];

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string' && val.length > 50) return val.substring(0, 50) + '...';
  return String(val);
}

function Players() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [editChar, setEditChar] = useState(null);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const limit = 50;

  const { data: playersData, isLoading } = useGamePlayers({ search, limit, offset });
  const { data: playerDetail } = useGamePlayer(selectedId);
  const { data: characters } = useGamePlayerCharacters(selectedId);
  const blockPlayer = useBlockPlayer();
  const unblockPlayer = useUnblockPlayer();
  const updateChar = useUpdateCharacter();

  const players = playersData?.players || [];
  const total = playersData?.total || 0;

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setOffset(0);
    setSelectedId(null);
  };

  const handleBlock = async (id) => {
    if (!window.confirm('ต้องการบล็อกผู้เล่นนี้?')) return;
    try {
      await blockPlayer.mutateAsync({ id, reason: 'Blocked by admin' });
      toast.success('บล็อกผู้เล่นสำเร็จ');
    } catch (err) {
      toast.error(err.response?.data?.error || 'บล็อกไม่สำเร็จ');
    }
  };

  const handleUnblock = async (id) => {
    try {
      await unblockPlayer.mutateAsync(id);
      toast.success('ปลดบล็อกสำเร็จ');
    } catch (err) {
      toast.error(err.response?.data?.error || 'ปลดบล็อกไม่สำเร็จ');
    }
  };

  const handleEditChar = (char) => {
    setEditChar(char);
    setEditField(editableFields[0].key);
    setEditValue(String(char[editableFields[0].key] || ''));
  };

  const handleSaveChar = async () => {
    if (!editChar) return;
    try {
      await updateChar.mutateAsync({ id: String(editChar.ChaNum), field: editField, value: editValue });
      toast.success('อัปเดตสำเร็จ');
      setEditChar(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'อัปเดตไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">ผู้เล่นเกม</h1>
        </div>
        <span className="text-sm text-muted">{total.toLocaleString()} คน</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1">
          <Input placeholder="ค้นหา UserID, ชื่อผู้ใช้..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Button type="submit"><Search className="w-4 h-4" /></Button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">รายชื่อผู้เล่น</h2></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : players.length === 0 ? (
              <p className="text-muted text-center py-8">ไม่พบผู้เล่น</p>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {players.map((p, i) => (
                  <motion.button key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    onClick={() => setSelectedId(p.UserNum)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedId === p.UserNum ? 'bg-primary/15 text-primary' : 'hover:bg-hover'
                    }`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.UserID || p.UserName || `User #${p.UserNum}`}</p>
                      <p className="text-xs text-muted">ID: {p.UserNum} | {p.Email || 'ไม่มีอีเมล'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
            {total > limit && (
              <div className="flex justify-between mt-4 pt-4 border-t border-border">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>ก่อนหน้า</Button>
                <span className="text-sm text-muted self-center">{offset + 1}-{Math.min(offset + limit, total)} / {total}</span>
                <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>ถัดไป</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedId && playerDetail ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">รายละเอียดผู้เล่น</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleBlock(selectedId)}>
                        <Ban className="w-3.5 h-3.5" /> บล็อก
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleUnblock(selectedId)}>
                        <Unlock className="w-3.5 h-3.5" /> ปลดบล็อก
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(playerDetail).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted">{key}</span>
                        <span className="font-medium">{formatValue(val)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {characters && characters.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">ตัวละคร ({characters.length})</h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {characters.map((ch, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-hover/30 text-sm">
                          <div>
                            <span className="font-medium">{ch.ChaName || `Char #${ch.ChaNum}`}</span>
                            <span className="text-muted ml-2">Lv.{ch.ChaLevel || 0}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-3 text-xs text-muted">
                              {ch.ChaClass && <span>Class: {ch.ChaClass}</span>}
                              {ch.ChaMoney && <span>{Number(ch.ChaMoney).toLocaleString()} G</span>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleEditChar(ch)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ) : (
            <Card className="flex items-center justify-center py-16">
              <p className="text-muted">เลือกผู้เล่นเพื่อดูรายละเอียด</p>
            </Card>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editChar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditChar(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">แก้ไขตัวละคร — {editChar.ChaName}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted mb-1 block">ฟิลด์</label>
                  <select value={editField} onChange={e => { setEditField(e.target.value); setEditValue(String(editChar[e.target.value] || '')); }}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm">
                    {editableFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted mb-1 block">ค่าใหม่</label>
                  <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setEditChar(null)}>ยกเลิก</Button>
                  <Button onClick={handleSaveChar} disabled={updateChar.isPending}>
                    {updateChar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Players;

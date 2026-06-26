import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Ban, Unlock, Pencil, Eye, Gamepad2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGamePlayers, useGamePlayer, useBlockPlayer, useUnblockPlayer } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { CharacterDrawer } from '@/components/game/CharacterDrawer';
import { CharacterEditor } from '@/components/game/CharacterEditor';
import { AccountEditor } from '@/components/game/AccountEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function Players() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [charEditor, setCharEditor] = useState({ open: false, character: null });
  const [accountEditor, setAccountEditor] = useState({ open: false, account: null });
  const [banTarget, setBanTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: playersData, isLoading, refetch } = useGamePlayers({ search, limit, offset });
  const { data: playerDetail, refetch: refetchPlayer } = useGamePlayer(selectedAccount?.UserNum);
  const blockPlayer = useBlockPlayer();
  const unblockPlayer = useUnblockPlayer();

  const players = playersData?.players || [];
  const total = playersData?.total || 0;
  const bannedCount = players.filter(p => p.UserBlock === 1).length;

  const filteredPlayers = useMemo(() => {
    if (statusFilter === 'all') return players;
    if (statusFilter === 'banned') return players.filter(p => p.UserBlock === 1);
    if (statusFilter === 'active') return players.filter(p => p.UserBlock !== 1);
    return players;
  }, [players, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setOffset(0);
  };

  const handleViewCharacters = (player) => {
    setSelectedAccount(player);
    setDrawerOpen(true);
  };

  const handleEditAccount = (player) => {
    setAccountEditor({ open: true, account: player });
  };

  const handleBlock = async () => {
    if (!banTarget) return;
    try {
      await blockPlayer.mutateAsync({ id: banTarget.UserNum, reason: 'Banned by admin' });
      toast.success('บล็อกสำเร็จ');
      setBanTarget(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'บล็อกไม่สำเร็จ');
    }
  };

  const handleUnblock = async (id) => {
    try {
      await unblockPlayer.mutateAsync(id);
      toast.success('ปลดบล็อกสำเร็จ');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ปลดบล็อกไม่สำเร็จ');
    }
  };

  const formatDate = (d) => {
    if (!d || d === '0001-01-01T00:00:00Z') return '—';
    try { return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };
  const fmt = (v) => v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v);

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-blue" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">บัญชีทั้งหมด</p>
              <p className="text-xl font-bold text-foreground"><AnimatedCounter value={total} /></p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center">
              <Gamepad2 className="w-4.5 h-4.5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">ตัวละครทั้งหมด</p>
              <p className="text-xl font-bold text-foreground">
                <AnimatedCounter value={players.reduce((s, p) => s + (parseInt(p.ChaRemain) || 0), 0)} />
              </p>
            </div>
          </div>
        </GlassCard>
        <button
          onClick={() => setStatusFilter(statusFilter === 'banned' ? 'all' : 'banned')}
          className={`text-left transition-all duration-200 ${statusFilter === 'banned' ? 'ring-2 ring-danger/50' : ''}`}
        >
          <GlassCard className={`p-4 h-full ${statusFilter === 'banned' ? 'border-danger/30' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-danger/12 flex items-center justify-center">
                <Ban className="w-4.5 h-4.5 text-danger" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">ถูกบล็อก</p>
                <p className="text-xl font-bold text-danger">
                  <AnimatedCounter value={bannedCount} />
                </p>
              </div>
            </div>
          </GlassCard>
        </button>
      </div>

      {/* Search */}
      <GlassCard className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ค้นหา UserID, ชื่อผู้ใช้..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
          </div>
          <Button type="submit" className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
        </form>
      </GlassCard>

      {/* Filter indicator */}
      {statusFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">กรอง:</span>
          <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <Ban className="w-3 h-3" /> ถูกบล็อก ({bannedCount})
            <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-foreground">×</button>
          </span>
        </div>
      )}

      {/* Account Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">{statusFilter === 'banned' ? 'ไม่มีผู้เล่นที่ถูกบล็อก' : 'ไม่พบผู้เล่น'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">ID</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Username</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Characters</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Cash</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Last Login</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((p, i) => (
                  <motion.tr key={p.UserNum} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.UserNum}</td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.UserID}</p>
                        {p.UserFullName && <p className="text-[10px] text-muted-foreground">{p.UserFullName}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-foreground">{p.ChaRemain ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-semibold text-gold">{fmt(p.UserPoint)}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(p.LastLoginDate)}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={`size-1.5 rounded-full ${p.UserBlock === 1 ? 'bg-danger' : 'bg-success'}`} />
                        <span className="text-xs text-muted-foreground">{p.UserBlock === 1 ? 'บล็อก' : 'ปกติ'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleViewCharacters(p)} title="ดูตัวละคร">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEditAccount(p)} title="แก้ไขบัญชี">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {p.UserBlock === 1 ? (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleUnblock(p.UserNum)} title="ปลดบล็อก">
                            <Unlock className="w-3.5 h-3.5 text-success" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon-sm" onClick={() => setBanTarget(p)} title="บล็อก">
                            <Ban className="w-3.5 h-3.5 text-danger" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {total > limit && (
          <div className="flex justify-between p-4 border-t border-white/[0.05]">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>ก่อนหน้า</Button>
            <span className="text-xs text-muted-foreground self-center">{offset + 1}-{Math.min(offset + limit, total)} / {total}</span>
            <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>ถัดไป</Button>
          </div>
        )}
      </GlassCard>

      {/* Character Drawer */}
      <CharacterDrawer
        account={selectedAccount}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedAccount(null); }}
        onEditChar={(char) => { setCharEditor({ open: true, character: char }); }}
      />

      {/* Character Editor */}
      <CharacterEditor
        character={charEditor.character}
        open={charEditor.open}
        onClose={() => { setCharEditor({ open: false, character: null }); refetchPlayer(); }}
      />

      {/* Account Editor */}
      <AccountEditor
        account={accountEditor.account}
        open={accountEditor.open}
        onClose={() => { setAccountEditor({ open: false, account: null }); refetch(); }}
      />

      {/* Ban Confirmation */}
      <AlertDialog open={!!banTarget} onOpenChange={() => !blockPlayer.isPending && setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-danger" />
              ยืนยันการบล็อก
            </AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการบล็อกผู้เล่น <strong className="text-foreground">{banTarget?.UserID}</strong> (ID: {banTarget?.UserNum}) ใช่หรือไม่?
              <br /><br />
              ผู้เล่นจะไม่สามารถเข้าสู่ระบบได้จนกว่าจะปลดบล็อก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockPlayer.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} disabled={blockPlayer.isPending}
              className="bg-danger hover:bg-danger/80 text-white">
              {blockPlayer.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
              บล็อกผู้เล่น
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Players;

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, Users, Loader2, Pencil, Wifi, WifiOff } from 'lucide-react';
import { useGuilds, useGuildDetail, useGuildStats, useUpdateGuild } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getClassName } from '@/lib/ran-online';

const posMap = { 1: 'Master', 2: 'Deputy', 3: 'Member', 4: 'Member', 5: 'Member' };
const fmt = (v) => v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Guild() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [editGuild, setEditGuild] = useState(null);
  const [editForm, setEditForm] = useState({});
  const limit = 50;

  const { data: guildsData, isLoading } = useGuilds({ search, limit, offset });
  const { data: detail, isError } = useGuildDetail(selected);
  const { data: stats } = useGuildStats();
  const updateGuild = useUpdateGuild();

  const guilds = guildsData?.guilds || [];
  const total = guildsData?.total || 0;

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setOffset(0); };

  const openEdit = (guild) => {
    setEditGuild(guild);
    setEditForm({ GuName: guild.GuName || '', GuNotice: guild.GuNotice || '', GuMoney: guild.GuMoney || 0 });
  };

  const handleSave = async () => {
    try {
      await updateGuild.mutateAsync({ id: editGuild.GuNum, fields: editForm });
      setEditGuild(null);
    } catch (_) {}
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center"><Shield className="w-4.5 h-4.5 text-gold" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">กิลด์ทั้งหมด</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={stats?.total_guilds || 0} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center"><Users className="w-4.5 h-4.5 text-blue" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">สมาชิกทั้งหมด</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={stats?.total_members || 0} /></p></div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ค้นหาชื่อกิลด์..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
          </div>
          <Button type="submit" className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
        </form>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
              ) : guilds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Shield className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่พบกิลด์</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ชื่อ</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">สมาชิก</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">เงิน</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">W/L</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guilds.map((g, i) => (
                      <motion.tr key={g.GuNum || i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelected(g.GuNum)}
                        className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${selected === g.GuNum ? 'bg-gold/5 border-l-2 border-gold' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">{g.GuName?.charAt(0) || '?'}</div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{g.GuName}</p>
                              <p className="text-[10px] text-muted-foreground">ID: {g.GuNum}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{g.GuMemberNum || 0}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gold">{fmt(g.GuMoney)}</td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{g.GuBattleWin || 0}/{g.GuBattleLose || 0}</td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(g)} title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></Button>
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
        </div>

        <div className="lg:col-span-2">
          {detail && !isError ? (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <GlassCard>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-lg bg-gold/10 flex items-center justify-center text-sm font-bold text-gold">{detail.GuName?.charAt(0) || '?'}</div>
                    <div>
                      <p className="text-base font-semibold text-foreground">{detail.GuName}</p>
                      <p className="text-xs text-muted-foreground">ID: {detail.GuNum} · Master: {detail.GuMaster || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {[
                      { l: 'สมาชิก', v: detail.GuMemberNum }, { l: 'เงิน', v: fmt(detail.GuMoney) },
                      { l: 'Win', v: detail.GuBattleWin, c: 'text-success' }, { l: 'Lose', v: detail.GuBattleLose, c: 'text-danger' },
                    ].map(s => (
                      <div key={s.l} className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{s.l}</p>
                        <p className={`text-sm font-semibold ${s.c || 'text-foreground'}`}>{s.v ?? 0}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">สร้าง: {fmtDate(detail.GuMakeTime)}</div>
                </div>
              </GlassCard>

              {detail.members && detail.members.length > 0 && (
                <GlassCard>
                  <div className="p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">สมาชิก ({detail.members.length})</h3>
                    <div className="space-y-1">
                      {detail.members.map((m, i) => (
                        <div key={m.ChaNum || i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.03]">
                          <div className="size-7 rounded-lg bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">{m.ChaName?.charAt(0) || '?'}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{m.ChaName}</p>
                            <p className="text-[10px] text-muted-foreground">Lv.{m.ChaLevel} · {getClassName(m.ChaClass)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{posMap[m.GuPosition] || 'Member'}</span>
                            {m.ChaOnline === 1 ? <Wifi className="w-3 h-3 text-success" /> : <WifiOff className="w-3 h-3 text-muted-foreground" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          ) : (
            <GlassCard className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">เลือกกิลด์เพื่อดูรายละเอียด</p>
            </GlassCard>
          )}
        </div>
      </div>

      <Dialog open={!!editGuild} onOpenChange={() => !updateGuild.isPending && setEditGuild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขกิลด์ — {editGuild?.GuName}</DialogTitle>
            <DialogDescription>เปลี่ยนแปลงข้อมูลกิลด์</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[{ k: 'GuName', l: 'ชื่อกิลด์' }, { k: 'GuNotice', l: 'ประกาศ' }, { k: 'GuMoney', l: 'เงิน', type: 'number' }].map(f => (
              <div key={f.k}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.l}</label>
                <input type={f.type || 'text'} value={editForm[f.k] ?? ''} onChange={e => setEditForm(p => ({ ...p, [f.k]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGuild(null)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={updateGuild.isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
              {updateGuild.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Guild;

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, PawPrint, Loader2, Pencil, Heart } from 'lucide-react';
import { usePets, usePetDetail, usePetStats, useUpdatePet } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const fmt = (v) => v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Pets() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [editPet, setEditPet] = useState(null);
  const [editForm, setEditForm] = useState({});
  const limit = 50;

  const { data: petsData, isLoading } = usePets({ search, limit, offset });
  const { data: detail } = usePetDetail(selected);
  const { data: stats } = usePetStats();
  const updatePet = useUpdatePet();

  const pets = petsData?.pets || [];
  const total = petsData?.total || 0;

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setOffset(0); };

  const openEdit = (pet) => {
    setEditPet(pet);
    setEditForm({ PetName: pet.PetName || '', PetFull: pet.PetFull ?? 100, PetSkinScale: pet.PetSkinScale ?? 100 });
  };

  const handleSave = async () => {
    try {
      await updatePet.mutateAsync({ id: editPet.PetNum, fields: editForm });
      setEditPet(null);
    } catch {
      setEditPet(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center"><PawPrint className="w-4.5 h-4.5 text-gold" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">สัตว์เลี้ยงทั้งหมด</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={stats?.total || 0} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-success/12 flex items-center justify-center"><Heart className="w-4.5 h-4.5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">ใช้งานได้</p><p className="text-xl font-bold text-success"><AnimatedCounter value={stats?.available || 0} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-danger/12 flex items-center justify-center"><PawPrint className="w-4.5 h-4.5 text-danger" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">ถูกลบ</p><p className="text-xl font-bold text-danger"><AnimatedCounter value={stats?.deleted || 0} /></p></div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ค้นหาชื่อสัตว์, ชื่อเจ้าของ..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
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
              ) : pets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <PawPrint className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่พบสัตว์เลี้ยง</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ชื่อ</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">เจ้าของ</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">HP</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">สถานะ</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pets.map((p, i) => (
                      <motion.tr key={p.PetNum || i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }} onClick={() => setSelected(p.PetNum)}
                        className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${selected === p.PetNum ? 'bg-gold/5 border-l-2 border-gold' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-lg bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">{p.PetName?.charAt(0) || '?'}</div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.PetName}</p>
                              <p className="text-[10px] text-muted-foreground">#{p.PetNum}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.owner_name || `Char #${p.PetChaNum}`}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{fmt(p.PetFull)}%</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className={`size-1.5 rounded-full ${p.PetDeleted === 1 ? 'bg-danger' : 'bg-success'}`} />
                            <span className="text-xs text-muted-foreground">{p.PetDeleted === 1 ? 'ลบ' : 'ปกติ'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)} title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></Button>
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
          {detail ? (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <GlassCard>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-lg bg-gold/10 flex items-center justify-center text-sm font-bold text-gold">{detail.PetName?.charAt(0) || '?'}</div>
                    <div>
                      <p className="text-base font-semibold text-foreground">{detail.PetName}</p>
                      <p className="text-xs text-muted-foreground">#{detail.PetNum} · Owner: {detail.owner_name || `Char #${detail.PetChaNum}`}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    {[
                      { l: 'Type', v: detail.PetType }, { l: 'Style', v: detail.PetStyle },
                      { l: 'Color', v: detail.PetColor }, { l: 'HP', v: fmt(detail.PetFull) + '%' },
                      { l: 'สร้าง', v: fmtDate(detail.PetCreateDate) }, { l: 'PetCardMID', v: detail.PetCardMID || '—' },
                    ].map(s => (
                      <div key={s.l} className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{s.l}</p>
                        <p className="text-sm font-semibold text-foreground">{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {detail.inventory && detail.inventory.length > 0 && (
                <GlassCard>
                  <div className="p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Inventory ({detail.inventory.length})</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {detail.inventory.map((inv, i) => (
                        <div key={inv.PetInvenNum || i} className="bg-white/[0.03] rounded-lg p-2 text-center">
                          <p className="text-xs text-foreground">MID: {inv.PetInvenMID} · SID: {inv.PetInvenSID}</p>
                          <p className="text-[10px] text-muted-foreground">{inv.PetInvenAvailable ? '✅' : '❌'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          ) : (
            <GlassCard className="flex items-center justify-center py-16">
              <PawPrint className="w-8 mb-2 opacity-30 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">เลือกสัตว์เลี้ยงเพื่อดูรายละเอียด</p>
            </GlassCard>
          )}
        </div>
      </div>

      <Dialog open={!!editPet} onOpenChange={() => !updatePet.isPending && setEditPet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขสัตว์เลี้ยง — {editPet?.PetName}</DialogTitle>
            <DialogDescription>เปลี่ยนชื่อ, HP, ขนาด</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[{ k: 'PetName', l: 'ชื่อ' }, { k: 'PetFull', l: 'HP (%)', type: 'number' }, { k: 'PetSkinScale', l: 'ขนาด (%)', type: 'number' }].map(f => (
              <div key={f.k}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.l}</label>
                <input type={f.type || 'text'} value={editForm[f.k] ?? ''} onChange={e => setEditForm(p => ({ ...p, [f.k]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPet(null)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={updatePet.isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
              {updatePet.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Pets;

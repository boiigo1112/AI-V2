import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Swords, ChevronLeft, Eye, X, Trash2, Plus, Shield, Sword } from 'lucide-react';
import { toast } from 'sonner';
import { useCharacterInventory, useAllCharacters, useDeleteInventoryItem, useAddInventoryItem, useSearchItems } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/game/GlassCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getClassName, getClassColor } from '@/lib/ran-online';

const INVEN_COLS = 8;
const INVEN_PAGE_SIZE = 24;
const equipLabels = ['Weapon', 'Helmet', 'Armor', 'Gloves', 'Boots', 'Cape', 'Ring'];

function EquipCard({ slot, label, icon: Icon, onClick, onDelete }) {
  const filled = slot && !slot.is_empty;
  return (
    <div className="relative group">
      <button
        onClick={() => onClick?.(slot)}
        className={`w-full rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer
          ${filled
            ? 'border-[#8b6914]/60 bg-[#2a2010]/70 hover:border-[#c9a84c]/80 hover:bg-[#322818]/80 hover:shadow-[0_0_16px_rgba(201,168,76,0.15)]'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'}`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${filled ? 'bg-gradient-to-br from-[#c9a84c]/20 to-[#8b6914]/10 border border-[#c9a84c]/20' : 'bg-white/[0.02] border border-white/[0.04]'}`}>
          <Icon className={`${filled ? 'w-5 h-5 text-[#c9a84c]' : 'w-5 h-5 text-white/[0.08]'}`} />
        </div>
        {filled ? (
          <>
            <span className="text-[11px] text-[#d4b96a] text-center leading-tight font-medium">{slot.name}</span>
            {slot.eff1 > 0 && (
              <span className="text-[10px] font-bold text-[#ffd700] leading-none drop-shadow-[0_0_3px_rgba(255,215,0,0.4)]">+{slot.eff1}</span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-white/[0.15] text-center leading-tight uppercase tracking-wider font-medium">{label}</span>
        )}
      </button>
      {filled && onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-[#450a0a]/90 border border-red-700/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-800 hover:scale-110">
          <Trash2 className="w-3 h-3 text-red-300" />
        </button>
      )}
    </div>
  );
}

function InvenCard({ slot, onClick, onDelete }) {
  const filled = slot && !slot.is_empty;
  return (
    <div className="relative group">
      <button
        onClick={() => onClick?.(slot)}
        className={`w-full rounded-xl border p-2.5 flex flex-col items-center gap-1 transition-all duration-150 cursor-pointer
          ${filled
            ? 'border-[#6b5414]/50 bg-[#201a10]/70 hover:border-[#c9a84c]/70 hover:bg-[#2a2216]/80 hover:shadow-[0_0_12px_rgba(201,168,76,0.12)]'
            : 'border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] hover:bg-white/[0.03]'}`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${filled ? 'bg-gradient-to-br from-[#c9a84c]/15 to-[#8b6914]/08 border border-[#c9a84c]/15' : 'bg-white/[0.01] border border-white/[0.03]'}`}>
          <Sword className={`${filled ? 'w-4 h-4 text-[#c9a84c]/80' : 'w-4 h-4 text-white/[0.06]'}`} />
        </div>
        {filled && (
          <>
            <span className="text-[10px] text-[#d4b96a]/80 text-center leading-tight font-medium">{slot.name}</span>
            {slot.eff1 > 0 && <span className="text-[9px] font-bold text-[#ffd700] leading-none">+{slot.eff1}</span>}
            {slot.count > 1 && <span className="text-[8px] font-bold text-[#ffd700]/50">x{slot.count}</span>}
          </>
        )}
      </button>
      {filled && onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
          className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-[#450a0a]/90 border border-red-700/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-800 hover:scale-110">
          <Trash2 className="w-2.5 h-2.5 text-red-300" />
        </button>
      )}
    </div>
  );
}

function Inventory() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedChaNum, setSelectedChaNum] = useState(null);
  const [selectedCha, setSelectedCha] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addCol, setAddCol] = useState('equip');
  const [addSearch, setAddSearch] = useState('');
  const [addMain, setAddMain] = useState(1);
  const [addSub, setAddSub] = useState(0);
  const [addCount, setAddCount] = useState(1);
  const [invenPage, setInvenPage] = useState(0);

  const { data: charsData } = useAllCharacters({ search, limit: 50, offset: 0 });
  const { data: invData, isFetching, error } = useCharacterInventory(selectedChaNum);
  const deleteItem = useDeleteInventoryItem();
  const addItem = useAddInventoryItem();
  const { data: searchData } = useSearchItems(addSearch, 50);
  const itemList = searchData?.items || [];

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setSelectedChaNum(null); setSelectedCha(null); setSelectedSlot(null); };
  const handleSelectChar = (ch) => { setSelectedChaNum(ch.ChaNum); setSelectedCha(ch); setSelectedSlot(null); setInvenPage(0); };

  const equip = invData?.equipment || [];
  const inven = invData?.inventory || [];
  const invenLine = invData?.inven_line ?? 0;
  const nonEmptyEquip = equip.filter(s => !s.is_empty);
  const nonEmptyInven = inven.filter(s => !s.is_empty);
  const invenTotalPages = Math.max(1, Math.ceil(nonEmptyInven.length / INVEN_PAGE_SIZE));
  const invenPageItems = nonEmptyInven.slice(invenPage * INVEN_PAGE_SIZE, (invenPage + 1) * INVEN_PAGE_SIZE);

  const handleSlotClick = (slot) => { setSelectedSlot(prev => prev === slot ? null : slot); };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedChaNum) return;
    try {
      await deleteItem.mutateAsync({ chaNum: selectedChaNum, col: deleteTarget.col, slotIdx: deleteTarget.slotIdx });
      toast.success('ลบไอเทมสำเร็จ');
      setDeleteTarget(null);
    } catch (err) { toast.error(err?.response?.data?.error || 'ลบไม่สำเร็จ'); }
  };

  const handleAdd = async () => {
    if (!selectedChaNum || addSub <= 0) { toast.error('กรุณาเลือกไอเทม'); return; }
    try {
      await addItem.mutateAsync({ chaNum: selectedChaNum, col: addCol, main: addMain, sub: addSub, count: addCount });
      toast.success('เพิ่มไอเทมสำเร็จ');
      setAddOpen(false);
    } catch (err) { toast.error(err?.response?.data?.error || 'เพิ่มไม่สำเร็จ'); }
  };

  const isPending = deleteItem.isPending || addItem.isPending;

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ค้นหาชื่อตัวละคร..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
          </div>
          <Button type="submit" className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
        </form>
      </GlassCard>

      {search && charsData?.characters?.length > 0 && !selectedChaNum && (
        <GlassCard className="p-0 overflow-hidden">
          {charsData.characters.map(ch => (
            <button key={ch.ChaNum} onClick={() => handleSelectChar(ch)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors text-left">
              <div className="size-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: `${getClassColor(ch.ChaClass)}15`, color: getClassColor(ch.ChaClass) }}>{ch.ChaName?.charAt(0) || '?'}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{ch.ChaName}</p><p className="text-[10px] text-muted-foreground">{getClassName(ch.ChaClass)} · Lv.{ch.ChaLevel} · #{ch.ChaNum}</p></div>
              <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </GlassCard>
      )}

      {selectedChaNum && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {isFetching ? (
            <GlassCard className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></GlassCard>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedChaNum(null); setSelectedCha(null); setSelectedSlot(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> เปลี่ยน
                  </button>
                  {selectedCha && (
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: `${getClassColor(selectedCha.ChaClass)}15`, color: getClassColor(selectedCha.ChaClass) }}>{selectedCha.ChaName?.charAt(0) || '?'}</div>
                      <span className="text-sm font-medium text-foreground">{selectedCha.ChaName}</span>
                      <span className="text-[10px] text-muted-foreground">{getClassName(selectedCha.ChaClass)} · Lv.{selectedCha.ChaLevel}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {invenLine === 0 && (
                    <span className="text-[10px] text-[#ffd700]/60" title="ตัวละครยังไม่มีช่องเก็บของ">⚠️ Ghost data</span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setAddOpen(true); setAddCol('equip'); setAddSearch(''); setAddSub(0); }}
                    className="border-gold/30 text-gold hover:bg-gold/10 text-xs h-8 px-3">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-danger bg-danger/5 rounded-lg p-3 mb-3">ไม่สามารถโหลดข้อมูลได้: {error.message || 'เกิดข้อผิดพลาด'}</div>
              )}

              {/* Content */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Equipment Panel */}
                <div className="xl:col-span-1">
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Swords className="w-4 h-4 text-[#c9a84c]" />
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Equipment</h3>
                      <span className="text-[10px] text-muted-foreground ml-auto">{nonEmptyEquip.length}/7</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {equipLabels.map((label, i) => (
                        <EquipCard key={label} slot={nonEmptyEquip[i]} label={label}
                          icon={i === 0 ? Sword : Shield}
                          onClick={handleSlotClick}
                          onDelete={(s) => setDeleteTarget({ ...s, col: 'equip', slotIdx: s.slot })} />
                      ))}
                      {/* Center silhouette */}
                      <div className="col-start-2 row-start-2 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-24 rounded-2xl bg-gradient-to-b from-white/[0.02] to-white/[0.01] border border-white/[0.04] flex items-center justify-center">
                          <Swords className="w-8 h-8 text-white/[0.04]" />
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Selected Item Detail */}
                  {selectedSlot && !selectedSlot.is_empty && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <GlassCard className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="size-12 rounded-xl bg-gradient-to-br from-[#c9a84c]/15 to-[#8b6914]/08 border border-[#c9a84c]/15 flex items-center justify-center shrink-0">
                            <Shield className="w-6 h-6 text-[#c9a84c]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground mb-1">{selectedSlot.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Main: {selectedSlot.item_main} · Sub: {selectedSlot.item_sub}
                              {selectedSlot.eff1 > 0 && <span className="text-[#ffd700] font-semibold ml-2">+{selectedSlot.eff1}</span>}
                              {selectedSlot.count > 1 && <span className="ml-2 text-white/[0.6]">x{selectedSlot.count}</span>}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedSlot(null)} className="shrink-0">
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )}
                </div>

                {/* Inventory Panel */}
                <div className="xl:col-span-2">
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Inventory</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{nonEmptyInven.length} items</span>
                    </div>
                    {nonEmptyInven.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Sword className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-sm">ไม่มีไอเทมในช่องเก็บของ</p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-y-auto max-h-[520px] pr-1">
                          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
                            {invenPageItems.map((slot, i) => (
                              <InvenCard key={i} slot={slot}
                                onClick={handleSlotClick}
                                onDelete={(s) => setDeleteTarget({ ...s, col: 'inven', slotIdx: s.slot })} />
                            ))}
                          </div>
                        </div>
                        {nonEmptyInven.length > INVEN_PAGE_SIZE && (
                          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                            <Button variant="outline" size="sm" disabled={invenPage === 0}
                              onClick={() => setInvenPage(p => p - 1)} className="text-xs h-7 px-2">← ก่อนหน้า</Button>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              หน้า {invenPage + 1}/{invenTotalPages} ({invenPage * INVEN_PAGE_SIZE + 1}–{Math.min((invenPage + 1) * INVEN_PAGE_SIZE, nonEmptyInven.length)})
                            </span>
                            <Button variant="outline" size="sm" disabled={invenPage >= invenTotalPages - 1}
                              onClick={() => setInvenPage(p => p + 1)} className="text-xs h-7 px-2">ถัดไป →</Button>
                          </div>
                        )}
                      </>
                    )}
                  </GlassCard>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => !deleteItem.isPending && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-danger" /> ลบไอเทม</AlertDialogTitle>
            <AlertDialogDescription>ต้องการลบ <strong className="text-foreground">{deleteTarget?.name || 'item'}</strong> ({deleteTarget?.col}) ใช่หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItem.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteItem.isPending} className="bg-danger hover:bg-danger/80 text-white">
              {deleteItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />} ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>เพิ่มไอเทม</DialogTitle></DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
              <Button variant={addCol === 'equip' ? 'default' : 'outline'} size="sm" onClick={() => setAddCol('equip')} className={addCol === 'equip' ? 'bg-gold text-[#08080e]' : ''}>Equipment</Button>
              <Button variant={addCol === 'inven' ? 'default' : 'outline'} size="sm" onClick={() => setAddCol('inven')} className={addCol === 'inven' ? 'bg-gold text-[#08080e]' : ''}>Inventory</Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" placeholder="ค้นหาไอเทม..." value={addSearch} onChange={e => setAddSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 -mx-1">
              {itemList.length > 0 ? itemList.map(item => (
                <button key={`${item.main}:${item.sub}`}
                  onClick={() => { setAddMain(Number(item.main)); setAddSub(Number(item.sub)); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${addSub === Number(item.sub) && addMain === Number(item.main) ? 'bg-gold/10 text-gold' : 'hover:bg-white/[0.05] text-foreground'}`}>
                  {item.name} <span className="text-muted-foreground">({item.main}:{item.sub})</span>
                </button>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">{addSearch ? 'ไม่พบไอเทม' : 'พิมพ์เพื่อค้นหาไอเทม...'}</p>
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">จำนวน</label>
              <input type="number" min="1" value={addCount} onChange={e => setAddCount(Math.max(1, Number(e.target.value)))}
                className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleAdd} disabled={isPending || addSub <= 0} className="bg-gold hover:bg-gold-light text-[#08080e]">
              {addItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} เพิ่ม
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Inventory;

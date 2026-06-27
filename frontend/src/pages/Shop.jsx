import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Pencil, Trash2, Package, Coins, Boxes, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGameShopItems, useDeleteShopItem } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { ShopItemEditor } from '@/components/game/ShopItemEditor';
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

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}

function Shop() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const limit = 50;

  const { data: shopData, isLoading, refetch } = useGameShopItems({ limit, offset });
  const deleteItem = useDeleteShopItem();

  const items = shopData?.items || [];
  const total = shopData?.total || 0;

  const filteredItems = search
    ? items.filter(i => i.ItemName?.toLowerCase().includes(search.toLowerCase()) || String(i.ProductNum).includes(search))
    : items;

  const totalStock = items.reduce((s, i) => s + (i.ItemStock || 0), 0);
  const totalValue = items.reduce((s, i) => s + ((i.ItemPrice || i.ItemMoney || 0) * (i.ItemStock || 0)), 0);
  const uniqueCategories = [...new Set(items.map(i => i.Category).filter(Boolean))];
  const categoryCount = uniqueCategories.length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem.mutateAsync(deleteTarget.ProductNum);
      toast.success('ลบสินค้าสำเร็จ');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">สินค้าทั้งหมด</p>
              <p className="text-xl font-bold text-foreground"><AnimatedCounter value={total} /></p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-blue" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">สต๊อกรวม</p>
              <p className="text-xl font-bold text-foreground"><AnimatedCounter value={totalStock} /></p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-success/12 flex items-center justify-center">
              <Coins className="w-4.5 h-4.5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">มูลค่ารวม (Point)</p>
              <p className="text-xl font-bold text-foreground"><AnimatedCounter value={totalValue} /></p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-purple-400/12 flex items-center justify-center">
              <Boxes className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium">หมวดหมู่ ({categoryCount})</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {uniqueCategories.length > 0 ? (
                  uniqueCategories.map(cat => (
                    <span key={cat} className="text-[10px] bg-purple-400/10 text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
                      {cat}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search + Add Button */}
      <GlassCard className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ค้นหาชื่อสินค้า, รหัส..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
          </div>
          <Button onClick={() => setEditor({ open: true, item: null })} className="bg-gold hover:bg-gold-light text-[#08080e]">
            <Plus className="w-4 h-4 mr-1" /> เพิ่มสินค้า
          </Button>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingBag className="w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">{search ? 'ไม่พบสินค้าที่ค้นหา' : 'ไม่มีข้อมูลสินค้า'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">ID</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">ชื่อสินค้า</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">ราคา (Point)</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">สต๊อก</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">หมวดหมู่</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Section</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, i) => (
                  <motion.tr key={item.ProductNum || i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.ProductNum}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{item.ItemName || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">Main: {item.ItemMain ?? '—'} | Sub: {item.ItemSub ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gold">{formatValue(item.ItemPrice || item.ItemMoney)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${(item.ItemStock || 0) <= 0 ? 'text-danger' : 'text-foreground'}`}>
                        {formatValue(item.ItemStock)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{item.Category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">{item.ItemSection ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditor({ open: true, item })} title="แก้ไข">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(item)} title="ลบ">
                          <Trash2 className="w-3.5 h-3.5 text-danger" />
                        </Button>
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

      {/* Shop Item Editor */}
      <ShopItemEditor
        item={editor.item}
        open={editor.open}
        onClose={() => { setEditor({ open: false, item: null }); refetch(); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => !deleteItem.isPending && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-danger" />
              ยืนยันการลบสินค้า
            </AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบสินค้า <strong className="text-foreground">{deleteTarget?.ItemName}</strong> (ID: {deleteTarget?.ProductNum}) ใช่หรือไม่?
              <br /><br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItem.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteItem.isPending}
              className="bg-danger hover:bg-danger/80 text-white">
              {deleteItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              ลบสินค้า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Shop;

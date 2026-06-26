import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useGameShopItems } from '@/hooks/use-game';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}

function Shop() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data: shopData, isLoading } = useGameShopItems({ limit, offset });
  const items = shopData?.items || [];
  const total = shopData?.total || 0;
  const columns = items.length > 0 ? Object.keys(items[0]) : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingBag className="w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">ไม่มีข้อมูลสินค้า</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {columns.map(col => (
                    <th key={col} className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <motion.tr key={i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    {columns.map(col => (
                      <td key={col} className="px-4 py-2.5 text-xs text-muted-foreground">{formatValue(row[col])}</td>
                    ))}
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
  );
}

export default Shop;

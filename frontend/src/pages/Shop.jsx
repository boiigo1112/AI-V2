import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useGameShopItems } from '../hooks/use-game';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">ร้านค้า</h1>
        </div>
        <span className="text-sm text-muted">{total.toLocaleString()} รายการ</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted">ไม่มีข้อมูลสินค้า</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {columns.map(col => (
                      <th key={col} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-border last:border-0 hover:bg-hover/50">
                      {columns.map(col => (
                        <td key={col} className="px-4 py-2.5 text-sm text-muted">{formatValue(row[col])}</td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > limit && (
            <div className="flex justify-between p-4 border-t border-border">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>ก่อนหน้า</Button>
              <span className="text-sm text-muted self-center">{offset + 1}-{Math.min(offset + limit, total)} / {total}</span>
              <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>ถัดไป</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Shop;

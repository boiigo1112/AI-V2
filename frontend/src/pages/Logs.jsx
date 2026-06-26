import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Database } from 'lucide-react';
import { useGameLogs, useGameAllTables } from '@/hooks/use-game';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';

function Logs() {
  const [activeDb, setActiveDb] = useState('RanLog');
  const [table, setTable] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const { data: allTables } = useGameAllTables(activeDb);
  const { data: logData, isLoading } = useGameLogs(activeDb, { table, limit, offset });
  const logs = logData?.logs || [];
  const total = logData?.total || 0;
  const activeTable = logData?.table || table;
  const columns = logs.length > 0 ? Object.keys(logs[0]) : [];
  const logTables = (allTables || []).filter(t => t.is_log);

  const formatCell = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'string' && val.length > 60) return val.substring(0, 60) + '...';
    return String(val);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center">
              <ScrollText className="w-4.5 h-4.5 text-blue" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">รายการบันทึก</p>
              <p className="text-xl font-bold text-foreground"><AnimatedCounter value={total} /></p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center">
              <Database className="w-4.5 h-4.5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">ตารางที่เลือก</p>
              <p className="text-xl font-bold text-foreground">{activeTable || '—'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filter */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {['RanLog', 'RanUser', 'RanGame1', 'RanShop'].map(db => (
              <button key={db} onClick={() => { setActiveDb(db); setTable(''); setOffset(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeDb === db ? 'bg-gold text-[#08080e]' : 'bg-white/[0.04] text-muted-foreground hover:text-foreground'}`}>
                {db}
              </button>
            ))}
          </div>
          {logTables.length > 0 && (
            <select value={table} onChange={e => { setTable(e.target.value); setOffset(0); }}
              className="h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 cursor-pointer appearance-none">
              <option value="">เลือกตาราง</option>
              {logTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          )}
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ScrollText className="w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">ไม่มีข้อมูลบันทึก</p>
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
                {logs.map((row, i) => (
                  <motion.tr key={i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.01 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    {columns.map(col => (
                      <td key={col} className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate whitespace-nowrap">{formatCell(row[col])}</td>
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

export default Logs;

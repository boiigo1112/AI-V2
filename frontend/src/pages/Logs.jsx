import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import { useGameLogs, useGameAllTables } from '../hooks/use-game';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">บันทึกเกม</h1>
        </div>
        {total > 0 && <span className="text-sm text-muted">{total.toLocaleString()} รายการ</span>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {['RanLog', 'RanUser', 'RanGame1', 'RanShop'].map(db => (
            <button key={db} onClick={() => { setActiveDb(db); setTable(''); setOffset(0); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeDb === db ? 'bg-primary text-white' : 'bg-hover text-muted hover:text-text'
              }`}>
              {db}
            </button>
          ))}
        </div>

        {logTables.length > 0 && (
          <select value={table} onChange={e => { setTable(e.target.value); setOffset(0); }}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary cursor-pointer">
            <option value="">— เลือกตาราง —</option>
            {logTables.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {activeTable && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>ตาราง:</span>
          <span className="font-medium text-text">{activeTable}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted">ไม่มีข้อมูลบันทึก</div>
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
                  {logs.map((row, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                      className="border-b border-border last:border-0 hover:bg-hover/50">
                      {columns.map(col => (
                        <td key={col} className="px-4 py-2.5 text-sm text-muted max-w-[200px] truncate">{formatCell(row[col])}</td>
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

export default Logs;

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Wifi, WifiOff, ChevronLeft, ChevronRight, Skull, Loader2 } from 'lucide-react';
import { usePKRanking, usePKDeathRanking, usePKStats, usePKRecordHistory } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { CustomSelect } from '@/components/game/CustomSelect';

const classMap = {
  1: 'Buster', 2: 'Tempster', 3: 'Engineer', 4: 'Prowler', 5: 'Force Gunner',
  6: 'Defender', 7: 'Force Blader', 8: 'Force Shuriken', 9: 'Bloody Storm', 10: 'Shadow Walker',
};
const classColors = {
  1: '#818cf8', 2: '#3b82f6', 3: '#34d399', 4: '#c9a84c', 5: '#f87171',
  6: '#a78bfa', 7: '#f472b6', 8: '#fb923c', 9: '#e11d48', 10: '#6b7280',
};
const fmt = (v) => v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v);
const PAGE_OPTIONS = [10, 25, 50, 100, 200];

function PKRanking() {
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [selectedCha, setSelectedCha] = useState(null);

  const { data: pkData, isLoading } = usePKRanking({ limit: pageSize, offset });
  const { data: deathData } = usePKDeathRanking({ limit: 5, offset: 0 });
  const { data: stats } = usePKStats();
  const { data: pkHistory, isFetching: historyLoading } = usePKRecordHistory(selectedCha, { limit: 20, offset: 0 });

  const ranking = pkData?.ranking || [];
  const total = pkData?.total || 0;

  const handlePageSizeChange = (size) => { setPageSize(size); setOffset(0); };

  const statCards = [
    { label: 'ตัวละครทั้งหมด', value: stats?.total_players, color: '#818cf8', formatter: (v) => <AnimatedCounter value={v} /> },
    { label: 'มี PK', value: stats?.total_pk, color: '#f87171', formatter: (v) => <AnimatedCounter value={v} /> },
    { label: 'PK เฉลี่ย', value: stats?.avg_pk_score, color: '#3b82f6', formatter: (v) => v != null ? Number(v).toFixed(1) : '0.0' },
    { label: 'PK สูงสุด', value: stats?.max_pk_score, color: '#34d399', formatter: (v) => v != null ? Math.round(v).toLocaleString() : '0' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => (
          <GlassCard key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}12` }}>
                <Swords className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>
              <div><p className="text-xs text-muted-foreground font-medium">{s.label}</p><p className="text-xl font-bold text-foreground">{s.formatter(s.value)}</p></div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <GlassCard className="overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">PK Ranking</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">แสดง</span>
                <CustomSelect value={pageSize} onChange={handlePageSizeChange}
                  options={PAGE_OPTIONS.map(v => ({ value: v, label: String(v) }))} className="w-14" />
              </div>
            </div>
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
              ) : ranking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Swords className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่มีข้อมูล PK</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3 w-12">#</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">ตัวละคร</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">Level</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">Class</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">PK Kills</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">Death</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">Online</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((ch, i) => {
                      const rank = offset + i + 1;
                      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                      return (
                        <motion.tr key={ch.ChaNum || i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }} onClick={() => setSelectedCha(ch.ChaNum)}
                          className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${selectedCha === ch.ChaNum ? 'bg-gold/5 border-l-2 border-gold' : 'hover:bg-white/[0.02]'}`}>
                          <td className="px-3 py-3 text-center text-sm">{rankIcon}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="size-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${classColors[ch.ChaClass] || '#818cf8'}15`, color: classColors[ch.ChaClass] || '#818cf8' }}>
                                {ch.ChaName?.charAt(0) || '?'}
                              </div>
                              <p className="text-sm font-medium text-foreground">{ch.ChaName}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-semibold text-foreground">{ch.ChaLevel}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${classColors[ch.ChaClass] || '#818cf8'}15`, color: classColors[ch.ChaClass] || '#818cf8' }}>
                              {classMap[ch.ChaClass] || `C${ch.ChaClass}`}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-gold">{fmt(ch.ChaPK)}</td>
                          <td className="px-3 py-3 text-right text-sm text-muted-foreground">{fmt(ch.ChaPKDeath)}</td>
                          <td className="px-3 py-3 text-center">{ch.ChaOnline === 1 ? <Wifi className="w-3 h-3 text-success mx-auto" /> : <WifiOff className="w-3 h-3 text-muted-foreground mx-auto" />}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {total > pageSize && (
              <div className="flex justify-between p-4 border-t border-white/[0.05]">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - pageSize))}>ก่อนหน้า</Button>
                <span className="text-xs text-muted-foreground self-center">{offset + 1}-{Math.min(offset + pageSize, total)} / {total}</span>
                <Button variant="outline" size="sm" disabled={offset + pageSize >= total} onClick={() => setOffset(o => o + pageSize)}>ถัดไป</Button>
              </div>
            )}
          </GlassCard>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {deathData?.ranking && deathData.ranking.length > 0 && (
            <GlassCard>
              <div className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">💀 Top Victims</h3>
                <div className="space-y-1">
                  {deathData.ranking.map((ch, i) => (
                    <div key={ch.ChaNum || i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] cursor-pointer" onClick={() => setSelectedCha(ch.ChaNum)}>
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="size-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `${classColors[ch.ChaClass] || '#818cf8'}15`, color: classColors[ch.ChaClass] || '#818cf8' }}>
                        {ch.ChaName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{ch.ChaName}</p>
                        <p className="text-[10px] text-muted-foreground">{classMap[ch.ChaClass] || `C${ch.ChaClass}`} · Lv.{ch.ChaLevel} · ตาย {fmt(ch.ChaPKDeath)} · ฆ่า {fmt(ch.ChaPK)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {selectedCha && (
            <GlassCard>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase">📋 PK Record</h3>
                  {pkHistory?.total > 0 && <span className="text-[10px] text-muted-foreground">ทั้งหมด {pkHistory.total} รายการ</span>}
                </div>
                {historyLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
                ) : pkHistory?.records && pkHistory.records.length > 0 ? (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {pkHistory.records.map((r, i) => (
                      <div key={r.PKRecordNum || i} className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-white/[0.02] text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Skull className="w-3 h-3 text-danger shrink-0" />
                          <span className="text-foreground truncate">{r.ChaKillName || '???'}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-muted-foreground">(#{r.ChaKillNum})</span>
                          <span className={`font-semibold ${Number(r.ChaPKRecord) > 0 ? 'text-success' : Number(r.ChaPKRecord) < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                            {Number(r.ChaPKRecord) > 0 ? '+' : ''}{r.ChaPKRecord}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">ไม่มีประวัติ PK</p>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

export default PKRanking;

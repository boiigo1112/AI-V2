import { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Wifi, WifiOff } from 'lucide-react';
import { usePKRanking, usePKDeathRanking, usePKStats, usePKRecordHistory } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';

const classMap = { 1: 'Buster', 2: 'Tempster', 3: 'Engineer', 4: 'Prowler', 5: 'Force Gunner', 6: 'Defender' };
const classColors = { 1: '#818cf8', 2: '#3b82f6', 3: '#34d399', 4: '#c9a84c', 5: '#f87171', 6: '#a78bfa' };
const fmt = (v) => v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v);

function PKRanking() {
  const [offset, setOffset] = useState(0);
  const [selectedCha, setSelectedCha] = useState(null);
  const limit = 50;

  const { data: pkData, isLoading } = usePKRanking({ limit, offset });
  const { data: deathData } = usePKDeathRanking({ limit: 5, offset: 0 });
  const { data: stats } = usePKStats();
  const { data: pkHistory } = usePKRecordHistory(selectedCha, { limit: 20, offset: 0 });

  const ranking = pkData?.ranking || [];
  const total = pkData?.total || 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center"><Swords className="w-4.5 h-4.5 text-gold" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">ผู้เล่นทั้งหมด</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={stats?.total_players || 0} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-danger/12 flex items-center justify-center"><Swords className="w-4.5 h-4.5 text-danger" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">มี PK</p><p className="text-xl font-bold text-danger"><AnimatedCounter value={stats?.total_pk || 0} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center"><Swords className="w-4.5 h-4.5 text-blue" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">PK เฉลี่ย</p><p className="text-xl font-bold text-blue"><AnimatedCounter value={stats?.avg_pk_score || 0} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-success/12 flex items-center justify-center"><Swords className="w-4.5 h-4.5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">PK สูงสุด</p><p className="text-xl font-bold text-success"><AnimatedCounter value={stats?.max_pk_score || 0} /></p></div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* PK Ranking Table */}
        <div className="lg:col-span-3">
          <GlassCard className="overflow-hidden">
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
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">PK Score</th>
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
                          <td className="px-3 py-3 text-right text-sm font-semibold text-gold">{fmt(ch.ChaPKScore)}</td>
                          <td className="px-3 py-3 text-right text-sm text-muted-foreground">{fmt(ch.ChaPKDeath)}</td>
                          <td className="px-3 py-3 text-center">{ch.ChaOnline === 1 ? <Wifi className="w-3 h-3 text-success mx-auto" /> : <WifiOff className="w-3 h-3 text-muted-foreground mx-auto" />}</td>
                        </motion.tr>
                      );
                    })}
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

        {/* Detail Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats Card */}
          {deathData?.ranking && deathData.ranking.length > 0 && (
            <GlassCard>
              <div className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">💀 Top Victims</h3>
                <div className="space-y-1">
                  {deathData.ranking.slice(0, 5).map((ch, i) => (
                    <div key={ch.ChaNum || i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] cursor-pointer" onClick={() => setSelectedCha(ch.ChaNum)}>
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="size-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `${classColors[ch.ChaClass] || '#818cf8'}15`, color: classColors[ch.ChaClass] || '#818cf8' }}>
                        {ch.ChaName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{ch.ChaName}</p>
                        <p className="text-[10px] text-muted-foreground">ตาย {fmt(ch.ChaPKDeath)} ครั้ง</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* PK Record History */}
          {selectedCha && (
            <GlassCard>
              <div className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">📋 PK Record</h3>
                {pkHistory?.records && pkHistory.records.length > 0 ? (
                  <div className="space-y-1">
                    {pkHistory.records.slice(0, 10).map((r, i) => (
                      <div key={r.PKRecordNum || i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.02] text-xs">
                        <span className="text-foreground">{r.ChaKillName || '???'}</span>
                        <span className="text-muted-foreground">{r.ChaPKRecord || '—'}</span>
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

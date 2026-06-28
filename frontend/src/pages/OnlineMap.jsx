import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Eye, Globe } from 'lucide-react';
import { useOnlinePlayers, useOnlineMapStats } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { CharacterDrawer } from '@/components/game/CharacterDrawer';
import { CharacterEditor } from '@/components/game/CharacterEditor';
import { getClassName, getClassColor } from '@/lib/ran-online';

const mapColorPalette = ['#818cf8', '#34d399', '#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c'];

function OnlineMap() {
  const { data: playersData, isLoading } = useOnlinePlayers();
  const { data: stats } = useOnlineMapStats();
  const [selectedCha, setSelectedCha] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [charEditor, setCharEditor] = useState({ open: false, character: null });
  const [mapFilter, setMapFilter] = useState(null);

  const players = playersData?.players || [];

  const mapGroups = useMemo(() => {
    const groups = {};
    players.forEach(p => {
      const mapId = p.ChaStartMap ?? 'unknown';
      if (!groups[mapId]) groups[mapId] = [];
      groups[mapId].push(p);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [players]);

  const filteredPlayers = mapFilter ? (mapGroups.find(([id]) => id === mapFilter)?.[1] || []) : players;

  const totalOnline = stats?.online ?? players.length;
  const uniqueMaps = stats?.unique_maps ?? mapGroups.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-success/12 flex items-center justify-center"><Wifi className="w-4.5 h-4.5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">ออนไลน์ตอนนี้</p><p className="text-xl font-bold text-success"><AnimatedCounter value={totalOnline} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center"><Globe className="w-4.5 h-4.5 text-blue" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">จำนวนแผนที่</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={uniqueMaps} /></p></div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Map Distribution */}
        <div className="lg:col-span-1">
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold text-foreground">🗺️ Map Distribution</h3>
            </div>
            <div className="p-3 space-y-1.5 max-h-[500px] overflow-y-auto">
              <button
                onClick={() => setMapFilter(null)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${!mapFilter ? 'bg-gold/10 text-gold' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'}`}>
                <span>ทั้งหมด</span>
                <span className="font-semibold">{players.length}</span>
              </button>
              {mapGroups.map(([mapId, group], i) => (
                <button key={mapId}
                  onClick={() => setMapFilter(mapId === mapFilter ? null : mapId)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${mapFilter === mapId ? 'bg-gold/10 text-gold' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: mapColorPalette[i % mapColorPalette.length] }} />
                    <span className="truncate">Map {mapId}</span>
                  </div>
                  <span className="font-semibold shrink-0 ml-2">{group.length}</span>
                </button>
              ))}
              {mapGroups.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">ไม่มีผู้เล่นออนไลน์</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Online Players Table */}
        <div className="lg:col-span-3">
          <GlassCard className="overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">
                {mapFilter ? `Map ${mapFilter}` : 'ผู้เล่นออนไลน์'}
                <span className="text-muted-foreground ml-1">({filteredPlayers.length})</span>
              </h3>
              {mapFilter && (
                <Button variant="ghost" size="sm" onClick={() => setMapFilter(null)} className="text-xs">แสดงทั้งหมด</Button>
              )}
            </div>
            <div className="overflow-x-auto">
              {isLoading && players.length === 0 ? (
                <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
              ) : filteredPlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <WifiOff className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่มีผู้เล่นออนไลน์</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ตัวละคร</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Level</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Class</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Map</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ตำแหน่ง</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">IP</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((p, i) => (
                      <motion.tr key={p.ChaNum || i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${getClassColor(p.ChaClass)}15`, color: getClassColor(p.ChaClass) }}>
                              {p.ChaName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.ChaName}</p>
                              <p className="text-[10px] text-muted-foreground">{p.UserID || `#${p.UserNum}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{p.ChaLevel}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${getClassColor(p.ChaClass)}15`, color: getClassColor(p.ChaClass) }}>
                            {getClassName(p.ChaClass)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-foreground">{p.ChaStartMap ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-muted-foreground">
                          {p.ChaPosX != null ? `${Math.round(Number(p.ChaPosX))},${Math.round(Number(p.ChaPosY))}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-muted-foreground truncate max-w-[100px]" title={p.UserIP || p.LastIP}>
                          {p.UserIP || p.LastIP || '—'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedCha(p); setDrawerOpen(true); }} title="ดูตัวละคร">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Character Drawer */}
      <CharacterDrawer
        account={selectedCha}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedCha(null); }}
        onEditChar={(char) => { setCharEditor({ open: true, character: char }); }}
      />

      {/* Character Editor */}
      <CharacterEditor
        character={charEditor.character}
        open={charEditor.open}
        onClose={() => setCharEditor({ open: false, character: null })}
      />
    </div>
  );
}

export default OnlineMap;

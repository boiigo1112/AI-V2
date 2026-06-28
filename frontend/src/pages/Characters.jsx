import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Wifi, WifiOff, Pencil, Ban, Unlock, Swords, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAllCharacters, useCharacterDetail, useCharacterStats, useBanCharacter, useUnbanCharacter, useUpdateCharacter } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { CustomSelect } from '@/components/game/CustomSelect';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const classMap = { 1: 'Buster', 2: 'Tempster', 3: 'Engineer', 4: 'Prowler', 5: 'Force Gunner', 6: 'Defender' };
const classColors = { 1: '#818cf8', 2: '#3b82f6', 3: '#34d399', 4: '#c9a84c', 5: '#f87171', 6: '#a78bfa' };
const editableFields = [
  { key: 'ChaLevel', label: 'Level' }, { key: 'ChaMoney', label: 'Money' },
  { key: 'ChaExp', label: 'EXP' }, { key: 'ChaReborn', label: 'Reborn' },
  { key: 'ChaPower', label: 'Power' }, { key: 'ChaDex', label: 'Dex' },
  { key: 'ChaSpirit', label: 'Spirit' }, { key: 'ChaStrong', label: 'Strong' },
  { key: 'ChaIntel', label: 'Intel' }, { key: 'ChaHP', label: 'HP' },
  { key: 'ChaMP', label: 'MP' }, { key: 'ChaPK', label: 'PK' },
];

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
            <Icon className="w-4.5 h-4.5" style={{ color }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold text-foreground"><AnimatedCounter value={value} /></p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function Characters() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [editChar, setEditChar] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [banTarget, setBanTarget] = useState(null);
  const limit = 50;

  const { data: charsData, isLoading, refetch } = useAllCharacters({ search, class: classFilter, online: onlineFilter, limit, offset });
  const { data: detail, refetch: refetchDetail } = useCharacterDetail(selected);
  const { data: stats } = useCharacterStats();
  const banChar = useBanCharacter();
  const unbanChar = useUnbanCharacter();
  const updateChar = useUpdateCharacter();

  const characters = charsData?.characters || [];
  const total = charsData?.total || 0;

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setOffset(0); };

  const handleBan = async () => {
    if (!banTarget) return;
    try { await banChar.mutateAsync({ id: banTarget.ChaNum, reason: 'Banned by admin' }); toast.success('ระงับตัวละครสำเร็จ'); setBanTarget(null); }
    catch (err) { toast.error(err.response?.data?.error || 'ระงับไม่สำเร็จ'); }
  };

  const handleUnban = async (id) => {
    try { await unbanChar.mutateAsync(id); toast.success('ปลดระงับสำเร็จ'); refetch(); refetchDetail(); }
    catch (err) { toast.error(err.response?.data?.error || 'ปลดระงับไม่สำเร็จ'); }
  };

  const openEdit = (char) => {
    const f = {};
    editableFields.forEach(field => { f[field.key] = char[field.key] ?? ''; });
    setEditChar(char);
    setEditForm(f);
  };

  const handleSaveChar = async () => {
    if (!editChar) return;
    try {
      for (const [field, value] of Object.entries(editForm)) {
        if (value !== '' && value !== undefined && value !== editChar[field]) {
          await updateChar.mutateAsync({ id: String(editChar.ChaNum), field, value: String(value) });
        }
      }
      toast.success('อัปเดตสำเร็จ');
      setEditChar(null);
    } catch (err) { toast.error(err.response?.data?.error || 'อัปเดตไม่สำเร็จ'); }
  };

  const fmt = (v) => v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="ตัวละครทั้งหมด" value={stats?.total || 0} color="#818cf8" delay={0.05} />
        <StatCard icon={Wifi} label="ออนไลน์ตอนนี้" value={stats?.online || 0} color="#34d399" delay={0.1} />
        <StatCard icon={Swords} label="Buster" value={stats?.buster || 0} color="#818cf8" delay={0.15} />
        <StatCard icon={Shield} label="Prowler" value={stats?.prowler || 0} color="#c9a84c" delay={0.2} />
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="ค้นหาชื่อตัวละคร, รหัส..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
            </div>
            <Button type="submit" className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
          </form>
          <div className="flex gap-2">
            <CustomSelect
              value={classFilter}
              onChange={(v) => { setClassFilter(v); setOffset(0); }}
              placeholder="ทุก Class"
              options={[{ value: '', label: 'ทุก Class' }, ...Object.entries(classMap).map(([k, v]) => ({ value: k, label: v }))]}
              className="w-36"
            />
            <CustomSelect
              value={onlineFilter}
              onChange={(v) => { setOnlineFilter(v); setOffset(0); }}
              placeholder="ทุกสถานะ"
              options={[
                { value: '', label: 'ทุกสถานะ' },
                { value: '1', label: 'ออนไลน์' },
                { value: '0', label: 'ออฟไลน์' },
              ]}
              className="w-32"
            />
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
              ) : characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่พบตัวละคร</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th scope="col" className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ชื่อ</th>
                      <th scope="col" className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Level</th>
                      <th scope="col" className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Class</th>
                      <th scope="col" className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Power</th>
                      <th scope="col" className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Online</th>
                      <th scope="col" className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {characters.map((ch, i) => (
                      <motion.tr key={ch.ChaNum || i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }} onClick={() => setSelected(ch.ChaNum)}
                        className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${selected === ch.ChaNum ? 'bg-gold/5 border-l-2 border-gold' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${classColors[ch.ChaClass] || '#818cf8'}15`, color: classColors[ch.ChaClass] || '#818cf8' }}>
                              {ch.ChaName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{ch.ChaName}</p>
                              <p className="text-[10px] text-muted-foreground">ID: {ch.ChaNum}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{ch.ChaLevel}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${classColors[ch.ChaClass] || '#818cf8'}15`, color: classColors[ch.ChaClass] || '#818cf8' }}>
                            {classMap[ch.ChaClass] || `Class ${ch.ChaClass}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gold">{fmt(ch.ChaPower)}</td>
                        <td className="px-4 py-3 text-center">
                          {ch.ChaOnline === 1 ? <Wifi className="w-3.5 h-3.5 text-success mx-auto" /> : <WifiOff className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(ch)} title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></Button>
                            {ch.ChaDeleted === 1 ? (
                              <Button variant="ghost" size="icon-sm" onClick={() => handleUnban(ch.ChaNum)} title="ปลดระงับ"><Unlock className="w-3.5 h-3.5 text-success" /></Button>
                            ) : (
                              <Button variant="ghost" size="icon-sm" onClick={() => setBanTarget(ch)} title="ระงับ"><Ban className="w-3.5 h-3.5 text-danger" /></Button>
                            )}
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
        </div>

        <div className="lg:col-span-2">
          {detail ? (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <GlassCard>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${classColors[detail.ChaClass] || '#818cf8'}20`, color: classColors[detail.ChaClass] || '#818cf8' }}>
                      {detail.ChaName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">{detail.ChaName}</p>
                      <p className="text-xs text-muted-foreground">{classMap[detail.ChaClass] || `Class ${detail.ChaClass}`} · {detail.ChaOnline === 1 ? '🟢 ออนไลน์' : '⚫ ออฟไลน์'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(detail)}><Pencil className="w-3.5 h-3.5 mr-1" /> แก้ไข</Button>
                    {detail.ChaDeleted === 1 ? (
                      <Button variant="outline" size="sm" onClick={() => handleUnban(detail.ChaNum)}><Unlock className="w-3.5 h-3.5 mr-1 text-success" /> ปลดระงับ</Button>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => setBanTarget(detail)}><Ban className="w-3.5 h-3.5 mr-1" /> ระงับ</Button>
                    )}
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">สถิติ</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: 'Level', v: detail.ChaLevel }, { l: 'Reborn', v: detail.ChaReborn },
                      { l: 'Money', v: detail.ChaMoney, f: true }, { l: 'EXP', v: detail.ChaExp, f: true },
                      { l: 'Power', v: detail.ChaPower, f: true }, { l: 'PK', v: detail.ChaPK },
                    ].map(s => (
                      <div key={s.l} className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{s.l}</p>
                        <p className="text-sm font-semibold text-foreground">{s.f ? Number(s.v || 0).toLocaleString() : s.v ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Combat</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: 'Power', v: detail.ChaPower }, { l: 'Dex', v: detail.ChaDex },
                      { l: 'Spirit', v: detail.ChaSpirit }, { l: 'Strong', v: detail.ChaStrong },
                      { l: 'Intel', v: detail.ChaIntel }, { l: 'HP', v: detail.ChaHP },
                    ].map(s => (
                      <div key={s.l} className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{s.l}</p>
                        <p className="text-sm font-semibold text-foreground">{Number(s.v || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">เจ้าของ</h3>
                  <div className="bg-white/[0.03] rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">UserNum: {detail.UserNum}</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <GlassCard className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">เลือกตัวละครเพื่อดูรายละเอียด</p>
            </GlassCard>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editChar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/80 backdrop-blur-sm p-4" onClick={() => setEditChar(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-white/[0.08] p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-foreground mb-4">แก้ไข — {editChar.ChaName}</h3>
              <div className="grid grid-cols-2 gap-3">
                {editableFields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                    <input type="number" value={editForm[f.key] ?? ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setEditChar(null)}>ยกเลิก</Button>
                <Button onClick={handleSaveChar} disabled={updateChar.isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
                  {updateChar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} บันทึก
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!banTarget} onOpenChange={() => !banChar.isPending && setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-danger" /> ระงับตัวละคร</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการระงับตัวละคร <strong className="text-foreground">{banTarget?.ChaName}</strong> (ID: {banTarget?.ChaNum}) ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banChar.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleBan} disabled={banChar.isPending} className="bg-danger hover:bg-danger/80 text-white">
              {banChar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />} ระงับ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Characters;

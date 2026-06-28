import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Swords, Coins, Send, Plus, Minus, Ban, MessageSquare, History, Loader2, Users, Eye, ShoppingBag, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGmcLookup, useGmcSendItem, useGmcUpdatePoint, useGmcPlayerHistory, useGmcLogs, useGmcNotice, useGamePlayers, useGmcItemTracking, useBlockPlayer, useUnblockPlayer } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/game/GlassCard';
import { CustomSelect } from '@/components/game/CustomSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const classMap = { 1: 'Buster', 2: 'Tempster', 3: 'Engineer', 4: 'Prowler', 5: 'Force Gunner', 6: 'Defender' };
const historyTypes = [
  { value: 'login', label: '🔑 เข้าสู่ระบบ' }, { value: 'point', label: '💰 ใช้พ้อยท์' },
  { value: 'shop', label: '🛒 ซื้อของ' }, { value: 'logaction', label: '⚔️ Action' },
  { value: 'itemexchange', label: '📦 แลกไอเทม' }, { value: 'gmcmd', label: '👑 GM Cmd' },
];
const pointTypes = [
  { value: 'UserPoint', label: 'UserPoint' }, { value: 'UserVIP', label: 'UserVIP' },
  { value: 'VotePoint', label: 'VotePoint' },
];

function fmt(v) { return v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

function Gmc() {
  const [tab, setTab] = useState('lookup');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupInput, setLookupInput] = useState('');
  const [lookupLimit, setLookupLimit] = useState(15);
  const [sendTargetType, setSendTargetType] = useState('id');
  const [sendTargetId, setSendTargetId] = useState('');
  const [sendProductNum, setSendProductNum] = useState('');
  const [sendQty, setSendQty] = useState(1);
  const [pointTargetType, setPointTargetType] = useState('id');
  const [pointTargetId, setPointTargetId] = useState('');
  const [pointType, setPointType] = useState('UserPoint');
  const [pointAmount, setPointAmount] = useState(0);
  const [historyId, setHistoryId] = useState('');
  const [historyInput, setHistoryInput] = useState('');
  const [historyType, setHistoryType] = useState('');
  const [logOffset, setLogOffset] = useState(0);
  const logLimit = 50;
  const [trackingUid, setTrackingUid] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [noticeDialog, setNoticeDialog] = useState({ open: false, target: '' });
  const [noticeSubject, setNoticeSubject] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [blockTarget, setBlockTarget] = useState(null);

  const { data: lookup, isLoading: lookupLoading, isError: lookupError, refetch: refetchLookup } = useGmcLookup(lookupQuery);
  const { data: playerList, isLoading: listLoading } = useGamePlayers({ limit: lookupLimit, offset: 0 });
  const { data: playerHistory, isLoading: historyLoading } = useGmcPlayerHistory(historyId, historyType);
  const { data: logsData } = useGmcLogs({ limit: logLimit, offset: logOffset });
  const { data: tracking, isLoading: trackingLoading } = useGmcItemTracking(trackingUid);
  const sendItem = useGmcSendItem();
  const updatePoint = useGmcUpdatePoint();
  const sendNotice = useGmcNotice();
  const blockPlayer = useBlockPlayer();
  const unblockPlayer = useUnblockPlayer();

  // Auto-search with debounce
  useEffect(() => {
    const timer = setTimeout(() => setLookupQuery(lookupInput), 300);
    return () => clearTimeout(timer);
  }, [lookupInput]);

  const handleHistorySearch = () => { setHistoryId(historyInput); };

  const handleSendItem = async () => {
    if (sendTargetType === 'id' && !sendTargetId) { toast.error('กรุณากรอก UserID'); return; }
    if (!sendProductNum) { toast.error('กรุณากรอก ProductNum'); return; }
    try {
      await sendItem.mutateAsync({ target_type: sendTargetType, target_id: sendTargetId, product_num: Number(sendProductNum), quantity: sendQty });
      toast.success('ส่งไอเทมสำเร็จ');
    } catch (err) { toast.error(err.response?.data?.error || 'ส่งไม่สำเร็จ'); }
  };

  const handleUpdatePoint = async (mode) => {
    if (pointTargetType === 'id' && !pointTargetId) { toast.error('กรุณากรอก UserID'); return; }
    if (!pointAmount) { toast.error('กรุณากรอกจำนวน'); return; }
    try {
      const res = await updatePoint.mutateAsync({ target_type: pointTargetType, target_id: pointTargetId, point_type: pointType, amount: Math.abs(pointAmount), mode });
      toast.success(`ดำเนินการสำเร็จ (${res.data?.results?.affected || 0} รายการ)`);
    } catch (err) { toast.error(err.response?.data?.error || 'ดำเนินการไม่สำเร็จ'); }
  };

  const handleSendNotice = async () => {
    try {
      await sendNotice.mutateAsync({ subject: noticeSubject, content: noticeContent });
      toast.success('ประกาศสำเร็จ');
      setNoticeDialog({ open: false, target: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'ประกาศไม่สำเร็จ'); }
  };

  const handleBlock = async () => {
    if (!blockTarget) return;
    try {
      await blockPlayer.mutateAsync({ id: blockTarget.UserNum, reason: 'Blocked by GM' });
      toast.success('บล็อกสำเร็จ');
      setBlockTarget(null);
      refetchLookup();
    } catch (err) { toast.error(err.response?.data?.error || 'บล็อกไม่สำเร็จ'); }
  };

  const handleUnblock = async (id) => {
    try {
      await unblockPlayer.mutateAsync(id);
      toast.success('ปลดบล็อกสำเร็จ');
      if (lookupQuery) refetchLookup();
    } catch (err) { toast.error(err.response?.data?.error || 'ปลดบล็อกไม่สำเร็จ'); }
  };

  return (
    <div className="flex flex-col gap-5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="lookup"><Search className="w-3.5 h-3.5 mr-1.5" /> ตรวจสอบ</TabsTrigger>
          <TabsTrigger value="send"><Send className="w-3.5 h-3.5 mr-1.5" /> ส่งไอเทม</TabsTrigger>
          <TabsTrigger value="point"><Coins className="w-3.5 h-3.5 mr-1.5" /> พ้อยท์</TabsTrigger>
          <TabsTrigger value="history"><History className="w-3.5 h-3.5 mr-1.5" /> ประวัติ</TabsTrigger>
          <TabsTrigger value="logs"><Swords className="w-3.5 h-3.5 mr-1.5" /> GM Logs</TabsTrigger>
          <TabsTrigger value="tracking"><Search className="w-3.5 h-3.5 mr-1.5" /> ไอเทม</TabsTrigger>
        </TabsList>

        {/* TAB 1: LOOKUP */}
        <TabsContent value="lookup" className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="ค้นหา UserID... พิมพ์แล้วกรองทันที" value={lookupInput} onChange={e => setLookupInput(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
                {lookupInput && (
                  <button onClick={() => { setLookupInput(''); setLookupQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
                )}
              </div>
              <CustomSelect value={String(lookupLimit)} onChange={(v) => setLookupLimit(Number(v))} placeholder="15"
                options={[{ value: '10', label: '10 แถว' }, { value: '15', label: '15 แถว' }, { value: '30', label: '30 แถว' }, { value: '50', label: '50 แถว' }]}
                className="w-28" />
            </div>
          </GlassCard>

          {/* Player List (เมื่อไม่มีการค้นหา) */}
          {!lookupInput && !lookupLoading && !lookup && (
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                {listLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
                ) : playerList?.players && playerList.players.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ID</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">UserID</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ชื่อ</th>
                        <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Point</th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">สถานะ</th>
                        <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerList.players.map((p, i) => (
                        <motion.tr key={p.UserNum} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => { setLookupInput(p.UserID); setLookupQuery(p.UserID); }}
                          className="border-b border-white/[0.04] last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.UserNum}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{p.UserID}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{p.UserFullName || p.UserName}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gold">{fmt(p.UserPoint)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className={`size-1.5 rounded-full ${p.UserBlock === 1 ? 'bg-danger' : 'bg-success'}`} />
                              <span className="text-xs text-muted-foreground">{p.UserBlock === 1 ? 'บล็อก' : 'ปกติ'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon-sm" onClick={() => { setLookupInput(p.UserID); setLookupQuery(p.UserID); }} title="ดู"><Eye className="w-3.5 h-3.5" /></Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            </GlassCard>
          )}

          {/* Loading */}
          {lookupLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>}

          {/* Not found */}
          {lookupInput && lookupError && !lookupLoading && (
            <GlassCard className="flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <Users className="w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">ไม่พบผู้ใช้ "{lookupInput}"</p>
              </div>
            </GlassCard>
          )}

          {/* Lookup Detail */}
          {lookup && !lookupLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <GlassCard>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gold/15 flex items-center justify-center text-sm font-bold text-gold">
                        {(lookup.UserID || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{lookup.UserID}</p>
                        <p className="text-xs text-muted-foreground">ID: {lookup.UserNum} · {lookup.UserFullName || lookup.UserName}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {lookup.UserBlock === 1 ? (
                        <Button variant="outline" size="sm" onClick={() => handleUnblock(lookup.UserNum)}><Ban className="w-3.5 h-3.5 mr-1 text-success" /> ปลดบล็อก</Button>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => setBlockTarget(lookup)}><Ban className="w-3.5 h-3.5 mr-1" /> บล็อก</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => { setNoticeDialog({ open: true, target: lookup.UserID }); setNoticeSubject(`ประกาศถึง ${lookup.UserID}`); }}><MessageSquare className="w-3.5 h-3.5 mr-1" /> ประกาศ</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { l: 'Point', v: fmt(lookup.UserPoint) }, { l: 'VIP', v: fmt(lookup.UserVIP) },
                      { l: 'Vote Point', v: fmt(lookup.VotePoint) }, { l: 'อายุ', v: lookup.UserAge ?? '—' },
                      { l: 'สถานะ', v: lookup.UserBlock === 1 ? 'บล็อก' : lookup.UserAvailable === 1 ? 'ปกติ' : 'ระงับ', c: lookup.UserBlock === 1 ? 'text-danger' : 'text-success' },
                      { l: 'ประเภท', v: { 0: 'Normal', 1: 'Normal', 2: 'GM', 3: 'Admin' }[lookup.UserType] || 'Normal' },
                      { l: 'IP', v: lookup.LastIP || '—' }, { l: 'เข้าระบบล่าสุด', v: fmtDate(lookup.LastLoginDate) },
                    ].map(item => (
                      <div key={item.l} className="bg-white/[0.03] rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase">{item.l}</p>
                        <p className={`text-sm font-semibold mt-0.5 ${item.c || 'text-foreground'}`}>{item.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {lookup.characters && lookup.characters.length > 0 && (
                <GlassCard>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase">ตัวละคร ({lookup.characters.length})</h3>
                      <span className="text-[10px] text-muted-foreground">แสดง {Math.min(lookupLimit, lookup.characters.length)}/{lookup.characters.length}</span>
                    </div>
                    <div className="space-y-2">
                      {lookup.characters.slice(0, lookupLimit).map((ch, i) => (
                        <div key={ch.ChaNum || i} className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">{ch.ChaName?.charAt(0) || '?'}</div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{ch.ChaName}</p>
                              <p className="text-[10px] text-muted-foreground">Lv.{ch.ChaLevel} · {classMap[ch.ChaClass] || `Class ${ch.ChaClass}`} · {ch.ChaOnline === 1 ? '🟢 ออนไลน์' : '⚫ ออฟไลน์'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Money: <strong className="text-gold">{fmt(ch.ChaMoney)}</strong></span>
                            <span>Power: <strong>{fmt(ch.ChaPower)}</strong></span>
                            <span>Inven: {ch.ChaInvenLine || '—'} lines</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          )}
        </TabsContent>

        {/* TAB 2: SEND ITEM */}
        <TabsContent value="send" className="space-y-4">
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">🎯 เป้าหมาย</label>
                <div className="flex gap-2">
                  <CustomSelect value={sendTargetType} onChange={setSendTargetType} placeholder="เลือกเป้าหมาย"
                    options={[{ value: 'id', label: '👤 Player ID' }, { value: 'online', label: '🟢 Online Players' }, { value: 'all', label: '🌐 All Players' }]}
                    className="w-44" />
                  {sendTargetType === 'id' && (
                    <input type="text" placeholder="UserID" value={sendTargetId} onChange={e => setSendTargetId(e.target.value)}
                      className="h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 flex-1" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">📦 ProductNum</label>
                  <input type="number" placeholder="1001" value={sendProductNum} onChange={e => setSendProductNum(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">จำนวน</label>
                  <input type="number" min="1" value={sendQty} onChange={e => setSendQty(Number(e.target.value) || 1)}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
                </div>
              </div>
              <Button onClick={handleSendItem} disabled={sendItem.isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
                {sendItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />} ส่งไอเทม
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* TAB 3: POINT */}
        <TabsContent value="point" className="space-y-4">
          <GlassCard className="p-5">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">🎯 เป้าหมาย</label>
                <div className="flex gap-2">
                  <CustomSelect value={pointTargetType} onChange={setPointTargetType} placeholder="เลือกเป้าหมาย"
                    options={[{ value: 'id', label: '👤 Player ID' }, { value: 'online', label: '🟢 Online Players' }, { value: 'all', label: '🌐 All Players' }]}
                    className="w-44" />
                  {pointTargetType === 'id' && (
                    <input type="text" placeholder="UserID" value={pointTargetId} onChange={e => setPointTargetId(e.target.value)}
                      className="h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 flex-1" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">ประเภทพ้อยท์</label>
                  <CustomSelect value={pointType} onChange={setPointType} options={pointTypes} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">จำนวน</label>
                  <input type="number" min="0" value={pointAmount} onChange={e => setPointAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleUpdatePoint('add')} disabled={updatePoint.isPending} className="bg-success hover:bg-success/80 text-white flex-1">
                  {updatePoint.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} เพิ่ม
                </Button>
                <Button onClick={() => handleUpdatePoint('subtract')} disabled={updatePoint.isPending} className="bg-danger hover:bg-danger/80 text-white flex-1">
                  {updatePoint.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Minus className="w-4 h-4 mr-1" />} ลด
                </Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* TAB 4: HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="UserID..." value={historyInput} onChange={e => setHistoryInput(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
              </div>
              <CustomSelect value={historyType} onChange={setHistoryType} placeholder="ทุกประเภท"
                options={[{ value: '', label: 'ทุกประเภท' }, ...historyTypes]}
                className="w-40" />
              <Button onClick={handleHistorySearch} className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
            </div>
          </GlassCard>
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto p-4">
              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
              ) : playerHistory && playerHistory.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">แหล่ง</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">รายละเอียด</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerHistory.map((h, i) => (
                      <tr key={i} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{h.source || '—'}</td>
                        <td className="px-3 py-2">
                          <p className="text-xs text-foreground">
                            {Object.entries(h).filter(([k]) => !['source', 'Date', 'LogDate', 'ActionDate'].includes(k))
                              .slice(0, 3).map(([k, v]) => `${k}: ${fmt(v)}`).join(' · ')}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground text-right">{fmtDate(h.Date || h.LogDate || h.ActionDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">{historyId ? 'ไม่มีประวัติ' : 'กรุณาเลือก UserID'}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* TAB 5: GM LOGS */}
        <TabsContent value="logs" className="space-y-4">
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              {logsData?.logs && logsData.logs.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">RecordID</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">GM</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Command</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.logs.map((log, i) => (
                      <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{log.RecordID || log.GmCmdNum || '—'}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground">{log.GMCharName || log.GMUserID || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[300px] truncate">{log.GMCommand || log.GmCmd || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground text-right">{fmtDate(log.Date || log.LogDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Swords className="w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">ไม่มีบันทึก GM</p>
                </div>
              )}
            </div>
            {(logsData?.total || 0) > logLimit && (
              <div className="flex justify-between p-4 border-t border-white/[0.05]">
                <Button variant="outline" size="sm" disabled={logOffset === 0} onClick={() => setLogOffset(o => Math.max(0, o - logLimit))}>ก่อนหน้า</Button>
                <span className="text-xs text-muted-foreground self-center">{(logsData?.total || 0).toLocaleString()} รายการ</span>
                <Button variant="outline" size="sm" disabled={logOffset + logLimit >= (logsData?.total || 0)} onClick={() => setLogOffset(o => o + logLimit)}>ถัดไป</Button>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* TAB 6: ITEM TRACKING */}
        <TabsContent value="tracking" className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="UserID..." value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setTrackingUid(trackingInput)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
              </div>
              <Button onClick={() => setTrackingUid(trackingInput)} className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
              {trackingUid && (
                <Button variant="outline" onClick={() => { setTrackingUid(''); setTrackingInput(''); }}><X className="w-4 h-4" /></Button>
              )}
            </div>
          </GlassCard>

          {trackingLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>}

          {tracking && !trackingLoading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center"><Package className="w-4.5 h-4.5 text-blue" /></div>
                    <div><p className="text-xs text-muted-foreground font-medium">ทั้งหมด</p><p className="text-xl font-bold text-foreground">{tracking.total || 0}</p></div>
                  </div>
                </GlassCard>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-success/12 flex items-center justify-center"><ShoppingBag className="w-4.5 h-4.5 text-success" /></div>
                    <div><p className="text-xs text-muted-foreground font-medium">✅ รับแล้ว</p><p className="text-xl font-bold text-success">{tracking.received || 0}</p></div>
                  </div>
                </GlassCard>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-warning/12 flex items-center justify-center"><Send className="w-4.5 h-4.5 text-warning" /></div>
                    <div><p className="text-xs text-muted-foreground font-medium">⏳ รอรับ</p><p className="text-xl font-bold text-warning">{tracking.pending || 0}</p></div>
                  </div>
                </GlassCard>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-danger/12 flex items-center justify-center"><X className="w-4.5 h-4.5 text-danger" /></div>
                    <div><p className="text-xs text-muted-foreground font-medium">❌ ไม่ถึง</p><p className="text-xl font-bold text-danger">{tracking.failed || 0}</p></div>
                  </div>
                </GlassCard>
              </div>

              {/* Item Table */}
              <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  {tracking.items && tracking.items.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">#</th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">Product</th>
                          <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">จำนวน</th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">แหล่ง</th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">วันที่ส่ง</th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">สถานะ</th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ส่งโดย</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tracking.items.map((item, i) => (
                          <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{item.ref_id}</td>
                            <td className="px-4 py-2.5 text-sm text-foreground">#{item.product_num}</td>
                            <td className="px-4 py-2.5 text-center text-sm text-foreground">{item.quantity || item.price || '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.source === 'ShopPurchase' ? '🛒 ร้านค้า' : '📦 GMC'}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(item.sent_date)}</td>
                            <td className="px-4 py-2.5">
                              {item.status === 'received' ? <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-full font-medium">✅ รับแล้ว</span>
                                : item.status === 'pending' ? <span className="text-xs bg-warning/15 text-warning px-2 py-0.5 rounded-full font-medium">⏳ รอรับ</span>
                                : <span className="text-xs bg-danger/15 text-danger px-2 py-0.5 rounded-full font-medium">❌ ไม่ถึง</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.sent_by || item.source === 'ItemGiftHistory' ? 'GM' : 'ระบบ'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Search className="w-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium">{trackingUid ? 'ไม่มีประวัติไอเทม' : 'กรุณาค้นหา UserID'}</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Notice Dialog */}
      <AlertDialog open={noticeDialog.open} onOpenChange={() => !sendNotice.isPending && setNoticeDialog({ open: false, target: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-gold" /> ประกาศ</AlertDialogTitle>
            <AlertDialogDescription>ประกาศถึง {noticeDialog.target}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">หัวข้อ</label>
              <input type="text" value={noticeSubject} onChange={e => setNoticeSubject(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">เนื้อหา</label>
              <textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 resize-none" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendNotice.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendNotice} disabled={sendNotice.isPending} className="bg-gold text-[#08080e]">
              {sendNotice.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageSquare className="w-4 h-4 mr-1" />} ส่งประกาศ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={!!blockTarget} onOpenChange={() => !blockPlayer.isPending && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-danger" /> ยืนยันการบล็อก</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการบล็อกผู้ใช้ <strong className="text-foreground">{blockTarget?.UserID}</strong> (ID: {blockTarget?.UserNum}) ใช่หรือไม่?
              <br /><br />
              ผู้เล่นจะไม่สามารถเข้าสู่ระบบได้จนกว่าจะปลดบล็อก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockPlayer.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} disabled={blockPlayer.isPending} className="bg-danger hover:bg-danger/80 text-white">
              {blockPlayer.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />} บล็อกผู้เล่น
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Gmc;

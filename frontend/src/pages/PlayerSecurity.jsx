import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, AlertTriangle, Ban, Unlock, Loader2, Monitor, Wifi, Clock, History, Fingerprint, ChevronLeft, ChevronRight, Eye, Gamepad2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useGamePlayers, useSecurityInfo, useLoginLogs, useDeviceChecks, useBlockHistory, useBanIP, useBanPC, useUnban } from '@/hooks/use-game';
import { GlassCard } from '@/components/game/GlassCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomSelect } from '@/components/game/CustomSelect';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_OPTIONS = [10, 25, 50, 100, 200];

function PlayerSecurity() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [selectedUid, setSelectedUid] = useState(null);
  const [banMode, setBanMode] = useState(null);
  const [banValue, setBanValue] = useState('');
  const [banReason, setBanReason] = useState('');
  const [unbanDialog, setUnbanDialog] = useState(null);

  const { data: listData, isFetching: listLoading } = useGamePlayers({ search: searchQuery, limit: pageSize, offset });
  const players = listData?.players || [];
  const total = listData?.total || 0;

  const { data: securityInfo, isFetching: infoLoading } = useSecurityInfo(selectedUid);
  const { data: loginLogs, isFetching: logsLoading } = useLoginLogs(selectedUid, { limit: 50, offset: 0 });
  const { data: deviceChecks, isFetching: deviceLoading } = useDeviceChecks(selectedUid, { limit: 50, offset: 0 });
  const { data: blockHistory, isFetching: blockLoading } = useBlockHistory(selectedUid);

  const banIP = useBanIP();
  const banPC = useBanPC();
  const unban = useUnban();

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
    setOffset(0);
    setSelectedUid(null);
  }, [searchInput]);

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setOffset(0);
  };

  const openBanDialog = (mode, value) => {
    setBanMode(mode);
    setBanValue(value);
    setBanReason('');
  };

  const handleBanConfirm = () => {
    if (!banReason.trim()) { toast.error('กรุณากรอกเหตุผล'); return; }
    const mutate = banMode === 'ip' ? banIP : banPC;
    const payload = banMode === 'ip' ? { ip: banValue, reason: banReason } : { hwid: banValue, reason: banReason };
    mutate.mutate(payload, {
      onSuccess: () => { toast.success(banMode === 'ip' ? 'แบน IP สำเร็จ' : 'แบน PC สำเร็จ'); setBanMode(null); },
      onError: (e) => toast.error(e?.response?.data?.error || 'เกิดข้อผิดพลาด'),
    });
  };

  const handleUnban = (value, type) => {
    unban.mutate({ value, type }, {
      onSuccess: () => { toast.success('ปลดแบนสำเร็จ'); setUnbanDialog(null); },
      onError: (e) => toast.error(e?.response?.data?.error || 'เกิดข้อผิดพลาด'),
    });
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('th-TH') : '-';
  const isPending = banIP.isPending || banPC.isPending;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary + Search */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-blue" /></div>
          <div><p className="text-[10px] text-muted-foreground">บัญชีทั้งหมด</p><p className="text-lg font-bold text-foreground">{total.toLocaleString()}</p></div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0"><Gamepad2 className="w-4 h-4 text-gold" /></div>
          <div><p className="text-[10px] text-muted-foreground">จำนวนที่แสดง</p><p className="text-lg font-bold text-foreground">{players.length}</p></div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3 col-span-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" placeholder="ค้นหาด้วย UserID..." value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/40 transition-all"
            />
          </div>
          <Button onClick={handleSearch} size="sm" disabled={listLoading} className="bg-gold hover:bg-gold-light text-[#08080e] flex-shrink-0">
            {listLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </Button>
        </GlassCard>
      </div>

      {/* Main: Player List + Security Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Player List */}
        <div className="xl:col-span-1">
          <GlassCard className="overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">รายชื่อผู้เล่น</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">แสดง</span>
                <CustomSelect
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  options={PAGE_OPTIONS.map(v => ({ value: v, label: String(v) }))}
                  className="w-14"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {listLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
              ) : players.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Shield className="w-8 h-8 opacity-30" />
                  <p className="text-xs">ไม่พบผู้เล่น</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['ID', 'Username', 'IP', 'HWID', ''].map(h => (
                        <th key={h} className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <motion.tr key={p.UserNum} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                        className={`border-b border-white/[0.04] transition-colors cursor-pointer ${selectedUid === p.UserID ? 'bg-gold/5' : 'hover:bg-white/[0.02]'}`}
                        onClick={() => setSelectedUid(p.UserID)}>
                        <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground">{p.UserNum}</td>
                        <td className="py-2.5 px-3">
                          <p className="text-xs font-medium text-foreground">{p.UserID}</p>
                          {p.UserFullName && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{p.UserFullName}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono text-foreground truncate max-w-[100px]" title={p.UserIP || p.LastIP}>{p.UserIP || p.LastIP || '-'}</td>
                        <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground truncate max-w-[80px]" title={p.UserPCIDHWID}>{p.UserPCIDHWID || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Button variant="ghost" size="sm-icon" onClick={(e) => { e.stopPropagation(); setSelectedUid(p.UserID); }}
                            className={`${selectedUid === p.UserID ? 'text-gold' : 'text-muted-foreground'} hover:text-gold`}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination */}
            {total > pageSize && (
              <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{total} รายการ</p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={offset === 0 || listLoading} onClick={() => setOffset(Math.max(0, offset - pageSize))}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground">{offset + 1}-{Math.min(offset + pageSize, total)}</span>
                  <Button variant="ghost" size="sm" disabled={offset + pageSize >= total || listLoading} onClick={() => setOffset(offset + pageSize)}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Security Detail */}
        <div className="xl:col-span-2">
          {!selectedUid ? (
            <GlassCard className="p-10 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Shield className="w-10 h-10 opacity-30" />
                <p className="text-sm">เลือกผู้เล่นจากรายการเพื่อดูข้อมูลความปลอดภัย</p>
              </div>
            </GlassCard>
          ) : infoLoading ? (
            <GlassCard className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></GlassCard>
          ) : !securityInfo ? (
            <GlassCard className="p-10 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 text-warning/60" />
                <p className="text-sm">ไม่พบข้อมูลผู้ใช้ <strong className="text-foreground">{selectedUid}</strong></p>
              </div>
            </GlassCard>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
              {/* Account Info */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{selectedUid}</h3>
                    <p className="text-[10px] text-muted-foreground">UserNum: {securityInfo.user_num}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Wifi className="w-3 h-3" /> IP ล่าสุด</div>
                    <p className="text-xs font-mono text-foreground">{securityInfo.last_ip || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Fingerprint className="w-3 h-3" /> HWID</div>
                    <p className="text-xs font-mono text-foreground truncate" title={securityInfo.hwid}>{securityInfo.hwid || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Monitor className="w-3 h-3" /> PCID</div>
                    <p className="text-xs font-mono text-foreground truncate" title={securityInfo.pc_id}>{securityInfo.pc_id || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Clock className="w-3 h-3" /> เข้าสู่ระบบล่าสุด</div>
                    <p className="text-xs text-muted-foreground">{fmtDate(securityInfo.last_login)}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Tabs */}
              <GlassCard className="overflow-hidden p-0">
                <Tabs defaultValue="login" className="w-full">
                  <div className="px-5 pt-4">
                    <TabsList className="bg-white/[0.04]">
                      <TabsTrigger value="login" className="text-xs gap-1.5"><History className="w-3.5 h-3.5" />ประวัติล็อกอิน</TabsTrigger>
                      <TabsTrigger value="device" className="text-xs gap-1.5"><Monitor className="w-3.5 h-3.5" />Device Check</TabsTrigger>
                      <TabsTrigger value="block" className="text-xs gap-1.5"><Ban className="w-3.5 h-3.5" />Block History</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="login" className="m-0">
                    <div className="p-5">
                      {logsLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
                      : loginLogs?.logs?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead><tr className="border-b border-white/[0.06]">
                              {['#', 'สถานะ', 'IP', 'HWID', 'MAC', 'PCID', 'วันที่'].map(h => (
                                <th key={h} className="py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>{loginLogs.logs.map(log => (
                              <tr key={log.LoginNum} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-3 text-xs text-muted-foreground">{log.LoginNum}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${log.LogInOut === 1 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                    {log.LogInOut === 1 ? '🟢 เข้า' : '🔴 ออก'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-foreground font-mono">{log.LogIpAddress || '-'}</td>
                                <td className="py-2.5 px-3 text-xs text-foreground font-mono truncate max-w-[100px]" title={log.LogHWID}>{log.LogHWID || '-'}</td>
                                <td className="py-2.5 px-3 text-xs text-foreground font-mono truncate max-w-[100px]" title={log.LogMAC}>{log.LogMAC || '-'}</td>
                                <td className="py-2.5 px-3 text-xs text-foreground font-mono truncate max-w-[100px]" title={log.LogPCID}>{log.LogPCID || '-'}</td>
                                <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.LogDate)}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                          <History className="w-8 h-8 opacity-30" /><p className="text-xs">ไม่มีประวัติการล็อกอิน</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="device" className="m-0">
                    <div className="p-5">
                      {deviceLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
                      : deviceChecks?.checks?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead><tr className="border-b border-white/[0.06]">
                              {['#', 'IP เดิม', 'IP ใหม่', 'HWID เดิม', 'HWID ใหม่', 'วันที่'].map(h => (
                                <th key={h} className="py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>{deviceChecks.checks.map((d, i) => (
                              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-3 text-xs text-muted-foreground">{i + 1}</td>
                                <td className="py-2.5 px-3 text-xs font-mono text-foreground">{d.PrevIP || '-'}</td>
                                <td className="py-2.5 px-3 text-xs font-mono text-foreground">{d.NewIP || '-'}</td>
                                <td className="py-2.5 px-3 text-xs font-mono text-foreground truncate max-w-[90px]" title={d.PrevPCIDHWID}>{d.PrevPCIDHWID || '-'}</td>
                                <td className="py-2.5 px-3 text-xs font-mono text-foreground truncate max-w-[90px]" title={d.NewPCIDHWID}>{d.NewPCIDHWID || '-'}</td>
                                <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(d.Date)}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                          <Monitor className="w-8 h-8 opacity-30" /><p className="text-xs">ไม่มีประวัติ Device Check</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="block" className="m-0">
                    <div className="p-5">
                      {blockLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
                      : blockHistory?.blocks?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead><tr className="border-b border-white/[0.06]">
                              {['ประเภท', 'ค่า', 'เหตุผล', 'วันที่', ''].map(h => (
                                <th key={h} className="py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>{blockHistory.blocks.map((b, i) => (
                              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${b.type === 'IP' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                                    {b.type === 'IP' ? <Wifi className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}{b.type}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-foreground font-mono">{b.value}</td>
                                <td className="py-2.5 px-3 text-xs text-muted-foreground">{b.reason || '-'}</td>
                                <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(b.date)}</td>
                                <td className="py-2.5 px-3">
                                  <Button variant="ghost" size="sm-icon" onClick={() => setUnbanDialog(b)}
                                    className="text-success hover:text-success/80 hover:bg-success/10">
                                    <Unlock className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                          <Shield className="w-8 h-8 opacity-30" /><p className="text-xs">ไม่มีประวัติการแบน</p>
                        </div>
                      )}

                      {securityInfo?.last_ip && (
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                          <p className="text-xs font-semibold text-foreground mb-3">🚫 GMC Actions</p>
                          <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => openBanDialog('ip', securityInfo.last_ip)}
                              className="border-danger/20 text-danger hover:bg-danger/10">
                              <Ban className="w-3.5 h-3.5 mr-1" /> แบน IP
                            </Button>
                            {securityInfo.hwid && (
                              <Button variant="outline" size="sm" onClick={() => openBanDialog('pc', securityInfo.hwid)}
                                className="border-danger/20 text-danger hover:bg-danger/10">
                                <Monitor className="w-3.5 h-3.5 mr-1" /> แบน PC (HWID)
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>

      {/* Ban Confirm */}
      <AlertDialog open={!!banMode} onOpenChange={() => !isPending && setBanMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-danger" /> ยืนยันการแบน</AlertDialogTitle>
            <AlertDialogDescription>
              แบน {banMode === 'ip' ? 'IP' : 'PC (HWID)'}: <strong className="text-foreground font-mono">{banValue}</strong>
              <br />ผู้เล่นจะไม่สามารถเข้าสู่ระบบได้จนกว่าจะปลดแบน
              <div className="mt-3">
                <label className="text-xs text-muted-foreground mb-1 block">เหตุผล</label>
                <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="ระบุเหตุผล..."
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/40" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanConfirm} disabled={isPending} className="bg-danger hover:bg-danger/80 text-white">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />} ยืนยันการแบน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unban Confirm */}
      <AlertDialog open={!!unbanDialog} onOpenChange={() => !unban.isPending && setUnbanDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Unlock className="w-5 h-5 text-success" /> ปลดแบน</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการปลดแบน <strong className="text-foreground font-mono">{unbanDialog?.value}</strong> ({unbanDialog?.type}) ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unban.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleUnban(unbanDialog.value, unbanDialog.type.toLowerCase())}
              disabled={unban.isPending} className="bg-success hover:bg-success/80 text-white">
              {unban.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Unlock className="w-4 h-4 mr-1" />} ปลดแบน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PlayerSecurity;

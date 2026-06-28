import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Ban, Unlock, Loader2, Wifi, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useIPBans, usePCBans, useBanManagerStats, useBanIPFromManager, useBanPCFromManager, useUnbanFromManager } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { CustomSelect } from '@/components/game/CustomSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_OPTIONS = [10, 25, 50, 100, 200];
const fmtDate = (d) => d ? new Date(d).toLocaleString('th-TH') : '—';

function BanManager() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState('ip');
  const [pageSize, setPageSize] = useState(50);
  const [banDialog, setBanDialog] = useState(null);
  const [banValue, setBanValue] = useState('');
  const [banReason, setBanReason] = useState('');
  const [unbanTarget, setUnbanTarget] = useState(null);

  const { data: ipData, isFetching: ipLoading } = useIPBans({ search, limit: pageSize, offset: tab === 'ip' ? offset : 0 });
  const { data: pcData, isFetching: pcLoading } = usePCBans({ search, limit: pageSize, offset: tab === 'pc' ? offset : 0 });
  const { data: stats } = useBanManagerStats();

  const banIP = useBanIPFromManager();
  const banPC = useBanPCFromManager();
  const unban = useUnbanFromManager();

  const ipBans = ipData?.bans || [];
  const pcBans = pcData?.bans || [];
  const ipTotal = ipData?.total || 0;
  const pcTotal = pcData?.total || 0;

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setOffset(0); };
  const handlePageSizeChange = (size) => { setPageSize(size); setOffset(0); };

  const openBanDialog = (mode) => { setBanDialog(mode); setBanValue(''); setBanReason(''); };

  const handleBanConfirm = () => {
    if (!banValue.trim()) { toast.error('กรุณากรอกค่า'); return; }
    if (!banReason.trim()) { toast.error('กรุณากรอกเหตุผล'); return; }
    const mutate = banDialog === 'ip' ? banIP : banPC;
    const payload = banDialog === 'ip' ? { ip: banValue.trim(), reason: banReason.trim() } : { hwid: banValue.trim(), reason: banReason.trim() };
    mutate.mutate(payload, {
      onSuccess: () => { toast.success(banDialog === 'ip' ? 'แบน IP สำเร็จ' : 'แบน PC สำเร็จ'); setBanDialog(null); },
      onError: (e) => toast.error(e?.response?.data?.error || 'เกิดข้อผิดพลาด'),
    });
  };

  const handleUnban = () => {
    if (!unbanTarget) return;
    unban.mutate({ value: unbanTarget.value, type: unbanTarget.type }, {
      onSuccess: () => { toast.success('ปลดแบนสำเร็จ'); setUnbanTarget(null); },
      onError: (e) => toast.error(e?.response?.data?.error || 'ปลดแบนไม่สำเร็จ'),
    });
  };

  const handleTabChange = (v) => { setTab(v); setOffset(0); };

  const IPRow = ({ b, i }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{offset + i + 1}</td>
      <td className="py-2.5 px-3 text-xs font-mono text-foreground">{b.BlockAddress}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{b.BlockReason || '—'}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(b.BlockDate)}</td>
      <td className="py-2.5 px-3 text-right">
        <Button variant="ghost" size="sm-icon" onClick={() => setUnbanTarget({ value: b.BlockAddress, type: 'ip' })}
          className="text-success hover:text-success/80 hover:bg-success/10"><Unlock className="w-3.5 h-3.5" /></Button>
      </td>
    </tr>
  );

  const PCRow = ({ b, i }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{offset + i + 1}</td>
      <td className="py-2.5 px-3 text-xs font-mono text-foreground truncate max-w-[120px]" title={b.BlockHWID}>{b.BlockHWID || '—'}</td>
      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground truncate max-w-[100px]" title={b.BlockMAC}>{b.BlockMAC || '—'}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{b.BlockReason || '—'}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(b.BlockDate)}</td>
      <td className="py-2.5 px-3 text-right">
        <Button variant="ghost" size="sm-icon"
          onClick={() => { const val = b.BlockHWID || b.BlockMAC; if (val) setUnbanTarget({ value: val, type: b.BlockHWID ? 'pc' : 'mac' }); }}
          className="text-success hover:text-success/80 hover:bg-success/10"><Unlock className="w-3.5 h-3.5" /></Button>
      </td>
    </tr>
  );

  const isPending = banIP.isPending || banPC.isPending;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-danger/12 flex items-center justify-center"><Ban className="w-4.5 h-4.5 text-danger" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">IP Bans</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={stats?.ip_bans || 0} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-warning/12 flex items-center justify-center"><Monitor className="w-4.5 h-4.5 text-warning" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">PC Bans</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={stats?.pc_bans || 0} /></p></div>
          </div>
        </GlassCard>
      </div>

      {/* Search + Actions */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="ค้นหา IP, HWID, MAC, เหตุผล..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
            </div>
            <Button type="submit" className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
          </form>
          <div className="flex gap-2">
            <Button onClick={() => openBanDialog('ip')} variant="outline" className="border-danger/20 text-danger hover:bg-danger/10">
              <Ban className="w-4 h-4 mr-1" /> แบน IP
            </Button>
            <Button onClick={() => openBanDialog('pc')} variant="outline" className="border-danger/20 text-danger hover:bg-danger/10">
              <Monitor className="w-4 h-4 mr-1" /> แบน PC
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Ban List */}
      <GlassCard className="overflow-hidden p-0">
        <Tabs defaultValue="ip" onValueChange={handleTabChange} className="w-full">
          <div className="px-5 pt-4">
            <TabsList className="bg-white/[0.04]">
              <TabsTrigger value="ip" className="text-xs gap-1.5"><Wifi className="w-3.5 h-3.5" />IP Bans ({ipTotal})</TabsTrigger>
              <TabsTrigger value="pc" className="text-xs gap-1.5"><Monitor className="w-3.5 h-3.5" />PC Bans ({pcTotal})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ip" className="m-0">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{ipTotal} รายการ</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">แสดง</span>
                <CustomSelect value={pageSize} onChange={handlePageSizeChange}
                  options={PAGE_OPTIONS.map(v => ({ value: v, label: String(v) }))} className="w-14" />
              </div>
            </div>
            <div className="overflow-x-auto">
              {ipLoading ? (
                <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
              ) : ipBans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Wifi className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่มี IP Bans</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">#</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">IP Address</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">เหตุผล</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">วันที่</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>{ipBans.map((b, i) => <IPRow key={b.BlockIdx || i} b={b} i={i} />)}</tbody>
                </table>
              )}
            </div>
            {ipTotal > pageSize && (
              <div className="flex justify-between p-4 border-t border-white/[0.05]">
                <Button variant="outline" size="sm" disabled={offset === 0 || ipLoading} onClick={() => setOffset(o => Math.max(0, o - pageSize))}>ก่อนหน้า</Button>
                <span className="text-xs text-muted-foreground self-center">{offset + 1}-{Math.min(offset + pageSize, ipTotal)} / {ipTotal}</span>
                <Button variant="outline" size="sm" disabled={offset + pageSize >= ipTotal || ipLoading} onClick={() => setOffset(o => o + pageSize)}>ถัดไป</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pc" className="m-0">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{pcTotal} รายการ</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">แสดง</span>
                <CustomSelect value={pageSize} onChange={handlePageSizeChange}
                  options={PAGE_OPTIONS.map(v => ({ value: v, label: String(v) }))} className="w-14" />
              </div>
            </div>
            <div className="overflow-x-auto">
              {pcLoading ? (
                <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
              ) : pcBans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Monitor className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่มี PC Bans</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">#</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">HWID</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">MAC</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">เหตุผล</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">วันที่</th>
                      <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-3 py-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>{pcBans.map((b, i) => <PCRow key={b.BlockIdx || i} b={b} i={i} />)}</tbody>
                </table>
              )}
            </div>
            {pcTotal > pageSize && (
              <div className="flex justify-between p-4 border-t border-white/[0.05]">
                <Button variant="outline" size="sm" disabled={offset === 0 || pcLoading} onClick={() => setOffset(o => Math.max(0, o - pageSize))}>ก่อนหน้า</Button>
                <span className="text-xs text-muted-foreground self-center">{offset + 1}-{Math.min(offset + pageSize, pcTotal)} / {pcTotal}</span>
                <Button variant="outline" size="sm" disabled={offset + pageSize >= pcTotal || pcLoading} onClick={() => setOffset(o => o + pageSize)}>ถัดไป</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </GlassCard>

      {/* Ban Dialog */}
      <Dialog open={!!banDialog} onOpenChange={() => !isPending && setBanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-danger" /> แบน{banDialog === 'ip' ? ' IP' : ' PC'}</DialogTitle>
            <DialogDescription>กรอกข้อมูลเพื่อเพิ่มเข้าตารางแบน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{banDialog === 'ip' ? 'IP Address' : 'HWID'}</label>
              <input type="text" value={banValue} onChange={e => setBanValue(e.target.value)}
                placeholder={banDialog === 'ip' ? 'เช่น 192.168.1.1' : 'เช่น ABC123...'}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">เหตุผล</label>
              <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="ระบุเหตุผล..."
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setBanDialog(null)}>ยกเลิก</Button>
            <Button onClick={handleBanConfirm} disabled={isPending} className="bg-danger hover:bg-danger/80 text-white">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />} แบน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban Confirm */}
      <AlertDialog open={!!unbanTarget} onOpenChange={() => !unban.isPending && setUnbanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Unlock className="w-5 h-5 text-success" /> ปลดแบน</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการปลดแบน <strong className="text-foreground font-mono">{unbanTarget?.value}</strong> ({unbanTarget?.type}) ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unban.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnban} disabled={unban.isPending} className="bg-success hover:bg-success/80 text-white">
              {unban.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Unlock className="w-4 h-4 mr-1" />} ปลดแบน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BanManager;

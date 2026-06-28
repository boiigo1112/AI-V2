import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, TicketPlus, Loader2, Pencil, Trash2, Eye, Copy, CheckCircle2, XCircle, Gift, Coins, Crown, TicketCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, useCouponUsage, useRedeemCoupon } from '@/hooks/use-coupons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { CustomSelect } from '@/components/game/CustomSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_OPTIONS = [10, 25, 50, 100, 200];
const fmtDate = (d) => d ? new Date(d).toLocaleString('th-TH') : '—';
const rewardTypeMeta = {
  item: { label: 'ไอเทม', icon: Gift, color: '#c9a84c' },
  point: { label: 'Point', icon: Coins, color: '#34d399' },
  vip: { label: 'VIP', icon: Crown, color: '#818cf8' },
};

function Coupons() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [showUsage, setShowUsage] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemUserNum, setRedeemUserNum] = useState('');
  const [form, setForm] = useState({ code: '', description: '', reward_type: 'item', reward_value: 0, reward_qty: 1, max_uses: 0, expires_at: '' });

  const { data: listData, isLoading } = useCoupons({ search, limit: pageSize, offset });
  const { data: usageData, isFetching: usageLoading } = useCouponUsage(showUsage, { limit: 50, offset: 0 });
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const redeemCoupon = useRedeemCoupon();

  const coupons = listData?.coupons || [];
  const total = listData?.total || 0;

  const activeCount = useMemo(() => coupons.filter(c => c.is_active).length, [coupons]);
  const expiredCount = useMemo(() => {
    const now = new Date();
    return coupons.filter(c => c.expires_at && new Date(c.expires_at) < now).length;
  }, [coupons]);
  const totalRedeemed = useMemo(() => coupons.reduce((s, c) => s + c.used_count, 0), [coupons]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setOffset(0); };
  const handlePageSizeChange = (size) => { setPageSize(size); setOffset(0); };

  const resetForm = () => setForm({ code: '', description: '', reward_type: 'item', reward_value: 0, reward_qty: 1, max_uses: 0, expires_at: '' });

  const handleCreate = async () => {
    try {
      const payload = { ...form };
      payload.expires_at = payload.expires_at ? new Date(payload.expires_at).toISOString() : null;
      await createCoupon.mutateAsync(payload);
      toast.success('สร้างโค้ดสำเร็จ');
      setCreateOpen(false);
      resetForm();
    } catch (err) { toast.error(err?.response?.data?.error || 'สร้างไม่สำเร็จ'); }
  };

  const handleEdit = async () => {
    try {
      const payload = {};
      if (editData.description !== undefined) payload.description = editData.description;
      if (editData.reward_value !== undefined) payload.reward_value = editData.reward_value;
      if (editData.reward_qty !== undefined) payload.reward_qty = editData.reward_qty;
      if (editData.max_uses !== undefined) payload.max_uses = editData.max_uses;
      if (editData.is_active !== undefined) payload.is_active = editData.is_active;
      if (editData.expires_at !== undefined) payload.expires_at = editData.expires_at ? new Date(editData.expires_at).toISOString() : null;
      await updateCoupon.mutateAsync({ id: editData.id, ...payload });
      toast.success('อัปเดตโค้ดสำเร็จ');
      setEditOpen(false);
      setEditData(null);
    } catch (err) { toast.error(err?.response?.data?.error || 'อัปเดตไม่สำเร็จ'); }
  };

  const handleDelete = async () => {
    try {
      await deleteCoupon.mutateAsync(deleteTarget);
      toast.success('ลบโค้ดสำเร็จ');
      setDeleteTarget(null);
    } catch (err) { toast.error(err?.response?.data?.error || 'ลบไม่สำเร็จ'); }
  };

  const copyCode = (code) => { navigator.clipboard.writeText(code); toast.success('คัดลอกโค้ดแล้ว'); };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) { toast.error('กรุณากรอกโค้ด'); return; }
    if (!redeemUserNum.trim()) { toast.error('กรุณากรอก UserNum'); return; }
    try {
      await redeemCoupon.mutateAsync({ code: redeemCode.trim(), user_num: Number(redeemUserNum), ip_address: '' });
      toast.success('ใช้โค้ดสำเร็จ');
      setRedeemOpen(false);
      setRedeemCode('');
      setRedeemUserNum('');
    } catch (err) { toast.error(err?.response?.data?.error || 'ใช้โค้ดไม่สำเร็จ'); }
  };

  const statusBadge = (c) => {
    const now = new Date();
    if (!c.is_active) return { label: 'ปิด', color: 'text-muted-foreground', bg: 'bg-white/[0.05]' };
    if (c.expires_at && new Date(c.expires_at) < now) return { label: 'หมดอายุ', color: 'text-danger', bg: 'bg-danger/10' };
    if (c.max_uses > 0 && c.used_count >= c.max_uses) return { label: 'เต็ม', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'active', color: 'text-success', bg: 'bg-success/10' };
  };

  const RewardIcon = ({ type }) => {
    const meta = rewardTypeMeta[type] || rewardTypeMeta.item;
    const Icon = meta.icon;
    return <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gold/12 flex items-center justify-center"><TicketPlus className="w-4.5 h-4.5 text-gold" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">โค้ดทั้งหมด</p><p className="text-xl font-bold text-foreground"><AnimatedCounter value={total} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-success/12 flex items-center justify-center"><CheckCircle2 className="w-4.5 h-4.5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">ใช้งานได้</p><p className="text-xl font-bold text-success"><AnimatedCounter value={activeCount} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-danger/12 flex items-center justify-center"><XCircle className="w-4.5 h-4.5 text-danger" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">หมดอายุ</p><p className="text-xl font-bold text-danger"><AnimatedCounter value={expiredCount} /></p></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center"><Gift className="w-4.5 h-4.5 text-blue" /></div>
            <div><p className="text-xs text-muted-foreground font-medium">ใช้แล้ว</p><p className="text-xl font-bold text-blue"><AnimatedCounter value={totalRedeemed} /></p></div>
          </div>
        </GlassCard>
      </div>

      {/* Search + Create */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="ค้นหาโค้ด..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors" />
            </div>
            <Button type="submit" className="bg-gold hover:bg-gold-light text-[#08080e]"><Search className="w-4 h-4" /></Button>
          </form>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="bg-gold hover:bg-gold-light text-[#08080e]">
            <TicketPlus className="w-4 h-4 mr-1" /> สร้างโค้ด
          </Button>
          <Button variant="outline" onClick={() => setRedeemOpen(true)} className="border-success/30 text-success hover:bg-success/10">
            <TicketCheck className="w-4 h-4 mr-1" /> ใช้โค้ด
          </Button>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground">คูปอง / Gift Code</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">แสดง</span>
            <CustomSelect value={pageSize} onChange={handlePageSizeChange}
              options={PAGE_OPTIONS.map(v => ({ value: v, label: String(v) }))} className="w-14" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <TicketPlus className="w-10 mb-3 opacity-30" /><p className="text-sm font-medium">ไม่มีคูปอง</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">โค้ด</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">รายละเอียด</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">รางวัล</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">ใช้แล้ว/จำกัด</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">หมดอายุ</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">สถานะ</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-gold bg-gold/5 px-1.5 py-0.5 rounded">{c.code}</code>
                        <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-gold transition-colors">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{c.description || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <RewardIcon type={c.reward_type} />
                        <span className="text-xs font-semibold text-foreground">
                          {c.reward_type === 'point' ? `${c.reward_value?.toLocaleString()} P` :
                           c.reward_type === 'vip' ? `${c.reward_value} วัน` :
                           `Item #${c.reward_value} x${c.reward_qty}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{c.used_count}{c.max_uses > 0 ? `/${c.max_uses}` : ''}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{c.expires_at ? fmtDate(c.expires_at) : 'ไม่จำกัด'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge(c).bg} ${statusBadge(c).color}`}>{statusBadge(c).label}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setShowUsage(c.id)} title="ประวัติการใช้"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => { setEditData(c); setEditOpen(true); }} title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(c.id)} title="ลบ"><Trash2 className="w-3.5 h-3.5 text-danger" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
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

      {/* Usage Sheet */}
      {showUsage && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground">📋 ประวัติการใช้ (ID: {showUsage})</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowUsage(null)}>ปิด</Button>
          </div>
          {usageLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
          ) : usageData?.usage?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">UserNum</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">UserID</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">วันที่</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.usage.map(u => (
                    <tr key={u.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-3 py-2 text-xs font-mono text-foreground">{u.user_num}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{u.user_id || '—'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(u.used_at)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{u.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground mt-2">ทั้งหมด {usageData.total} รายการ</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มีการใช้โค้ดนี้</p>
          )}
        </GlassCard>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>สร้างโค้ดของขวัญ</DialogTitle><DialogDescription>กรอกข้อมูลเพื่อสร้างโค้ดใหม่ (เว้นโค้ดว่าง = สุ่ม)</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">โค้ด (เว้นว่าง = สุ่ม)</label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">คำอธิบาย</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">ประเภท</label>
              <div className="flex gap-2">
                {Object.entries(rewardTypeMeta).map(([key, meta]) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, reward_type: key }))}
                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all border ${form.reward_type === key
                      ? 'border-gold/50 bg-gold/10 text-gold shadow-sm' : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/[0.15]'}`}>
                    <meta.icon className="w-4 h-4" style={{ color: form.reward_type === key ? meta.color : undefined }} /> {meta.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{form.reward_type === 'point' ? 'จำนวน Point' : form.reward_type === 'vip' ? 'จำนวนวัน' : 'ProductNum / ItemID'}</label>
                <input type="number" value={form.reward_value} onChange={e => setForm(f => ({ ...f, reward_value: Number(e.target.value) }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">จำนวน</label>
                <input type="number" min="1" value={form.reward_qty} onChange={e => setForm(f => ({ ...f, reward_qty: Math.max(1, Number(e.target.value)) }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">ใช้ได้กี่ครั้ง (0 = ไม่จำกัด)</label>
              <input type="number" min="0" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">หมดอายุ (เว้นว่าง = ไม่หมดอายุ)</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={createCoupon.isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
              {createCoupon.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={() => { setEditOpen(false); setEditData(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>แก้ไขโค้ด</DialogTitle><DialogDescription>{editData?.code}</DialogDescription></DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">คำอธิบาย</label>
                <input type="text" value={editData.description || ''} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">เปิดใช้งาน</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setEditData(d => ({ ...d, is_active: true }))}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all border ${editData.is_active
                      ? 'border-success/50 bg-success/10 text-success shadow-sm' : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground'}`}>
                    ✅ active
                  </button>
                  <button type="button"
                    onClick={() => setEditData(d => ({ ...d, is_active: false }))}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all border ${!editData.is_active
                      ? 'border-danger/50 bg-danger/10 text-danger shadow-sm' : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground'}`}>
                    ❌ ปิด
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">ใช้งานได้สูงสุด</label>
                  <input type="number" min="0" value={editData.max_uses} onChange={e => setEditData(d => ({ ...d, max_uses: Number(e.target.value) }))}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">ใช้แล้ว</label>
                  <div className="h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-foreground flex items-center">{editData.used_count}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">หมดอายุ</label>
                <input type="datetime-local" value={editData.expires_at ? editData.expires_at.slice(0, 16) : ''} onChange={e => setEditData(d => ({ ...d, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditData(null); }}>ยกเลิก</Button>
            <Button onClick={handleEdit} disabled={updateCoupon.isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
              {updateCoupon.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ใช้โค้ดของขวัญ</DialogTitle><DialogDescription>ป้อนโค้ดและ UserNum ของผู้เล่นเพื่อรับรางวัล</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">โค้ด</label>
              <input type="text" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="กรอกโค้ด..." className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">UserNum (ID ผู้เล่น)</label>
              <input type="number" value={redeemUserNum} onChange={e => setRedeemUserNum(e.target.value)}
                placeholder="เช่น 885" className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setRedeemOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleRedeem} disabled={redeemCoupon.isPending} className="bg-success hover:bg-success/80 text-white">
              {redeemCoupon.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <TicketCheck className="w-4 h-4 mr-1" />} ใช้โค้ด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => !deleteCoupon.isPending && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-danger" /> ลบคูปอง</AlertDialogTitle>
            <AlertDialogDescription>ต้องการลบคูปองนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCoupon.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteCoupon.isPending} className="bg-danger hover:bg-danger/80 text-white">
              {deleteCoupon.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />} ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Coupons;

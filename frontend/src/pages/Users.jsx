import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users as UsersIcon, UserCheck, UserPlus, Shield, Pencil, Trash2, Search, Filter, ChevronDown, MoreHorizontal, Eye } from 'lucide-react';
import { useUsers, useRoles, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/game/GlassCard';
import { AnimatedCounter } from '@/components/game/AnimatedCounter';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const userSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  full_name: z.string().optional(),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').optional().or(z.literal('')),
  role_id: z.string().min(1, 'กรุณาเลือกบทบาท'),
});

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <a href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</a>
      <span>/</span>
      <span className="text-foreground font-medium">Users</span>
    </nav>
  );
}

function SummaryCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold text-foreground">
              <AnimatedCounter value={value} duration={800} />
            </p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function Users() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewUser, setViewUser] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { username: '', email: '', full_name: '', password: '', role_id: '' },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !searchQuery ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role?.name === roleFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role?.name === 'superadmin' || u.role?.name === 'admin').length,
    new: users.filter(u => {
      const d = new Date(u.created_at);
      const week = new Date();
      week.setDate(week.getDate() - 7);
      return d >= week;
    }).length,
  }), [users]);

  const openCreate = () => {
    setEditingUser(null);
    reset({ username: '', email: '', full_name: '', password: '', role_id: '' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    reset({
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      role_id: user.role_id,
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingUser) {
        const payload = { ...data };
        if (!payload.password) delete payload.password;
        await updateUser.mutateAsync({ id: editingUser.id, ...payload });
        toast.success('อัปเดตผู้ใช้สำเร็จ');
      } else {
        await createUser.mutateAsync(data);
        toast.success('สร้างผู้ใช้สำเร็จ');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      toast.success('ลบผู้ใช้สำเร็จ');
      setDeleteTarget(null);
    } catch {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">จัดการผู้ใช้</h1>
          <p className="text-sm text-muted-foreground mt-0.5">จัดการบัญชีผู้ใช้และบทบาทในระบบ</p>
        </div>
        <Button onClick={openCreate} disabled={isLoading} className="bg-gold hover:bg-gold-light text-[#08080e] font-semibold shadow-lg shadow-gold/20">
          <UserPlus className="w-4 h-4 mr-1.5" />
          เพิ่มผู้ใช้
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={UsersIcon} label="ผู้ใช้ทั้งหมด" value={stats.total} color="#818cf8" delay={0.05} />
        <SummaryCard icon={UserCheck} label="ใช้งานอยู่" value={stats.active} color="#34d399" delay={0.1} />
        <SummaryCard icon={Shield} label="แอดมิน" value={stats.admins} color="#c9a84c" delay={0.15} />
        <SummaryCard icon={UserPlus} label="เพิ่มใหม่ (7 วัน)" value={stats.new} color="#3b82f6" delay={0.2} />
      </div>

      {/* Search + Filter Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้, อีเมล, ชื่อเต็ม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 cursor-pointer appearance-none"
            >
              <option value="all">ทุกบทบาท</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 cursor-pointer appearance-none"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งานอยู่</option>
              <option value="inactive">ระงับ</option>
            </select>
          </div>
        </div>
        {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.05]">
            <span className="text-xs text-muted-foreground">กรอง:</span>
            {searchQuery && (
              <Badge variant="secondary" className="text-[10px]">
                ค้นหา: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-foreground">×</button>
              </Badge>
            )}
            {roleFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px]">
                บทบาท: {roleFilter}
                <button onClick={() => setRoleFilter('all')} className="ml-1 hover:text-foreground">×</button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px]">
                สถานะ: {statusFilter === 'active' ? 'ใช้งาน' : 'ระงับ'}
                <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-foreground">×</button>
              </Badge>
            )}
            <button
              onClick={() => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all'); }}
              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </GlassCard>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          แสดง <span className="font-medium text-foreground">{filteredUsers.length}</span> จาก {users.length} ผู้ใช้
        </p>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UsersIcon className="w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">ไม่พบผู้ใช้</p>
              <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">ผู้ใช้</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">อีเมล</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">บทบาท</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">สถานะ</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">สร้างเมื่อ</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.25 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold bg-gold/15 text-gold flex-shrink-0">
                          {(u.full_name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.username}</p>
                          {u.full_name && <p className="text-[11px] text-muted-foreground">{u.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {u.role?.name}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                        <span className="text-xs text-muted-foreground">{u.is_active ? 'ใช้งาน' : 'ระงับ'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewUser(u)} title="ดูรายละเอียด">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)} title="แก้ไข">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(u)} title="ลบ">
                          <Trash2 className="w-3.5 h-3.5 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* View User Dialog */}
      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>รายละเอียดผู้ใช้</DialogTitle>
            <DialogDescription>{viewUser?.username}</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-3">
              {[
                { label: 'ชื่อผู้ใช้', value: viewUser.username },
                { label: 'อีเมล', value: viewUser.email },
                { label: 'ชื่อเต็ม', value: viewUser.full_name || '—' },
                { label: 'บทบาท', value: viewUser.role?.name },
                { label: 'สถานะ', value: viewUser.is_active ? 'ใช้งาน' : 'ระงับ' },
                { label: 'สร้างเมื่อ', value: formatDate(viewUser.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUser(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit User Dialog */}
      <Dialog open={showModal} onOpenChange={() => setShowModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'แก้ไขข้อมูลบัญชีผู้ใช้' : 'สร้างบัญชีผู้ใช้ใหม่ในระบบ'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ชื่อผู้ใช้</label>
              <Input {...register('username')} error={errors.username?.message} placeholder="กรอกชื่อผู้ใช้" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">อีเมล</label>
              <Input type="email" {...register('email')} error={errors.email?.message} placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ชื่อเต็ม</label>
              <Input {...register('full_name')} placeholder="ชื่อ-นามสกุล (ถ้ามี)" />
            </div>
            {!editingUser && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">รหัสผ่าน</label>
                <Input type="password" {...register('password')} error={errors.password?.message} placeholder="อย่างน้อย 6 ตัวอักษร" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">บทบาท</label>
              <select
                {...register('role_id')}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 cursor-pointer"
              >
                <option value="">เลือกบทบาท</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.role_id && <p className="text-xs text-danger mt-1">{errors.role_id.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowModal(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gold hover:bg-gold-light text-[#08080e]">
                {isSubmitting ? 'กำลังบันทึก...' : editingUser ? 'อัปเดต' : 'สร้าง'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบผู้ใช้ "{deleteTarget?.username}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-danger hover:bg-danger/80">
              {isSubmitting ? 'กำลังลบ...' : 'ลบผู้ใช้'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Users;

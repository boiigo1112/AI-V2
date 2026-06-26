import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Key, User, Shield, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/game/GlassCard';

const profileSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
  new_password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  confirm: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
}).refine((d) => d.new_password === d.confirm, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirm'],
});

function Settings() {
  const { user, refreshUser } = useAuth();

  const profile = useForm({ resolver: zodResolver(profileSchema), defaultValues: { full_name: user?.full_name || '', email: user?.email || '' } });
  const password = useForm({ resolver: zodResolver(passwordSchema) });

  const saveProfile = async (data) => {
    try {
      const payload = {};
      if (data.full_name !== (user?.full_name || '')) payload.full_name = data.full_name;
      if (data.email !== user?.email) payload.email = data.email;
      if (Object.keys(payload).length === 0) { toast.error('ไม่มีการเปลี่ยนแปลง'); return; }
      await api.put('/settings/profile', payload);
      await refreshUser();
      toast.success('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const changePassword = async (data) => {
    try {
      await api.put('/settings/password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
      password.reset({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Profile Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard glow>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-lg bg-blue/12 flex items-center justify-center">
                <User className="w-4 h-4 text-blue" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">โปรไฟล์</h2>
            </div>
            <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ชื่อผู้ใช้</label>
                <Input value={user?.username || ''} disabled className="opacity-60" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">อีเมล</label>
                <Input type="email" {...profile.register('email')} error={profile.formState.errors.email?.message} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ชื่อเต็ม</label>
                <Input {...profile.register('full_name')} />
              </div>
              <Button type="submit" disabled={profile.formState.isSubmitting} className="bg-gold hover:bg-gold-light text-[#08080e]">
                <Save className="w-4 h-4 mr-1.5" />
                {profile.formState.isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
              </Button>
            </form>
          </div>
        </GlassCard>
      </motion.div>

      {/* Password Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard glow>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-lg bg-warning/12 flex items-center justify-center">
                <Key className="w-4 h-4 text-warning" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">เปลี่ยนรหัสผ่าน</h2>
            </div>
            <form onSubmit={password.handleSubmit(changePassword)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">รหัสผ่านปัจจุบัน</label>
                <Input type="password" {...password.register('current_password')} error={password.formState.errors.current_password?.message} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">รหัสผ่านใหม่</label>
                <Input type="password" {...password.register('new_password')} error={password.formState.errors.new_password?.message} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ยืนยันรหัสผ่านใหม่</label>
                <Input type="password" {...password.register('confirm')} error={password.formState.errors.confirm?.message} />
              </div>
              <Button type="submit" disabled={password.formState.isSubmitting} className="bg-gold hover:bg-gold-light text-[#08080e]">
                <Key className="w-4 h-4 mr-1.5" />
                {password.formState.isSubmitting ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
              </Button>
            </form>
          </div>
        </GlassCard>
      </motion.div>

      {/* Role Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-lg bg-success/12 flex items-center justify-center">
                <Shield className="w-4 h-4 text-success" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">บทบาท</h2>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">บทบาทปัจจุบัน</label>
              <Input value={user?.role?.name || ''} disabled className="opacity-60 capitalize" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">ติดต่อผู้ดูแลระบบเพื่อเปลี่ยนบทบาท</p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

export default Settings;

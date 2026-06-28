import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UserCog, ArrowLeft, Shield } from 'lucide-react';
import { installApi } from '../../services/install';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const schema = z.object({
  username: z.string().min(4, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirm_password'],
});

function AdminSetup({ onNext, onBack }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: 'admin', email: 'admin@blacken.dev', password: '', confirm_password: '' },
  });

  const onSubmit = async (data) => {
    try {
      await installApi.complete({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      toast.success('ติดตั้งระบบเสร็จสมบูรณ์!');
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto mb-4">
          <UserCog className="w-8 h-8 text-gold" />
        </div>
        <h2 className="text-2xl font-bold mb-2">ตั้งค่าผู้ดูแลระบบ</h2>
        <p className="text-muted-foreground text-sm">สร้างบัญชีผู้ดูแลระบบสำหรับเข้าใช้งาน</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="ชื่อผู้ใช้" {...register('username')} error={errors.username?.message} />
          <Input label="อีเมล" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="รหัสผ่าน" type="password" {...register('password')} error={errors.password?.message} />
          <Input label="ยืนยันรหัสผ่าน" type="password" {...register('confirm_password')} error={errors.confirm_password?.message} />

          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm mt-4">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>กรุณาจดจำรหัสผ่านนี้ไว้ในที่ปลอดภัย</span>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4" /> ย้อนกลับ</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'กำลังติดตั้ง...' : 'ติดตั้งระบบ'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}

export default AdminSetup;

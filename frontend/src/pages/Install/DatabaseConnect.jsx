import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Database, ArrowRight, ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { installApi } from '../../services/install';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const schema = z.object({
  host: z.string().min(1, 'กรุณากรอก Host'),
  port: z.number({ invalid_type_error: 'Port ต้องเป็นตัวเลข' }).int().min(1).max(65535, 'Port 1-65535'),
  username: z.string().min(1, 'กรุณากรอก Username'),
  password: z.string().min(1, 'กรุณากรอก Password'),
});

const dbLabels = {
  RanUser: 'บัญชีผู้เล่น',
  RanGame1: 'ข้อมูลตัวละคร',
  RanLog: 'บันทึกการกระทำ',
  RanShop: 'ร้านค้า / เติมเงิน',
};

function DatabaseConnect({ onNext, onBack, initialData }) {
  const [testing, setTesting] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [foundDBs, setFoundDBs] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const formDefaults = initialData?.has_connection
    ? { host: initialData.host || 'localhost', port: initialData.port || 1433, username: '', password: '' }
    : { host: 'localhost', port: 1433, username: 'sa', password: '' };

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: formDefaults,
  });

  useEffect(() => {
    if (initialData?.has_connection) {
      setScanResult(initialData);
      setFoundDBs(initialData.found_databases);
    }
  }, [initialData]);

  const onSubmit = async (data) => {
    setTesting(true);
    try {
      const res = await installApi.connect({
        host: data.host,
        port: Number(data.port),
        username: data.username,
        password: data.password,
      });
      setScanResult(res.data);
      setFoundDBs(res.data.found_databases);
      toast.success(`เชื่อมต่อสำเร็จ! พบ ${res.data.found_databases.length} Database`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เชื่อมต่อไม่สำเร็จ');
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await installApi.reset();
      toast.success('รีเซ็ตระบบเรียบร้อย กรุณาเริ่มติดตั้งใหม่');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.error || 'รีเซ็ตไม่สำเร็จ');
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
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
          <Database className="w-8 h-8 text-gold" />
        </div>
        <h2 className="text-2xl font-bold mb-2">เชื่อมต่อฐานข้อมูลเกม</h2>
        <p className="text-muted-foreground text-sm">กรอกข้อมูลเซิร์ฟเวอร์ MSSQL ของ RAN Online</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Host / IP" placeholder="localhost" {...register('host')} error={errors.host?.message} />
            </div>
            <Input label="Port" placeholder="1433" type="number" {...register('port', { valueAsNumber: true })} error={errors.port?.message} />
          </div>
          <Input label="Username" placeholder="sa" {...register('username')} error={errors.username?.message} />
          <Input label="Password" type="password" placeholder="********" {...register('password')} error={errors.password?.message} />

          {scanResult?.has_connection && !foundDBs && (
            <div className="bg-success/10 rounded-xl p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-success font-medium">เชื่อมต่อฐานข้อมูลอยู่</span>
              </div>
              <p className="text-muted text-xs">{scanResult.host}:{scanResult.port}</p>
            </div>
          )}

          {foundDBs && (
            <div className="bg-white/[0.03] rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">ตรวจพบฐานข้อมูล:</p>
              {['RanUser', 'RanGame1', 'RanLog', 'RanShop'].map((name) => {
                const found = foundDBs.includes(name);
                return (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span>{name}</span>
                    <span className="text-xs text-muted-foreground">{dbLabels[name]}</span>
                    {found ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4" /> ย้อนกลับ</Button>
            <Button type="submit" disabled={testing}>
              {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเชื่อมต่อ...</>
                : <>{scanResult?.has_connection ? 'เชื่อมต่อใหม่' : 'เชื่อมต่อและตรวจสอบ'} <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-border text-center">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            มีปัญหา? รีเซ็ตระบบติดตั้ง
          </button>
        </div>
      </Card>

      {scanResult?.databases && !scanResult.has_connection && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <Button size="lg" onClick={() => onNext(scanResult)}>
            ตั้งค่าคอลัมน์ต่อไป <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {scanResult?.has_connection && scanResult?.databases && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <Button size="lg" onClick={() => onNext(scanResult)}>
            ตั้งค่าคอลัมน์ต่อไป <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {showResetConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !resetting && setShowResetConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <h3 className="text-lg font-semibold">รีเซ็ตระบบติดตั้ง?</h3>
            </div>
            <p className="text-sm text-muted mb-6">
              การรีเซ็ตจะลบข้อมูลการเชื่อมต่อฐานข้อมูล การจับคู่คอลัมน์ และบัญชีผู้ดูแลที่สร้างไว้
              <br /><br />
              <strong className="text-danger">การกระทำนี้ไม่สามารถย้อนกลับได้</strong>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)} disabled={resetting}>
                ยกเลิก
              </Button>
              <Button variant="danger" onClick={handleReset} disabled={resetting}>
                {resetting ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังรีเซ็ต...</> : 'รีเซ็ตระบบ'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default DatabaseConnect;

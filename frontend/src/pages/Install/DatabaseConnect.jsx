import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Database, ArrowRight, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { installApi } from '../../services/install';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';

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

function DatabaseConnect({ onNext, onBack }) {
  const [testing, setTesting] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [foundDBs, setFoundDBs] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { host: 'localhost', port: 1433, username: 'sa', password: '' },
  });

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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">เชื่อมต่อฐานข้อมูลเกม</h2>
        <p className="text-muted text-sm">กรอกข้อมูลเซิร์ฟเวอร์ MSSQL ของ RAN Online</p>
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

          {foundDBs && (
            <div className="bg-hover/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">ตรวจพบฐานข้อมูล:</p>
              {['RanUser', 'RanGame1', 'RanLog', 'RanShop'].map((name) => {
                const found = foundDBs.includes(name);
                return (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span>{name}</span>
                    <span className="text-xs text-muted">{dbLabels[name]}</span>
                    {found ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted" />
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
                : <>เชื่อมต่อและตรวจสอบ <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </form>
      </Card>

      {scanResult && (
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
    </motion.div>
  );
}

export default DatabaseConnect;

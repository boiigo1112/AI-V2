import { motion } from 'framer-motion';
import { Server, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Welcome({ onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-xl mx-auto"
    >
      <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-6">
        <Server className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold mb-3">ยินดีต้อนรับ</h1>
      <p className="text-muted text-lg mb-2">Black En Admin Panel — RAN Online</p>
      <p className="text-muted/70 text-sm mb-8 leading-relaxed">
        ระบบจัดการหลังบ้านสำหรับ RAN Online<br />
        ขั้นตอนการติดตั้งจะใช้เวลาไม่นาน
      </p>
      <div className="space-y-3 text-left bg-card/50 rounded-xl p-5 border border-border mb-8">
        {[
          'เชื่อมต่อฐานข้อมูลเกม (MSSQL 2014)',
          'ตรวจสอบโครงสร้างตารางและปรับคอลัมน์',
          'ตั้งค่าบัญชีผู้ดูแลระบบ',
          'พร้อมใช้งาน',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
              {i + 1}
            </div>
            {step}
          </div>
        ))}
      </div>
      <Button size="lg" onClick={onNext}>
        เริ่มติดตั้ง
        <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

export default Welcome;

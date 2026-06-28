import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const dbLabels = { RanUser: 'บัญชีผู้เล่น', RanGame1: 'ตัวละคร', RanLog: 'บันทึก', RanShop: 'ร้านค้า' };

function Complete({ data }) {
  const navigate = useNavigate();
  const dbs = data?.databases || {};
  const connected = Object.values(dbs).filter((d) => d.found).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center max-w-lg mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
      >
        <div className="w-24 h-24 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
      </motion.div>

      <h1 className="text-3xl font-bold mb-3">ติดตั้งเสร็จสมบูรณ์!</h1>
      <p className="text-muted-foreground mb-6">
        ระบบ Black En Admin Panel พร้อมใช้งานแล้ว
      </p>

      <div className="bg-card/50 rounded-xl p-4 border border-white/[0.06] mb-8 text-left text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">ระบบ Admin</span>
          <span className="text-success">พร้อมใช้งาน</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">ฐานข้อมูลเกม</span>
          <span className={connected > 0 ? 'text-success' : 'text-muted-foreground'}>
            {connected > 0 ? `เชื่อมต่อ ${connected}/4` : 'ไม่ได้เชื่อมต่อ'}
          </span>
        </div>
        <div className="border-t border-white/[0.06] pt-2 mt-2 space-y-1">
          {['RanUser', 'RanGame1', 'RanLog', 'RanShop'].map((name) => (
            <div key={name} className="flex items-center justify-between text-xs pl-2">
              <span className="text-muted-foreground">{name} ({dbLabels[name]})</span>
              {dbs[name]?.found ? (
                <span className="text-success flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> พร้อม
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> ไม่พบ
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={() => navigate('/login')}>
        ไปยังหน้าเข้าสู่ระบบ
        <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

export default Complete;

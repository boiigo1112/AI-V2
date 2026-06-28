import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGameStatus, useGameReconnect } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/game/GlassCard';

function GameStatus() {
  const { data: status, isLoading } = useGameStatus();
  const reconnect = useGameReconnect();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ host: '', port: 1433, username: '', password: '' });

  const connected = status?.connected;
  const info = status?.info;

  const handleReconnect = async (e) => {
    e.preventDefault();
    try {
      await reconnect.mutateAsync(form);
      toast.success('เชื่อมต่อสำเร็จ');
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เชื่อมต่อไม่สำเร็จ');
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className={`size-9 rounded-xl flex items-center justify-center ${connected ? 'bg-success/12' : 'bg-danger/12'}`}>
              {connected ? <CheckCircle2 className="w-4.5 h-4.5 text-success" /> : <WifiOff className="w-4.5 h-4.5 text-danger" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">สถานะ</p>
              <p className={`text-lg font-bold ${connected ? 'text-success' : 'text-danger'}`}>
                {connected ? 'เชื่อมต่ออยู่' : 'ไม่ได้เชื่อมต่อ'}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue/12 flex items-center justify-center">
              <Wifi className="w-4.5 h-4.5 text-blue" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">เซิร์ฟเวอร์</p>
              <p className="text-lg font-bold text-foreground">{info ? `${info.host}:${info.port}` : '—'}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Connection details */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">รายละเอียดการเชื่อมต่อ</h3>
          {!showForm && (
            <Button variant="outline" size="sm" onClick={() => { setForm({ host: info?.host || '', port: info?.port || 1433, username: info?.username || '', password: '' }); setShowForm(true); }}>
              {connected ? 'เชื่อมต่อใหม่' : 'เชื่อมต่อ'}
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-6 bg-white/[0.05] rounded-lg animate-pulse" />)}
          </div>
        ) : connected && info ? (
          <div className="space-y-2">
            {[
              { label: 'Host', value: `${info.host}:${info.port}` },
              { label: 'Database', value: info.database || 'master' },
              { label: 'Username', value: info.username },
              { label: 'สถานะ', value: 'Connected', color: 'text-success' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm py-2 border-b border-white/[0.06] last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-medium text-foreground ${item.color || ''}`}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">ไม่มีข้อมูลการเชื่อมต่อ</p>
        )}
      </GlassCard>

      {/* Reconnect form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">เชื่อมต่อ MSSQL</h3>
            <form onSubmit={handleReconnect} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input label="Host" value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} />
                </div>
                <Input label="Port" type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} />
              </div>
              <Input label="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>ยกเลิก</Button>
                <Button type="submit" disabled={reconnect.isPending}>
                  {reconnect.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเชื่อมต่อ...</> : 'เชื่อมต่อ'}
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

export default GameStatus;

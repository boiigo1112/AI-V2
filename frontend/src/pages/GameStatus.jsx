import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGameStatus, useGameReconnect } from '../hooks/use-game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Wifi className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">สถานะการเชื่อมต่อเกม</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {connected ? <CheckCircle2 className="w-5 h-5 text-success" /> : <WifiOff className="w-5 h-5 text-danger" />}
                <h2 className="text-lg font-semibold">{connected ? 'เชื่อมต่ออยู่' : 'ไม่ได้เชื่อมต่อ'}</h2>
              </div>
              {!showForm && (
                <Button variant="outline" size="sm" onClick={() => { setForm({ host: info?.host || '', port: info?.port || 1433, username: info?.username || '', password: '' }); setShowForm(true); }}>
                  {connected ? 'เชื่อมต่อใหม่' : 'เชื่อมต่อ'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-6 bg-hover/50 rounded animate-pulse" />)}
              </div>
            ) : connected && info ? (
              <div className="space-y-3">
                {[
                  { label: 'Host', value: `${info.host}:${info.port}` },
                  { label: 'Database', value: info.database },
                  { label: 'Username', value: info.username },
                  { label: 'Status', value: 'Connected', color: 'text-success' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted">{item.label}</span>
                    <span className={`font-medium ${item.color || ''}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-4">ไม่มีข้อมูลการเชื่อมต่อ</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader><h2 className="text-lg font-semibold">เชื่อมต่อ MSSQL</h2></CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default GameStatus;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Users, CreditCard, CalendarClock, Plus,
  Search, MoreHorizontal, CheckCircle, XCircle, Clock,
  AlertTriangle, RefreshCw, Zap, DollarSign, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { GlassCard } from '../components/game/GlassCard';
import { useAuth } from '../hooks/useAuth';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-xl flex items-center justify-center`} style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </GlassCard>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-success/10 text-success border-success/20',
    suspended: 'bg-danger/10 text-danger border-danger/20',
    trial: 'bg-gold/10 text-gold border-gold/20',
    expired: 'bg-muted/10 text-muted-foreground border-muted/20',
  };
  const icons = {
    active: CheckCircle,
    suspended: XCircle,
    trial: Clock,
    expired: AlertTriangle,
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.trial}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function SaasDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', subdomain: '', plan: 'trial' });

  const fetchData = async () => {
    try {
      const [statsRes, tenantsRes, plansRes] = await Promise.all([
        api.get('/saas/stats'),
        api.get('/saas/tenants'),
        api.get('/plans'),
      ]);
      setStats(statsRes.data);
      setTenants(tenantsRes.data?.tenants || tenantsRes.data || []);
      setPlans(plansRes.data?.plans || plansRes.data || []);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/saas/tenants/${id}/status`, { status: newStatus });
      toast.success(`Tenant ${newStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับ'} แล้ว`);
      fetchData();
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleExtend = async (id) => {
    try {
      await api.post(`/saas/tenants/${id}/extend`, { days: 30 });
      toast.success('ขยายอายุเรียบร้อย +30 วัน');
      fetchData();
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.subdomain) {
      toast.error('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    try {
      await api.post('/tenants', createForm);
      toast.success('สร้าง Tenant สำเร็จ');
      setShowCreate(false);
      setCreateForm({ name: '', subdomain: '', plan: 'trial' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'สร้างไม่สำเร็จ');
    }
  };

  const filteredTenants = (Array.isArray(tenants) ? tenants : []).filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">SaaS Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">จัดการระบบเช่าทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="size-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="h-8 px-3 rounded-lg bg-gold text-[#08080e] text-xs font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all">
            <Plus className="w-3.5 h-3.5" /> สร้าง Tenant
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Tenants ทั้งหมด" value={stats?.total_tenants || 0} sub="ที่ลงทะเบียนทั้งหมด" color="#818cf8" />
        <StatCard icon={Users} label="กำลังใช้งาน" value={stats?.active_tenants || 0} sub={`${((stats?.active_tenants / (stats?.total_tenants || 1)) * 100).toFixed(0)}% ของทั้งหมด`} color="#34d399" />
        <StatCard icon={DollarSign} label="รายรับเดือนนี้" value={`฿${(stats?.revenue_this_month || 0).toLocaleString()}`} sub="ประมาณการ" color="#c9a84c" />
        <StatCard icon={CalendarClock} label="ใกล้หมดอายุ" value={stats?.expiring_soon || 0} sub="ภายใน 7 วัน" color="#f87171" />
      </div>

      {/* Plans Summary */}
      {plans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {plans.map(plan => (
            <div key={plan.id} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs font-medium text-foreground">{plan.name}</p>
              <p className="text-[10px] text-muted-foreground">฿{(plan.price_monthly || 0).toLocaleString()}/เดือน</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Tenant Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-4 rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-foreground mb-4">สร้าง Tenant ใหม่</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">ชื่อ</label>
                <input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})}
                  placeholder="ชื่อร้าน/เซิร์ฟเวอร์"
                  className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-foreground placeholder:text-white/30 outline-none focus:border-gold/40 transition-colors mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Subdomain</label>
                <div className="flex items-center gap-1 mt-1">
                  <input value={createForm.subdomain} onChange={e => setCreateForm({...createForm, subdomain: e.target.value})}
                    placeholder="ชื่อย่อ"
                    className="flex-1 h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-foreground placeholder:text-white/30 outline-none focus:border-gold/40 transition-colors" />
                  <span className="text-[10px] text-muted-foreground">.duckdns.org</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">แผน</label>
                <select value={createForm.plan} onChange={e => setCreateForm({...createForm, plan: e.target.value})}
                  className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-foreground outline-none focus:border-gold/40 transition-colors mt-1">
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 h-9 rounded-lg border border-white/[0.08] text-xs text-muted-foreground hover:text-foreground transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleCreate}
                className="flex-1 h-9 rounded-lg bg-gold text-[#08080e] text-xs font-semibold hover:brightness-110 transition-all">
                สร้าง
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tenants Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
          <h3 className="text-xs font-semibold text-foreground">รายชื่อ Tenant ทั้งหมด</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              className="w-40 h-7 pl-7 pr-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/40 transition-colors" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">ชื่อ</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">Subdomain</th>
                <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">แผน</th>
                <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">สถานะ</th>
                <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">หมดอายุ</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">ยังไม่มี Tenant</td></tr>
              ) : filteredTenants.map((t, i) => (
                <motion.tr key={t.id || i}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">Owner: {t.owner_id?.slice(0, 8) || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gold/80">{t.subdomain}.duckdns.org</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] uppercase font-medium text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded">{t.plan || 'trial'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.expire_at ? (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(t.expire_at).toLocaleDateString('th-TH')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleExtend(t.id)}
                        className="size-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors"
                        title="ขยายอายุ +30 วัน">
                        <CalendarClock className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleStatusToggle(t.id, t.status)}
                        className={`size-7 rounded-lg border flex items-center justify-center transition-colors ${
                          t.status === 'active'
                            ? 'bg-white/[0.04] border-white/[0.06] text-muted-foreground hover:text-danger hover:border-danger/30'
                            : 'bg-white/[0.04] border-white/[0.06] text-muted-foreground hover:text-success hover:border-success/30'
                        }`}
                        title={t.status === 'active' ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}>
                        {t.status === 'active' ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

export default SaasDashboard;

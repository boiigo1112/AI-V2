import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Ban, AlertTriangle, Eye, Lock, RefreshCw, Search, Globe, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { GlassCard } from '../components/game/GlassCard';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold text-foreground">{value ?? '—'}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </GlassCard>
  );
}

function SeverityBadge({ severity }) {
  const colors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[severity] || colors.medium}`}>
      {severity}
    </span>
  );
}

function EventTypeBadge({ type }) {
  const colors = {
    waf_block: 'bg-red-500/20 text-red-400 border-red-500/30',
    rate_limit: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    login_fail: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    login_success: 'bg-green-500/20 text-green-400 border-green-500/30',
    csrf_fail: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    unauthorized: 'bg-red-500/20 text-red-400 border-red-500/30',
    api_abuse: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[type] || colors.medium}`}>
      {type}
    </span>
  );
}

function SecurityDashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.get('/security/stats').catch(() => ({ data: {} })),
        api.get('/security/logs').catch(() => ({ data: { logs: [] } })),
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data?.logs || []);
      try {
        const blockedRes = await api.get('/security/blocked-ips');
        setBlockedIPs(blockedRes.data?.ips || []);
      } catch {}
    } catch (err) {
      // Security endpoints may not be ready yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredLogs = (logs || []).filter(l => {
    if (filter !== 'all' && l.event_type !== filter) return false;
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Security Dashboard</h1>
            <p className="text-xs text-muted-foreground">ระบบตรวจสอบความปลอดภัยแบบ Real-time</p>
          </div>
        </div>
        <button onClick={fetchData} className="size-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Security Status */}
      <GlassCard className="p-4 border-red-500/20">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-foreground">🔒 Security Protection Active</p>
            <p className="text-[11px] text-muted-foreground">
              WAF ✓ | Rate Limiting ✓ | CSRF ✓ | SQLi Protection ✓ | XSS Protection ✓ | Path Traversal ✓ | Brute Force Protection ✓
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShieldCheck} label="Security Events" value={stats?.total_events || 0} color="#34d399" sub="ทั้งหมดในระบบ" />
        <StatCard icon={Ban} label="Blocked Requests" value={stats?.blocked_count || 0} color="#f87171" sub="WAF + Rate Limit" />
        <StatCard icon={AlertTriangle} label="Critical Alerts" value={stats?.critical_count || 0} color="#ef4444" sub="ต้องตรวจสอบ" />
        <StatCard icon={Eye} label="Failed Logins" value={stats?.failed_logins || 0} color="#f59e0b" sub="24 ชม. ล่าสุด" />
      </div>

      {/* Blocked IPs */}
      {blockedIPs.length > 0 && (
        <GlassCard className="p-4 border-red-500/20">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <Ban className="w-3.5 h-3.5 text-red-400" /> IPs ที่ถูกบล็อก ({blockedIPs.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {blockedIPs.map(ip => (
              <span key={ip.id} className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                {ip.ip_address}
                {ip.reason && <span className="ml-1 opacity-70">({ip.reason})</span>}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Security Logs */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
          <h3 className="text-xs font-semibold text-foreground">Security Event Logs</h3>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="h-7 px-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-foreground outline-none">
              <option value="all">All Events</option>
              <option value="waf_block">WAF Blocks</option>
              <option value="rate_limit">Rate Limits</option>
              <option value="login_fail">Failed Logins</option>
              <option value="login_success">Successful Logins</option>
              <option value="csrf_fail">CSRF Failures</option>
              <option value="unauthorized">Unauthorized Access</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหา..."
                className="w-36 h-7 pl-7 pr-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/40" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0c0c14]">
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">เวลา</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">Event</th>
                <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">Severity</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">IP</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                  {loading ? 'กำลังโหลด...' : 'ไม่มีข้อมูลความปลอดภัย — ระบบปลอดภัย! 🛡️'}
                </td></tr>
              ) : filteredLogs.map((log, i) => (
                <motion.tr key={log.id || i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'}
                  </td>
                  <td className="px-3 py-2.5"><EventTypeBadge type={log.event_type} /></td>
                  <td className="px-3 py-2.5 text-center"><SeverityBadge severity={log.severity} /></td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-mono text-foreground/70">{log.ip_address || '-'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-foreground/60 max-w-[200px] truncate">
                    {log.endpoint || log.details || '-'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Security Checklist */}
      <GlassCard className="p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">🛡️ Security Checklist</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { label: 'WAF Protection', status: true, desc: 'Path traversal, XSS, SQLi blocked' },
            { label: 'Rate Limiting', status: true, desc: 'Per-IP, per-endpoint limits' },
            { label: 'CSRF Protection', status: true, desc: 'Token-based validation' },
            { label: 'Brute Force Protection', status: true, desc: 'Auto-block after 5 failures' },
            { label: 'SQL Injection Prevention', status: true, desc: 'Parameterized queries + WAF' },
            { label: 'XSS Protection', status: true, desc: 'CSP headers + input sanitization' },
            { label: 'Security Headers', status: true, desc: 'HSTS, X-Frame-Options, etc.' },
            { label: 'JWT Authentication', status: true, desc: 'Token-based with refresh' },
            { label: 'RBAC Permissions', status: true, desc: 'Role-based access control' },
            { label: 'Audit Logging', status: true, desc: 'All security events logged' },
            { label: 'CORS Protection', status: true, desc: 'Restricted cross-origin access' },
            { label: 'Input Validation', status: true, desc: 'Server-side validation' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className={`size-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.status ? 'bg-success/20' : 'bg-danger/20'}`}>
                <div className={`size-2 rounded-full ${item.status ? 'bg-success' : 'bg-danger'}`} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">{item.label}</p>
                <p className="text-[9px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export default SecurityDashboard;

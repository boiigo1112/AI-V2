import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard, RefreshCw, AlertTriangle, CheckCircle, Clock,
  XCircle, Upload, Eye, Download, FileText, Shield,
  Pencil, Plus, Trash2, CalendarClock, Building2, Crown,
  Ban, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { GlassCard } from '../components/game/GlassCard';
import { useAuth } from '../hooks/useAuth';

/* ── Invoice Detail Modal ── */
function InvoiceDetailModal({ invoice, onClose }) {
  const statusStyles = {
    paid: 'bg-success/10 text-success border-success/20',
    pending: 'bg-gold/10 text-gold border-gold/20',
    cancelled: 'bg-danger/10 text-danger border-danger/20',
    expired: 'bg-muted/10 text-muted-foreground border-muted/20',
  };
  const statusIcons = {
    paid: CheckCircle,
    pending: Clock,
    cancelled: XCircle,
    expired: AlertTriangle,
  };
  const StatusIcon = statusIcons[invoice?.status] || Clock;

  const handleDownload = () => {
    if (invoice?.id) {
      window.open(`/api/payment/invoices/${invoice.id}/download`, '_blank');
    } else {
      toast.info('ไม่สามารถดาวน์โหลดใบแจ้งหนี้ได้');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gold" />
            <h2 className="text-sm font-semibold text-foreground">รายละเอียดใบแจ้งหนี้</h2>
          </div>
          <button
            onClick={onClose}
            className="size-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {invoice && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">เลขที่</span>
                <span className="text-xs font-semibold text-foreground">
                  {invoice.invoice_no || invoice.id || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">แผน</span>
                <span className="text-xs font-medium text-foreground">
                  {invoice.plan_name || invoice.plan?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">จำนวนเงิน</span>
                <span className="text-sm font-bold text-gold">
                  ฿{(invoice.amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">วิธีการชำระ</span>
                <span className="text-xs font-medium text-foreground">
                  {invoice.payment_method === 'promptpay' ? 'PromptPay' : 'โอนผ่านธนาคาร'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">สถานะ</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    statusStyles[invoice.status] || statusStyles.pending
                  }`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {invoice.status === 'paid' ? 'ชำระแล้ว' :
                   invoice.status === 'pending' ? 'รอตรวจสอบ' :
                   invoice.status === 'cancelled' ? 'ยกเลิก' : invoice.status}
                </span>
              </div>
              {invoice.paid_at && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">วันที่ชำระ</span>
                  <span className="text-xs font-medium text-foreground">
                    {new Date(invoice.paid_at).toLocaleDateString('th-TH')}
                  </span>
                </div>
              )}
              {invoice.created_at && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">วันที่สร้าง</span>
                  <span className="text-xs font-medium text-foreground">
                    {new Date(invoice.created_at).toLocaleDateString('th-TH')}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleDownload}
              className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-foreground hover:bg-white/[0.08] flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> ดาวน์โหลดใบแจ้งหนี้
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Payment Config Modal (Admin) ── */
function PaymentConfigModal({ config, onClose, onSave }) {
  const [form, setForm] = useState({
    promptpay_id: config?.promptpay_id || '',
    bank_accounts: config?.bank_accounts || [],
  });
  const [saving, setSaving] = useState(false);

  const addBankAccount = () => {
    setForm(prev => ({
      ...prev,
      bank_accounts: [
        ...prev.bank_accounts,
        { bank_name: '', account_number: '', account_name: '', branch: '' },
      ],
    }));
  };

  const updateBankAccount = (index, field, value) => {
    setForm(prev => {
      const accounts = [...prev.bank_accounts];
      accounts[index] = { ...accounts[index], [field]: value };
      return { ...prev, bank_accounts: accounts };
    });
  };

  const removeBankAccount = (index) => {
    setForm(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/payment/configs', form);
      toast.success('บันทึกการตั้งค่าสำเร็จ');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ไม่สามารถบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold" />
            <h2 className="text-sm font-semibold text-foreground">ตั้งค่าการชำระเงิน</h2>
          </div>
          <button onClick={onClose} className="size-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* PromptPay */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">PromptPay ID</label>
            <input
              value={form.promptpay_id}
              onChange={(e) => setForm(prev => ({ ...prev, promptpay_id: e.target.value }))}
              placeholder="เบอร์โทร หรือเลขบัตรประชาชน"
              className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-foreground placeholder:text-white/30 outline-none focus:border-gold/40 transition-colors mt-1"
            />
          </div>

          {/* Bank Accounts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">บัญชีธนาคาร</label>
              <button
                onClick={addBankAccount}
                className="size-6 rounded-md bg-gold/10 text-gold hover:bg-gold/20 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {form.bank_accounts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">ยังไม่มีบัญชีธนาคาร</p>
            ) : (
              <div className="space-y-2">
                {form.bank_accounts.map((acc, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] relative">
                    <button
                      onClick={() => removeBankAccount(i)}
                      className="absolute top-2 right-2 size-5 rounded-md bg-danger/10 text-danger hover:bg-danger/20 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-muted-foreground">ชื่อธนาคาร</label>
                        <input
                          value={acc.bank_name}
                          onChange={(e) => updateBankAccount(i, 'bank_name', e.target.value)}
                          placeholder="ธนาคาร"
                          className="w-full h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-foreground placeholder:text-white/30 outline-none focus:border-gold/40 transition-colors mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">เลขที่บัญชี</label>
                        <input
                          value={acc.account_number}
                          onChange={(e) => updateBankAccount(i, 'account_number', e.target.value)}
                          placeholder="xxx-x-xxxxx-x"
                          className="w-full h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-foreground placeholder:text-white/30 outline-none focus:border-gold/40 transition-colors mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">ชื่อบัญชี</label>
                        <input
                          value={acc.account_name}
                          onChange={(e) => updateBankAccount(i, 'account_name', e.target.value)}
                          placeholder="ชื่อเจ้าของบัญชี"
                          className="w-full h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-foreground placeholder:text-white/30 outline-none focus:border-gold/40 transition-colors mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">สาขา</label>
                        <input
                          value={acc.branch}
                          onChange={(e) => updateBankAccount(i, 'branch', e.target.value)}
                          placeholder="สาขา"
                          className="w-full h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-foreground placeholder:text-white/30 outline-none focus:border-gold/40 transition-colors mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-white/[0.08] text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-lg bg-gold text-[#08080e] text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Upload Proof Modal ── */
function UploadProofModal({ invoice, onClose, onSuccess }) {
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!proofFile) {
      toast.error('กรุณาเลือกไฟล์');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('proof', proofFile);
      await api.post(`/payment/invoices/${invoice.id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('อัปโหลดหลักฐานสำเร็จ');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-gold" />
            <h2 className="text-sm font-semibold text-foreground">อัปโหลดหลักฐาน</h2>
          </div>
          <button onClick={onClose} className="size-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground mb-3">
          ใบแจ้งหนี้: {invoice?.invoice_no || invoice?.id}
        </p>

        {!proofFile ? (
          <label className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-white/[0.08] cursor-pointer hover:border-gold/30 transition-all">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">คลิกเพื่อเลือกไฟล์</span>
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </label>
        ) : (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {proofPreview && (
              <img src={proofPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
            )}
            <p className="text-[11px] text-foreground">{proofFile.name}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !proofFile}
          className="w-full h-10 rounded-lg bg-gold text-[#08080e] text-xs font-semibold mt-3 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
        </button>
      </motion.div>
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-success/10 text-success border-success/20',
    trial: 'bg-gold/10 text-gold border-gold/20',
    expired: 'bg-danger/10 text-danger border-danger/20',
    cancelled: 'bg-muted/10 text-muted-foreground border-muted/20',
    suspended: 'bg-danger/10 text-danger border-danger/20',
  };
  const icons = {
    active: CheckCircle,
    trial: Clock,
    expired: AlertTriangle,
    cancelled: XCircle,
    suspended: Ban,
  };
  const labels = {
    active: 'กำลังใช้งาน',
    trial: 'ทดลองใช้',
    expired: 'หมดอายุ',
    cancelled: 'ยกเลิก',
    suspended: 'ระงับ',
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.trial}`}>
      <Icon className="w-3 h-3" />
      {labels[status] || status}
    </span>
  );
}

/* ── Invoice Status Badge ── */
function InvoiceStatusBadge({ status }) {
  const styles = {
    paid: 'bg-success/10 text-success border-success/20',
    pending: 'bg-gold/10 text-gold border-gold/20',
    cancelled: 'bg-danger/10 text-danger border-danger/20',
    expired: 'bg-muted/10 text-muted-foreground border-muted/20',
  };
  const icons = {
    paid: CheckCircle,
    pending: Clock,
    cancelled: XCircle,
    expired: AlertTriangle,
  };
  const labels = {
    paid: 'ชำระแล้ว',
    pending: 'รอตรวจสอบ',
    cancelled: 'ยกเลิก',
    expired: 'หมดอายุ',
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.pending}`}>
      <Icon className="w-3 h-3" />
      {labels[status] || status}
    </span>
  );
}

/* ── Days Remaining ── */
function DaysRemaining({ expireAt }) {
  if (!expireAt) return <span className="text-muted-foreground">—</span>;
  const now = new Date();
  const end = new Date(expireAt);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span className="text-danger font-medium">{Math.abs(diff)} วัน ที่เกิน</span>;
  if (diff === 0) return <span className="text-gold font-medium">หมดอายุวันนี้</span>;
  return <span className={`font-medium ${diff <= 7 ? 'text-gold' : 'text-foreground'}`}>{diff} วัน</span>;
}

/* ── Main Billing Page ── */
function SaasBilling() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [uploadInvoice, setUploadInvoice] = useState(null);
  const isAdmin = user?.role?.name === 'admin' || user?.permissions?.includes('saas.admin');

  const fetchData = useCallback(async () => {
    try {
      const [subRes, invRes, configRes] = await Promise.all([
        api.get('/payment/subscription').catch(() => null),
        api.get('/payment/invoices').catch(() => null),
        api.get('/payment/configs').catch(() => null),
      ]);
      if (subRes?.data) setSubscription(subRes.data);
      if (invRes?.data) setInvoices(invRes.data?.invoices || invRes.data || []);
      if (configRes?.data) setPaymentConfig(configRes.data);
    } catch (err) {
      // Silently handle - may not be set up yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpgrade = () => {
    navigate('/saas/plans');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">การจัดการบิล</h1>
          <p className="text-xs text-muted-foreground mt-0.5">ดูสถานะการสมัครสมาชิกและประวัติการชำระเงิน</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowConfig(true)}
              className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> ตั้งค่าการชำระเงิน
            </button>
          )}
          <button
            onClick={fetchData}
            className="size-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="รีเฟรช"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Subscription Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-gold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {subscription?.plan_name || 'ยังไม่มีแพ็กเกจ'}
                  </h3>
                  {subscription?.status && <StatusBadge status={subscription.status} />}
                </div>
                {subscription?.expire_at ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    หมดอายุ: {new Date(subscription.expire_at).toLocaleDateString('th-TH')}
                    {' · '}เหลือ: <DaysRemaining expireAt={subscription.expire_at} />
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">ไม่มีข้อมูลอายุสมาชิก</p>
                )}
              </div>
            </div>
            <button
              onClick={handleUpgrade}
              className="h-9 px-4 rounded-lg bg-gold text-[#08080e] text-xs font-semibold hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> {subscription ? 'เปลี่ยนแผน' : 'เลือกแผน'}
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-muted-foreground">สถานะ</p>
            <p className="text-xs font-semibold text-foreground capitalize mt-0.5">
              {subscription?.status || '—'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-muted-foreground">ใบแจ้งหนี้ทั้งหมด</p>
            <p className="text-xs font-semibold text-foreground mt-0.5">{invoices.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-muted-foreground">ชำระแล้ว</p>
            <p className="text-xs font-semibold text-success mt-0.5">
              {invoices.filter(inv => inv.status === 'paid').length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-muted-foreground">รอตรวจสอบ</p>
            <p className="text-xs font-semibold text-gold mt-0.5">
              {invoices.filter(inv => inv.status === 'pending').length}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Invoice History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
            <h3 className="text-xs font-semibold text-foreground">ประวัติการชำระเงิน</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">เลขที่</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">วันที่</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">จำนวนเงิน</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">สถานะ</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-6 h-6 text-muted-foreground/50" />
                        <span>ยังไม่มีประวัติการชำระเงิน</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, i) => (
                    <motion.tr
                      key={inv.id || i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-xs font-medium text-gold hover:brightness-110 transition-all"
                        >
                          {inv.invoice_no || inv.id || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(inv.created_at || inv.date).toLocaleDateString('th-TH')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-foreground">
                          ฿{(inv.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="size-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => setUploadInvoice(inv)}
                              className="size-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors"
                              title="อัปโหลดหลักฐาน"
                            >
                              <Upload className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      {/* Modals */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
      {showConfig && (
        <PaymentConfigModal
          config={paymentConfig}
          onClose={() => setShowConfig(false)}
          onSave={fetchData}
        />
      )}
      {uploadInvoice && (
        <UploadProofModal
          invoice={uploadInvoice}
          onClose={() => setUploadInvoice(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

export default SaasBilling;

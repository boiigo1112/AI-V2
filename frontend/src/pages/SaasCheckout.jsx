import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CreditCard, Banknote, QrCode, Upload, Check,
  AlertTriangle, Loader2, FileUp, Image, X, Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { GlassCard } from '../components/game/GlassCard';
import { useAuth } from '../hooks/useAuth';

function SaasCheckout() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState('promptpay');
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, configRes] = await Promise.all([
        api.get('/plans'),
        api.get('/payment/configs').catch(() => null),
      ]);

      const allPlans = plansRes.data?.plans || plansRes.data || [];
      const foundPlan = allPlans.find(p => String(p.id) === String(planId));
      if (!foundPlan) {
        toast.error('ไม่พบแผนที่เลือก');
        navigate('/saas/plans');
        return;
      }
      setPlan(foundPlan);
      if (configRes?.data) {
        setPaymentConfig(configRes.data);
        // Generate QR for PromptPay
        if (configRes.data.promptpay_id) {
          setQrCodeUrl(`/api/payment/qr?amount=${foundPlan.price_monthly || 0}&id=${configRes.data.promptpay_id}`);
        }
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูล');
      navigate('/saas/plans');
    } finally {
      setLoading(false);
    }
  }, [planId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('กรุณาอัปโหลดไฟล์รูปภาพ (PNG, JPG, WEBP)');
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result);
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setProofFile(null);
    setProofPreview(null);
  };

  const handleSubmit = async () => {
    if (!plan || !proofFile) {
      toast.error('กรุณาแนบหลักฐานการชำระเงิน');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('plan_id', plan.id);
      formData.append('payment_method', payMethod);
      formData.append('amount', plan.price_monthly || 0);
      formData.append('proof', proofFile);

      const res = await api.post('/payment/create-invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setInvoice(res.data);
      setSubmitted(true);
      toast.success('สร้างใบแจ้งหนี้สำเร็จ');
    } catch (err) {
      const msg = err.response?.data?.error || 'ไม่สามารถสร้างใบแจ้งหนี้ได้';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('คัดลอกแล้ว');
    }).catch(() => {
      toast.error('ไม่สามารถคัดลอกได้');
    });
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

  if (submitted && invoice) {
    return (
      <div className="flex flex-col gap-6 max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
              className="w-16 h-16 mx-auto mb-5 rounded-full bg-gold/15 flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-gold" />
            </motion.div>

            <h2 className="text-base font-bold text-foreground mb-2">ดำเนินการเสร็จสิ้น</h2>
            <p className="text-xs text-muted-foreground mb-6">
              ใบแจ้งหนี้ของคุณถูกสร้างแล้ว และกำลังรอการตรวจสอบ
            </p>

            <div className="bg-white/[0.03] rounded-xl p-4 mb-6 space-y-2 text-left">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">เลขที่ใบแจ้งหนี้</span>
                <span className="text-foreground font-medium">{invoice.invoice_no || invoice.id || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">แผน</span>
                <span className="text-foreground font-medium">{plan.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">จำนวนเงิน</span>
                <span className="text-foreground font-medium">฿{plan.price_monthly?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">สถานะ</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-medium">
                  <Loader2 className="w-2.5 h-2.5" /> รอตรวจสอบ
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/saas/billing"
                className="w-full h-10 rounded-lg bg-gold text-[#08080e] text-xs font-semibold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
              >
                ไปยังหน้าบิล <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </Link>
              <Link
                to="/saas/plans"
                className="w-full h-10 rounded-lg border border-white/[0.08] text-xs text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                กลับไปยังแผนบริการ
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[700px] mx-auto">
      {/* Back link */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link
          to="/saas/plans"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังแผนบริการ
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-lg font-bold text-foreground">ชำระเงิน</h1>
        <p className="text-xs text-muted-foreground mt-0.5">กรุณายืนยันข้อมูลและเลือกวิธีการชำระเงิน</p>
      </motion.div>

      {/* Plan Summary */}
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                <p className="text-[10px] text-muted-foreground">
                  สูงสุด {plan.max_players || '—'} ผู้เล่น · {plan.features?.length || 0} คุณสมบัติ
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gold">฿{plan.price_monthly?.toLocaleString() || '0'}</p>
                <p className="text-[9px] text-muted-foreground">/เดือน</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Payment Method */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">เลือกวิธีการชำระเงิน</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPayMethod('promptpay')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
                payMethod === 'promptpay'
                  ? 'bg-gold/10 border-gold/30 text-gold'
                  : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:border-white/[0.12] hover:text-foreground'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <div className="text-left">
                <p className="text-xs font-medium">PromptPay</p>
                <p className="text-[9px] opacity-60">สแกน QR</p>
              </div>
            </button>
            <button
              onClick={() => setPayMethod('bank_transfer')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
                payMethod === 'bank_transfer'
                  ? 'bg-gold/10 border-gold/30 text-gold'
                  : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:border-white/[0.12] hover:text-foreground'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <div className="text-left">
                <p className="text-xs font-medium">โอนผ่านธนาคาร</p>
                <p className="text-[9px] opacity-60">Bank Transfer</p>
              </div>
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Payment Details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {payMethod === 'promptpay' && (
          <GlassCard className="p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">ชำระผ่าน PromptPay</h3>
            <div className="flex flex-col items-center gap-3">
              {qrCodeUrl ? (
                <div className="p-3 bg-white rounded-xl">
                  <img
                    src={qrCodeUrl}
                    alt="PromptPay QR Code"
                    className="w-48 h-48 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      // Show fallback
                    }}
                  />
                </div>
              ) : (
                <div className="w-48 h-48 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              {paymentConfig?.promptpay_id && (
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">PromptPay ID</p>
                  <button
                    onClick={() => copyToClipboard(paymentConfig.promptpay_id)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:brightness-110 transition-all"
                  >
                    {paymentConfig.promptpay_id}
                    <CreditCard className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                จำนวนเงิน: <strong className="text-foreground">฿{plan?.price_monthly?.toLocaleString() || '0'}</strong>
              </p>
            </div>
          </GlassCard>
        )}

        {payMethod === 'bank_transfer' && (
          <GlassCard className="p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">โอนผ่านธนาคาร</h3>
            {paymentConfig?.bank_accounts && paymentConfig.bank_accounts.length > 0 ? (
              <div className="space-y-2">
                {paymentConfig.bank_accounts.map((acc, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{acc.bank_name || acc.bank}</p>
                      <button
                        onClick={() => copyToClipboard(acc.account_number)}
                        className="text-xs text-gold hover:brightness-110 transition-all flex items-center gap-1"
                      >
                        {acc.account_number} <CreditCard className="w-3 h-3" />
                      </button>
                      <p className="text-[9px] text-muted-foreground">{acc.account_name || acc.holder_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-muted-foreground">สาขา</span>
                      <p className="text-[10px] text-foreground">{acc.branch || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <Banknote className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูลบัญชีธนาคาร</p>
              </div>
            )}
          </GlassCard>
        )}
      </motion.div>

      {/* Upload Proof */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">แนบหลักฐานการชำระเงิน</h3>
          {!proofFile ? (
            <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-white/[0.08] cursor-pointer hover:border-gold/30 hover:bg-white/[0.02] transition-all">
              <div className="size-10 rounded-full bg-white/[0.04] flex items-center justify-center">
                <FileUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-xs text-foreground font-medium">คลิกเพื่ออัปโหลดสลิป</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WEBP (สูงสุด 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                  {proofPreview ? (
                    <img src={proofPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-muted-foreground m-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium truncate">{proofFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(proofFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={clearFile}
                  className="size-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting || !proofFile}
            className={`w-full h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
              submitting || !proofFile
                ? 'bg-gold/30 text-white/50 cursor-not-allowed'
                : 'bg-gold text-[#08080e] hover:brightness-110 shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังดำเนินการ...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> ยืนยันการชำระเงิน
              </>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            หลังจากยืนยันการชำระเงิน ระบบจะตรวจสอบและอัปเดตสถานะโดยเร็วที่สุด
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default SaasCheckout;

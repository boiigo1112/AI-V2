import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, Crown, Star, Zap, CreditCard, RefreshCw,
  Users, ArrowRight, Shield, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { GlassCard } from '../components/game/GlassCard';
import { useAuth } from '../hooks/useAuth';

const planIcons = [
  { icon: Star, color: '#a78bfa' },
  { icon: Zap, color: '#34d399' },
  { icon: Crown, color: '#c9a84c' },
  { icon: Shield, color: '#f87171' },
];

function PlanCard({ plan, index, currentPlanId, onSelect, loading }) {
  const Icon = planIcons[index % planIcons.length]?.icon || CreditCard;
  const iconColor = planIcons[index % planIcons.length]?.color || '#c9a84c';
  const isCurrent = currentPlanId && plan.id === currentPlanId;
  const isPopular = index === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-gold text-[#08080e] text-[10px] font-semibold tracking-wider uppercase shadow-lg shadow-gold/20">
            <Sparkles className="w-3 h-3" /> แนะนำ
          </span>
        </div>
      )}
      <GlassCard
        className={`p-5 relative h-full flex flex-col transition-all duration-300 ${
          isCurrent
            ? 'border-gold/40 ring-1 ring-gold/20 shadow-[0_0_30px_rgba(201,168,76,0.08)]'
            : 'hover:border-white/[0.12] hover:bg-white/[0.06]'
        }`}
        glow={isCurrent}
        glowColor="rgba(201,168,76,0.15)"
      >
        {/* Background decoration */}
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-[0.08] pointer-events-none"
          style={{ background: iconColor }}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: `${iconColor}15` }}
            >
              <Icon className="w-5 h-5" style={{ color: iconColor }} />
            </div>
            <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
          </div>
          {isCurrent && (
            <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[9px] font-semibold border border-gold/20">
              ปัจจุบัน
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold text-foreground tracking-tight">
              ฿{plan.price_monthly?.toLocaleString() || '0'}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">/เดือน</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            สูงสุด {plan.max_players || '—'} ผู้เล่น
          </p>
        </div>

        {/* Features */}
        <div className="flex-1 space-y-2 mb-5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            คุณสมบัติ
          </p>
          {plan.features && plan.features.length > 0 ? (
            plan.features.map((feat, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-0.5 size-3.5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2 h-2 text-success" />
                </div>
                <span className="text-[11px] text-foreground/80 leading-relaxed">{feat}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground italic">ไม่มีข้อมูลคุณสมบัติ</p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onSelect(plan)}
          disabled={isCurrent || loading}
          className={`w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            isCurrent
              ? 'bg-success/10 text-success border border-success/20 cursor-default'
              : (isPopular
                  ? 'bg-gold text-[#08080e] hover:brightness-110 shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]'
                  : 'bg-white/[0.06] text-foreground hover:bg-white/[0.10] border border-white/[0.08]')
          }`}
        >
          {isCurrent ? (
            <>
              <Check className="w-3.5 h-3.5" /> กำลังใช้งาน
            </>
          ) : loading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <>
              เลือกแผน <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </GlassCard>
    </motion.div>
  );
}

function SaasPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/plans'),
        api.get('/subscription/current').catch(() => null),
      ]);
      setPlans(plansRes.data?.plans || plansRes.data || []);
      if (subRes?.data) {
        setSubscription(subRes.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลแผนบริการ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const currentPlanId = subscription?.plan_id || null;

  const handleSelectPlan = async (plan) => {
    setSelecting(true);
    navigate(`/saas/checkout/${plan.id}`);
    setSelecting(false);
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
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">แผนบริการ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              เลือกแผนที่เหมาะสมกับการให้บริการของคุณ
            </p>
          </div>
          <button
            onClick={fetchData}
            className="size-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="รีเฟรช"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Subscription summary */}
        {subscription && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-gold/5 border border-gold/10">
            <Crown className="w-3.5 h-3.5 text-gold" />
            <span className="text-[11px] text-gold/80">
              คุณกำลังใช้แผน <strong>{subscription.plan_name || '—'}</strong>
              {' · '}วันหมดอายุ: {subscription.expire_at
                ? new Date(subscription.expire_at).toLocaleDateString('th-TH')
                : '—'}
            </span>
          </div>
        )}
      </motion.div>

      {/* Plans grid */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="size-12 rounded-full bg-white/[0.04] flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">ยังไม่มีแผนบริการ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={index}
              currentPlanId={currentPlanId}
              onSelect={handleSelectPlan}
              loading={false}
            />
          ))}
        </div>
      )}

      {/* Additional info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-2"
      >
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">เปลี่ยนแผนได้ตลอดเวลา</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                คุณสามารถอัปเกรดหรือดาวน์เกรดแผนได้ทุกเมื่อ โดยส่วนต่างของค่าใช้จ่ายจะคำนวณตามสัดส่วนวันที่เหลือ
                หากมีข้อสงสัยเพิ่มเติม กรุณาติดต่อทีมสนับสนุน
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

export default SaasPlans;

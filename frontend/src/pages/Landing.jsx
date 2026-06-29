import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Shield, Users, Sword, Package, Swords,
  PawPrint, Trophy, Ban, Terminal, Ticket, ShoppingCart,
  LayoutDashboard, Map, FileText, ChevronRight,
  Star, Check, Menu, X, ChevronDown
} from 'lucide-react';
import { GlassCard } from '@/components/game/GlassCard';

const features = [
  { icon: Users, title: 'Player Management', desc: 'Full player account management with search, edit, block/unblock, and detailed profile views.' },
  { icon: Sword, title: 'Character Management', desc: 'Edit character stats, levels, skills, inventory, and more with an intuitive interface.' },
  { icon: Package, title: 'Inventory Editor', desc: 'Browse, add, edit, and delete items from any character\'s inventory with search.' },
  { icon: Swords, title: 'Guild Management', desc: 'Manage guilds, view member lists, edit guild info, and track guild statistics.' },
  { icon: PawPrint, title: 'Pets System', desc: 'View and edit pet data including stats, levels, and pet items across all players.' },
  { icon: Trophy, title: 'PK Ranking', desc: 'View PK kill/death rankings, stats, and individual player PK history records.' },
  { icon: Ban, title: 'Ban Manager', desc: 'IP and PC ban management with history tracking, unban capabilities, and statistics.' },
  { icon: Terminal, title: 'GMC Tools', desc: 'Send items, update points, post notices, track items, and view GMC action logs.' },
  { icon: Ticket, title: 'Coupon System', desc: 'Create, manage, and track coupon codes with usage reporting and redemption stats.' },
  { icon: ShoppingCart, title: 'Shop Editor', desc: 'Manage in-game shop items with CRUD operations and real-time updates.' },
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Real-time server statistics, player counts, revenue charts, and system health monitoring.' },
  { icon: Map, title: 'Online Map', desc: 'Live map view of online players with location tracking and server population stats.' },
  { icon: FileText, title: 'Logs Viewer', desc: 'Browse server logs with filtering, search, and export capabilities for all game databases.' },
];

const tiers = [
  {
    name: 'Basic',
    price: '9,999',
    currency: 'THB',
    period: '/เดือน',
    desc: 'สำหรับเซิร์ฟเวอร์ขนาดเล็กที่เริ่มต้น',
    popular: false,
    features: [
      'ผู้เล่นสูงสุด 500 คน',
      'ฟีเจอร์พื้นฐานครบถ้วน',
      'API Access พื้นฐาน',
      'อัปเดตฟรี 6 เดือน',
      'Support ทางอีเมล',
    ],
  },
  {
    name: 'Pro',
    price: '19,999',
    currency: 'THB',
    period: '/เดือน',
    desc: 'สำหรับเซิร์ฟเวอร์ที่กำลังเติบโต',
    popular: true,
    features: [
      'ผู้เล่นสูงสุด 2,000 คน',
      'ฟีเจอร์ทั้งหมด',
      'API Access เต็มรูปแบบ',
      'อัปเดตฟรี 12 เดือน',
      'Priority Support',
      'Multi-database',
      'Custom Integration',
    ],
  },
  {
    name: 'Enterprise',
    price: '39,999',
    currency: 'THB',
    period: '/เดือน',
    desc: 'สำหรับเซิร์ฟเวอร์ขนาดใหญ่',
    popular: false,
    features: [
      'ผู้เล่นไม่จำกัด',
      'ฟีเจอร์ทั้งหมด + พรีเมียม',
      'API Access + Webhook',
      'อัปเดตฟรีตลอดอายุ',
      '24/7 Support ด่วน',
      'Custom Development',
      'White Label',
      'On-premise Deploy',
    ],
  },
];

function FloatingShape({ delay, duration, x, y, size, color }) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl pointer-events-none"
      style={{ width: size, height: size, background: color }}
      initial={{ x: 0, y: 0, opacity: 0.3 }}
      animate={{
        x: [0, x, 0],
        y: [0, y, 0],
        opacity: [0.12, 0.25, 0.12],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Particle({ index }) {
  const random = (min, max) => {
    const seed = (index * 137 + 47) % 1000;
    return min + (seed / 1000) * (max - min);
  };

  return (
    <motion.div
      className="absolute w-[2px] h-[2px] rounded-full bg-gold/30 pointer-events-none"
      style={{ left: `${random(0, 100)}%`, top: `${random(0, 100)}%` }}
      animate={{ y: [0, -25, 0], opacity: [0, 0.6, 0] }}
      transition={{ duration: random(4, 7), delay: random(0, 4), repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#08080e]">
      <FloatingShape delay={0} duration={10} x={80} y={-80} size={600} color="rgba(201,168,76,0.05)" />
      <FloatingShape delay={3} duration={12} x={-60} y={100} size={500} color="rgba(59,130,246,0.03)" />
      <FloatingShape delay={5} duration={8} x={50} y={60} size={400} color="rgba(124,92,224,0.03)" />

      {Array.from({ length: 20 }).map((_, i) => (
        <Particle key={i} index={i} />
      ))}

      {/* Navigation */}
      <nav className="relative z-20 border-b border-white/[0.04] bg-[#08080e]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-light shadow-[0_0_15px_rgba(201,168,76,0.3)] flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#08080e]" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight">Black En</span>
            </motion.div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-xs text-muted-foreground hover:text-gold transition-colors">Features</a>
              <a href="#pricing" className="text-xs text-muted-foreground hover:text-gold transition-colors">Pricing</a>
              <a href="#contact" className="text-xs text-muted-foreground hover:text-gold transition-colors">Contact</a>
              <button
                onClick={() => navigate('/login')}
                className="text-xs text-muted-foreground hover:text-gold transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="text-xs font-semibold bg-gradient-to-r from-gold to-gold-light text-[#08080e] px-4 py-2 rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(201,168,76,0.2)]"
              >
                เริ่มต้นใช้งาน
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-muted-foreground hover:text-gold transition-colors p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/[0.04] py-4 space-y-3"
            >
              <a href="#features" className="block text-sm text-muted-foreground hover:text-gold transition-colors px-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-sm text-muted-foreground hover:text-gold transition-colors px-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#contact" className="block text-sm text-muted-foreground hover:text-gold transition-colors px-2" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                className="block text-sm text-muted-foreground hover:text-gold transition-colors px-2 w-full text-left"
              >
                Login
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}
                className="w-full text-sm font-semibold bg-gradient-to-r from-gold to-gold-light text-[#08080e] px-4 py-2 rounded-lg hover:brightness-110 transition-all"
              >
                เริ่มต้นใช้งาน
              </button>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-32 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 mb-6"
            >
              <Shield className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs text-gold font-medium tracking-wider">RAN ONLINE MANAGEMENT SYSTEM</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight">
              Black En{' '}
              <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                Admin Panel
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              ระบบจัดการเซิร์ฟเวอร์ RAN Online ที่ครบวงจรที่สุด จัดการผู้เล่น ไอเทม กิลด์
              และอื่นๆ อีกมากมาย ผ่านอินเทอร์เฟซที่ทันสมัยและใช้งานง่าย
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => navigate('/register')}
                className="group relative px-8 py-3.5 rounded-xl font-semibold text-sm text-[#08080e] bg-gradient-to-r from-gold to-gold-light hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(201,168,76,0.25)] hover:shadow-[0_0_40px_rgba(201,168,76,0.35)]"
              >
                <span className="flex items-center gap-2">
                  เริ่มต้นใช้งานฟรี
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
              <a
                href="#features"
                className="px-8 py-3.5 rounded-xl font-semibold text-sm text-foreground bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
              >
                ดูฟีเจอร์ทั้งหมด
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-12 flex items-center justify-center gap-6 sm:gap-10 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-gold" />
                <span>ไม่มีค่าธรรมเนียมแฝง</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-gold" />
                <span>ติดตั้งง่าย</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-gold" />
                <span>Support ตลอด 24 ชม.</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 mb-4">
              <Star className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs text-gold font-medium tracking-wider">FEATURES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              ทุกสิ่งที่คุณต้องการในการจัดการ{' '}
              <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">เซิร์ฟเวอร์</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              ฟีเจอร์ครบครันที่ออกแบบมาเพื่อผู้ดูแลเซิร์ฟเวอร์ RAN Online โดยเฉพาะ
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <GlassCard className="p-5 h-full group hover:border-gold/20 hover:shadow-[0_0_30px_rgba(201,168,76,0.06)] transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 mb-4">
              <Shield className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs text-gold font-medium tracking-wider">PRICING</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              แผนราคาที่{' '}
              <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">ยืดหยุ่น</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              เลือกแผนที่เหมาะสมกับขนาดเซิร์ฟเวอร์ของคุณ
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-gold to-gold-light text-[10px] font-bold text-[#08080e] uppercase tracking-wider shadow-[0_0_20px_rgba(201,168,76,0.3)]">
                      <Star className="w-3 h-3" />
                      ยอดนิยม
                    </span>
                  </div>
                )}

                <GlassCard className={`p-6 h-full ${tier.popular ? 'border-gold/30 shadow-[0_0_40px_rgba(201,168,76,0.08)]' : ''}`}>
                  <div className="text-center mb-6">
                    <h3 className="text-sm font-semibold text-foreground mb-1">{tier.name}</h3>
                    <p className="text-[11px] text-muted-foreground mb-4">{tier.desc}</p>
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-[11px] text-muted-foreground">{tier.currency}</span>
                      <span className="text-4xl font-bold text-foreground tracking-tight">{tier.price}</span>
                      <span className="text-xs text-muted-foreground">{tier.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/register')}
                    className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      tier.popular
                        ? 'bg-gradient-to-r from-gold to-gold-light text-[#08080e] hover:brightness-110 shadow-[0_0_20px_rgba(201,168,76,0.2)]'
                        : 'bg-white/[0.05] text-foreground border border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    เริ่มต้นใช้งาน
                  </button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Contact Section */}
      <section id="contact" className="relative z-10 py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard className="p-10 md:p-16 border-gold/10">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gold to-gold-light shadow-[0_0_30px_rgba(201,168,76,0.3)] flex items-center justify-center"
              >
                <Zap className="w-8 h-8 text-[#08080e]" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
                พร้อมที่จะยกระดับ{' '}
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  เซิร์ฟเวอร์
                </span>{' '}
                ของคุณหรือยัง?
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8">
                ทดสอบระบบการจัดการเซิร์ฟเวอร์ RAN Online ที่ทันสมัยที่สุด ฟรี! ไม่มีค่าใช้จ่ายในการทดสอบ
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/register')}
                  className="group px-8 py-3.5 rounded-xl font-semibold text-sm text-[#08080e] bg-gradient-to-r from-gold to-gold-light hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(201,168,76,0.25)]"
                >
                  <span className="flex items-center gap-2">
                    ทดสอบระบบฟรี
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
                <a
                  href="mailto:support@blacken.dev"
                  className="px-8 py-3.5 rounded-xl font-semibold text-sm text-foreground bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
                >
                  ติดต่อทีมงาน
                </a>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gold to-gold-light shadow-[0_0_10px_rgba(201,168,76,0.2)] flex items-center justify-center">
                <Zap className="w-3 h-3 text-[#08080e]" />
              </div>
              <span className="text-xs font-semibold text-foreground">Black En</span>
            </div>
            <p className="text-[11px] text-white/20">
              &copy; {new Date().getFullYear()} Black En — RAN Online Admin Panel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;

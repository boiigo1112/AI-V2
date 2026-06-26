import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User, LogIn, Zap, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

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

function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    const timer = setTimeout(() => {}, 100);
    return () => clearTimeout(timer);
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async ({ username, password }) => {
    try {
      await login(username, password);
      toast.success('เข้าสู่ระบบสำเร็จ', {
        description: `ยินดีต้อนรับกลับ, ${username}`,
      });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.status === 429
        ? 'ลองอีกครั้งในภายหลัง'
        : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      toast.error('เข้าสู่ระบบไม่สำเร็จ', { description: msg });
    }
  };

  const inputClass = (hasError) => `
    w-full h-11 pl-11 pr-4 rounded-lg text-sm text-foreground
    bg-white/[0.05] border transition-all duration-200
    placeholder:text-white/30
    ${hasError
      ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
      : 'border-white/[0.08] focus:border-gold/60 focus:ring-2 focus:ring-gold/15'
    }
    hover:bg-white/[0.07] hover:border-white/[0.12]
  `;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#08080e]">
      <FloatingShape delay={0} duration={10} x={80} y={-80} size={500} color="rgba(201,168,76,0.06)" />
      <FloatingShape delay={3} duration={12} x={-60} y={100} size={400} color="rgba(59,130,246,0.04)" />
      <FloatingShape delay={5} duration={8} x={50} y={60} size={300} color="rgba(124,92,224,0.03)" />

      {Array.from({ length: 12 }).map((_, i) => (
        <Particle key={i} index={i} />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="relative backdrop-blur-xl bg-white/[0.04] rounded-2xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)] border border-white/[0.06]">
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(160deg, rgba(201,168,76,0.04) 0%, transparent 40%, rgba(59,130,246,0.02) 100%)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-8 relative"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.5, type: 'spring', stiffness: 120 }}
              className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-gold to-gold-light shadow-[0_0_20px_rgba(201,168,76,0.3)] flex items-center justify-center"
            >
              <Zap className="w-7 h-7 text-[#08080e]" />
            </motion.div>

            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Black En
            </h1>
            <p className="text-muted-foreground text-xs mt-1 tracking-widest uppercase font-medium">
              Admin Panel
            </p>

            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/20" />
              <Shield className="w-3.5 h-3.5 text-gold/40" />
              <span className="text-[11px] text-gold/50 font-medium tracking-wide">SECURE LOGIN</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/20" />
            </div>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative" aria-label="Login form">
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <label htmlFor="username" className="sr-only">ชื่อผู้ใช้</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" aria-hidden="true" />
                <input
                  id="username"
                  {...register('username')}
                  placeholder="ชื่อผู้ใช้"
                  autoComplete="username"
                  spellCheck={false}
                  aria-required="true"
                  aria-invalid={errors.username ? 'true' : undefined}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                  className={inputClass(errors.username)}
                />
              </div>
              {errors.username && (
                <motion.p
                  id="username-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 mt-1.5 pl-1"
                  role="alert"
                >
                  {errors.username.message}
                </motion.p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38, duration: 0.4 }}
            >
              <label htmlFor="password" className="sr-only">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" aria-hidden="true" />
                <input
                  id="password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="รหัสผ่าน"
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={inputClass(errors.password) + ' pr-11'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors rounded-md p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  id="password-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 mt-1.5 pl-1"
                  role="alert"
                >
                  {errors.password.message}
                </motion.p>
              )}
            </motion.div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="size-3.5 rounded border-white/20 bg-white/[0.05] text-gold accent-gold cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                  จดจำฉัน
                </label>
              </div>
              <button
                type="button"
                className="text-xs text-gold/60 hover:text-gold transition-colors"
                onClick={() => toast.info('กรุณาติดต่อผู้ดูแลระบบ')}
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="pt-1"
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  relative w-full h-11 rounded-lg font-semibold text-sm overflow-hidden
                  transition-all duration-200
                  ${isSubmitting
                    ? 'bg-gold/40 cursor-not-allowed text-white/60'
                    : 'bg-gradient-to-r from-gold to-gold-light hover:brightness-110 active:scale-[0.98] shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]'
                  }
                `}
                aria-label="เข้าสู่ระบบ"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span className="text-[#08080e]/70">กำลังเข้าสู่ระบบ...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 text-[#08080e]">
                    <LogIn className="w-4 h-4" />
                    เข้าสู่ระบบ
                  </span>
                )}
              </button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-6 pt-5 border-t border-white/[0.05] text-center"
          >
            <p className="text-[11px] text-white/20">
              &copy; {new Date().getFullYear()} Black En — RAN Online Admin Panel
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;

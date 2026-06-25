import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User, LogIn, Zap } from 'lucide-react';
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
        opacity: [0.15, 0.3, 0.15],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

function Particle({ index }) {
  const random = useCallback((min, max) => Math.random() * (max - min) + min, []);

  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-white/20 pointer-events-none"
      style={{
        left: `${random(0, 100)}%`,
        top: `${random(0, 100)}%`,
      }}
      animate={{
        y: [0, -30, 0],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: random(3, 6),
        delay: random(0, 3),
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const controls = useAnimation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    controls.start({ opacity: 1, y: 0 });
  }, [controls]);

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
      toast.error('เข้าสู่ระบบไม่สำเร็จ', {
        description: msg,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#0f0f23] to-[#0a0a2e]">
      {/* Animated Background */}
      <FloatingShape delay={0} duration={8} x={100} y={-100} size={500} color="rgba(74,74,255,0.12)" />
      <FloatingShape delay={2} duration={10} x={-80} y={120} size={400} color="rgba(139,92,246,0.08)" />
      <FloatingShape delay={4} duration={7} x={60} y={80} size={300} color="rgba(59,130,246,0.06)" />

      {/* Particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Particle key={i} index={i} />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card with glass effect */}
        <div className="relative backdrop-blur-xl bg-white/[0.03] rounded-3xl p-10 shadow-2xl shadow-black/50 border border-white/[0.06]">
          {/* Subtle gradient border */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
            }}
          />

          {/* Logo & Branding */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-10 relative"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 150 }}
              className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/25 flex items-center justify-center"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              Black En
            </h1>
            <p className="text-white/40 text-sm mt-1.5 font-medium tracking-wide uppercase">
              Admin Panel
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input
                  {...register('username')}
                  placeholder="ชื่อผู้ใช้"
                  autoComplete="username"
                  spellCheck={false}
                  className={`
                    w-full h-12 pl-10 pr-4 rounded-xl text-sm text-white
                    bg-white/[0.04] border outline-none transition-all duration-200
                    placeholder:text-white/20
                    ${errors.username
                      ? 'border-red-400/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
                      : 'border-white/[0.08] focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
                    }
                    hover:bg-white/[0.06]
                  `}
                />
                {errors.username && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 mt-1.5 pl-1"
                  >
                    {errors.username.message}
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="รหัสผ่าน"
                  autoComplete="current-password"
                  className={`
                    w-full h-12 pl-10 pr-12 rounded-xl text-sm text-white
                    bg-white/[0.04] border outline-none transition-all duration-200
                    placeholder:text-white/20
                    ${errors.password
                      ? 'border-red-400/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
                      : 'border-white/[0.08] focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
                    }
                    hover:bg-white/[0.06]
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 mt-1.5 pl-1"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  relative w-full h-12 rounded-xl font-semibold text-sm overflow-hidden
                  transition-all duration-200
                  ${isSubmitting
                    ? 'bg-primary/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-purple-500 hover:from-primary-hover hover:to-purple-600 active:scale-[0.98] shadow-lg shadow-primary/25'
                  }
                `}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span className="text-white/80">กำลังเข้าสู่ระบบ...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 text-white">
                    <LogIn className="w-4 h-4" />
                    เข้าสู่ระบบ
                  </span>
                )}
              </button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-center text-white/20 text-xs mt-8"
          >
            &copy; {new Date().getFullYear()} Black En. All rights reserved.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;

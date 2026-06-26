import { cn } from '@/lib/utils';

function GlassCard({ children, className, glow = false, glowColor = 'rgba(201,168,76,0.1)', ...props }) {
  return (
    <div
      className={cn(
        'relative backdrop-blur-xl bg-white/[0.04] rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300',
        glow && 'hover:shadow-[0_0_30px_rgba(201,168,76,0.1)]',
        className
      )}
      style={glow ? { '--tw-shadow-color': glowColor } : undefined}
      {...props}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'linear-gradient(160deg, rgba(201,168,76,0.03) 0%, transparent 40%, rgba(59,130,246,0.02) 100%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export { GlassCard };

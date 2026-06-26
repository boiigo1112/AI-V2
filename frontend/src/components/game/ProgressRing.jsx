import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function ProgressRing({ value = 0, max = 100, size = 120, strokeWidth = 6, color = '#c9a84c', bgColor = 'rgba(255,255,255,0.06)' }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedValue / max) * circumference;
  const percentage = Math.round((animatedValue / max) * 100);

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const duration = 1500;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(eased * value);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-100"
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{percentage}%</span>
        <span className="text-xs text-muted-foreground mt-0.5">{Math.round(animatedValue)}/{max}</span>
      </div>
    </div>
  );
}

export { ProgressRing };

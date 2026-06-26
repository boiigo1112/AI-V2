import { useState, useEffect } from 'react';

function AnimatedCounter({ value, duration = 1200, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === undefined || value === null) return;
    const target = Number(value);
    if (isNaN(target)) return;

    let start = 0;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setDisplay(start);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [value, duration]);

  if (value === undefined || value === null) return <span>—</span>;

  return (
    <span>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

export { AnimatedCounter };

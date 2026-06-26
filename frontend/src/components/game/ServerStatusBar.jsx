import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Clock, Activity } from 'lucide-react';

function ServerStatusBar({ serverName = 'RAN Online Server', online = 47, maxOnline = 500, uptime = '99.9%' }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="backdrop-blur-xl bg-white/[0.03] border-b border-white/[0.06] px-5 py-2.5"
    >
      <div className="flex items-center justify-between max-w-[1400px] mx-auto">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${pulse ? 'bg-success' : 'bg-success/50'}`} />
            <span className="text-xs font-semibold text-foreground">{serverName}</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-success" />
              <span>Online: <strong className="text-foreground">{online}/{maxOnline}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Uptime: <strong className="text-foreground">{uptime}</strong></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="hidden md:flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            <span>Server OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gold font-medium">v2.1.0</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { ServerStatusBar };

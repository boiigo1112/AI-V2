import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Pencil, MapPin, Clock, Wifi, WifiOff } from 'lucide-react';
import { getClassName, getSchoolName } from '@/lib/ran-online';

function CharacterCard({ character, onEdit }) {
  const isOnline = character.ChaOnline === 1;
  const className = getClassName(character.ChaClass);
  const schoolName = getSchoolName(character.ChaSchool);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-4 hover:border-gold/20 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gold/10 flex items-center justify-center text-sm font-bold text-gold">
              {character.ChaName?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{character.ChaName}</p>
              <p className="text-[10px] text-muted-foreground">
                {className} · {schoolName} · Reborn {character.ChaReborn || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                <Wifi className="w-2.5 h-2.5" /> ออนไลน์
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-full">
                <WifiOff className="w-2.5 h-2.5" /> ออฟไลน์
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          {[
            { l: 'Level', v: character.ChaLevel },
            { l: 'Money', v: character.ChaMoney, fmt: true },
            { l: 'EXP', v: character.ChaExp, fmt: true },
            { l: 'Power', v: character.ChaPower, fmt: true },
            { l: 'Reborn', v: character.ChaReborn },
            { l: 'PK', v: character.ChaPK },
          ].map(s => (
            <div key={s.l} className="bg-white/[0.03] rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {s.fmt ? Number(s.v || 0).toLocaleString() : s.v ?? '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Location + Last Login */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Map: {character.ChaStartMap ?? '—'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last: {character.ChaLevelTime ? new Date(character.ChaLevelTime).toLocaleDateString('th-TH') : '—'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.05]">
          <button
            onClick={() => onEdit(character)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> แก้ไข
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export { CharacterCard };

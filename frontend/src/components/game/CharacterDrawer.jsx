import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Gamepad2 } from 'lucide-react';
import { useGamePlayerCharacters } from '@/hooks/use-game';
import { CharacterCard } from './CharacterCard';

function CharacterDrawer({ account, open, onClose, onEditChar }) {
  const { data: characters, isLoading } = useGamePlayerCharacters(
    open && account ? account.UserNum : null
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-background border-l border-white/[0.08] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-gold/10 flex items-center justify-center text-sm font-bold text-gold">
                  {account?.UserID?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    ตัวละครของ {account?.UserID}
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    {characters?.length || 0} ตัวละคร
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
                </div>
              ) : characters && characters.length > 0 ? (
                characters.map((char, i) => (
                  <motion.div
                    key={char.ChaNum || i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <CharacterCard
                      character={char}
                      onEdit={onEditChar}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Gamepad2 className="w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">ไม่มีตัวละคร</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { CharacterDrawer };

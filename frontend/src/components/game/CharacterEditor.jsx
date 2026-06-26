import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateCharacter } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';

const editableSections = [
  {
    title: 'Basic Stats',
    fields: [
      { key: 'ChaLevel', label: 'Level', type: 'number' },
      { key: 'ChaMoney', label: 'Money', type: 'number' },
      { key: 'ChaExp', label: 'EXP', type: 'number' },
      { key: 'ChaReborn', label: 'Reborn', type: 'number' },
    ],
  },
  {
    title: 'Combat Stats',
    fields: [
      { key: 'ChaPower', label: 'Power', type: 'number' },
      { key: 'ChaDex', label: 'Dex', type: 'number' },
      { key: 'ChaSpirit', label: 'Spirit', type: 'number' },
      { key: 'ChaStrong', label: 'Strong', type: 'number' },
      { key: 'ChaIntel', label: 'Intel', type: 'number' },
      { key: 'ChaPK', label: 'PK', type: 'number' },
    ],
  },
  {
    title: 'Status',
    fields: [
      { key: 'ChaHP', label: 'HP', type: 'number' },
      { key: 'ChaMP', label: 'MP', type: 'number' },
      { key: 'ChaSP', label: 'SP', type: 'number' },
      { key: 'ChaInvenLine', label: 'Storage Lines', type: 'number' },
    ],
  },
];

function CharacterEditor({ character, open, onClose }) {
  const [form, setForm] = useState({});
  const updateChar = useUpdateCharacter();

  useEffect(() => {
    if (character) {
      const f = {};
      editableSections.forEach(s => s.fields.forEach(field => {
        f[field.key] = character[field.key] ?? '';
      }));
      setForm(f);
    }
  }, [character]);

  if (!open || !character) return null;

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      for (const [field, value] of Object.entries(form)) {
        if (value !== '' && value !== undefined && value !== character[field]) {
          await updateChar.mutateAsync({
            id: String(character.ChaNum),
            field,
            value: String(value),
          });
        }
      }
      toast.success('อัปเดตตัวละครสำเร็จ');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'อัปเดตไม่สำเร็จ');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-card rounded-2xl shadow-2xl border border-white/[0.08] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-gold/10 flex items-center justify-center text-sm font-bold text-gold">
              {character.ChaName?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">แก้ไขตัวละคร</h3>
              <p className="text-xs text-muted-foreground">{character.ChaName} · Lv.{character.ChaLevel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="space-y-5">
            {editableSections.map(section => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{section.title}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {section.fields.map(field => (
                    <div key={field.key}>
                      <label className="text-[11px] text-muted-foreground mb-1 block">{field.label}</label>
                      <input
                        type={field.type}
                        value={form[field.key] ?? ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 pt-0">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={updateChar.isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
            {updateChar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            บันทึก
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { CharacterEditor };

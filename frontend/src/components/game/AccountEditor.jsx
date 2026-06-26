import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const editableFields = [
  { key: 'UserFullName', label: 'ชื่อเต็ม', type: 'text' },
  { key: 'UserEmail', label: 'อีเมล', type: 'email' },
  { key: 'UserPoint', label: 'Point', type: 'number' },
  { key: 'UserVIP', label: 'VIP', type: 'number' },
  { key: 'VotePoint', label: 'Vote Point', type: 'number' },
  { key: 'UserAge', label: 'อายุ', type: 'number' },
];

const readOnlyFields = [
  { key: 'UserID', label: 'UserID' },
  { key: 'UserName', label: 'UserName' },
  { key: 'CreateDate', label: 'สร้างเมื่อ', fmt: d => d ? new Date(d).toLocaleDateString('th-TH') : '—' },
  { key: 'LastLoginDate', label: 'เข้าระบบล่าสุด', fmt: d => d ? new Date(d).toLocaleDateString('th-TH') : '—' },
  { key: 'LastIP', label: 'IP ล่าสุด' },
];

function AccountEditor({ account, open, onClose }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      const f = {};
      editableFields.forEach(field => {
        f[field.key] = account[field.key] ?? '';
      });
      setForm(f);
    }
  }, [account]);

  if (!open || !account) return null;

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields = {};
      editableFields.forEach(f => {
        const val = form[f.key];
        if (val !== '' && val !== undefined && val !== account[f.key]) {
          fields[f.key] = f.type === 'number' ? Number(val) : val;
        }
      });

      if (Object.keys(fields).length === 0) {
        toast.info('ไม่มีการเปลี่ยนแปลง');
        onClose();
        return;
      }

      await api.put(`/game/players/${account.UserNum}`, { fields });

      toast.success('อัปเดตข้อมูลผู้เล่นสำเร็จ');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'อัปเดตไม่สำเร็จ');
    } finally {
      setSaving(false);
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
        className="w-full max-w-lg max-h-[85vh] overflow-hidden bg-card rounded-2xl shadow-2xl border border-white/[0.08] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">แก้ไขข้อมูลผู้เล่น</h3>
            <p className="text-xs text-muted-foreground">{account.UserID} · ID: {account.UserNum}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Read-only info */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">ข้อมูลบัญชี</h4>
              <div className="space-y-2">
                {readOnlyFields.map(f => (
                  <div key={f.key} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="text-xs font-medium text-foreground">{f.fmt ? f.fmt(account[f.key]) : (account[f.key] ?? '—')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">แก้ไขข้อมูล</h4>
              <div className="grid grid-cols-2 gap-3">
                {editableFields.map(field => (
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
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 pt-0">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold-light text-[#08080e]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            บันทึก
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { AccountEditor };

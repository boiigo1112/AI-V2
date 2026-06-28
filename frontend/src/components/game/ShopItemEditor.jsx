import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateShopItem, useUpdateShopItem } from '@/hooks/use-game';
import { Button } from '@/components/ui/button';

const fields = [
  { key: 'ItemName', label: 'ชื่อสินค้า', type: 'text', required: true },
  { key: 'ItemPrice', label: 'ราคา (Point)', type: 'number' },
  { key: 'ItemStock', label: 'สต๊อก', type: 'number' },
  { key: 'ItemMain', label: 'Item Main', type: 'number' },
  { key: 'ItemSub', label: 'Item Sub', type: 'number' },
  { key: 'Category', label: 'หมวดหมู่', type: 'text' },
  { key: 'ItemSection', label: 'Section', type: 'number' },
  { key: 'ItemMoney', label: 'ราคาในเกม', type: 'number' },
];

function ShopItemEditor({ item, open, onClose }) {
  const [form, setForm] = useState({});
  const createItem = useCreateShopItem();
  const updateItem = useUpdateShopItem();
  const isEdit = !!item;

  useEffect(() => {
    if (item) {
      const f = {};
      fields.forEach(field => { f[field.key] = item[field.key] ?? ''; });
      setForm(f);
    } else {
      setForm({ ItemName: '', ItemPrice: 0, ItemStock: 0, ItemMain: 0, ItemSub: 0, Category: '', ItemSection: 0, ItemMoney: 0 });
    }
  }, [item]);

  if (!open) return null;

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.ItemName) {
      toast.error('กรุณากรอกชื่อสินค้า');
      return;
    }
    try {
      if (isEdit) {
        const payload = {};
        fields.forEach(f => {
          payload[f.key] = f.type === 'number' ? Number(form[f.key] || 0) : form[f.key];
        });
        await updateItem.mutateAsync({ id: item.ProductNum, ...payload });
        toast.success('อัปเดตสินค้าสำเร็จ');
      } else {
        await createItem.mutateAsync({
          item_name: form.ItemName,
          item_price: Number(form.ItemPrice || 0),
          item_stock: Number(form.ItemStock || 0),
          item_main: Number(form.ItemMain || 0),
          item_sub: Number(form.ItemSub || 0),
          category: form.Category || '',
          item_section: Number(form.ItemSection || 0),
        });
        toast.success('สร้างสินค้าสำเร็จ');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/80 backdrop-blur-sm p-4"
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
          <h3 className="text-base font-semibold text-foreground">
            {isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(field => (
              <div key={field.key} className={field.key === 'ItemName' ? 'col-span-2' : ''}>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  {field.label} {field.required && <span className="text-danger">*</span>}
                </label>
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

        <div className="flex justify-end gap-3 p-5 pt-0">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={isPending} className="bg-gold hover:bg-gold-light text-[#08080e]">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {isEdit ? 'บันทึก' : 'สร้าง'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { ShopItemEditor };

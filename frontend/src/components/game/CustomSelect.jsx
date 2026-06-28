import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function CustomSelect({ value, onChange, options, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
  };

  const handleSelect = (optValue) => {
    onChange(optValue);
    setOpen(false);
  };

  const selected = options.find(o => o.value === value);

  return (
    <div ref={triggerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full h-10 px-3 pr-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground outline-none focus:border-gold/50 cursor-pointer text-left flex items-center justify-between transition-colors hover:border-white/[0.15]"
      >
        <span className={cn(!selected && 'text-muted-foreground')}>{selected?.label || placeholder}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-[#12121f] border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
          style={{ top: position.top, left: position.left, width: position.width, minWidth: 140, zIndex: 9999 }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(opt.value); }}
              className={cn(
                'w-full px-3 py-2 text-sm text-left transition-colors',
                opt.value === value
                  ? 'bg-gold/10 text-gold font-medium'
                  : 'text-foreground hover:bg-white/[0.05]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export { CustomSelect };

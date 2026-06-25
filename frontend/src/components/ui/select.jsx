import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({ className, label, error, children, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-sm font-medium text-muted">{label}</label>
    )}
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-lg border bg-bg px-3.5 py-2.5 pr-10 text-sm text-text outline-none',
          'transition-colors duration-150 focus:border-primary focus:ring-1 focus:ring-primary/30',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
    </div>
    {error && <p className="text-xs text-danger">{error}</p>}
  </div>
));

Select.displayName = 'Select';
export { Select };

import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(({ className, label, error, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-sm font-medium text-muted">{label}</label>
    )}
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border bg-bg px-3.5 py-2.5 text-sm text-text outline-none',
        'placeholder:text-muted/50 transition-colors duration-150',
        'focus:border-primary focus:ring-1 focus:ring-primary/30',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        error ? 'border-danger' : 'border-border',
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-danger">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export { Input };

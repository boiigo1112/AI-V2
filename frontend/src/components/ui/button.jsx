import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20',
  outline: 'border border-border bg-transparent text-text hover:border-primary hover:text-primary',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-white',
  ghost: 'text-muted hover:text-text hover:bg-hover',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = forwardRef(({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      'disabled:opacity-50 disabled:pointer-events-none',
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  >
    {children}
  </button>
));

Button.displayName = 'Button';
export { Button };

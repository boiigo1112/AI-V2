import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
};

function Badge({ className, variant = 'default', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export { Badge };

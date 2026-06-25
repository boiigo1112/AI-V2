import { cn } from '../../lib/utils';

function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-card border border-border shadow-lg shadow-black/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('p-6 pb-0', className)} {...props}>
      {children}
    </div>
  );
}

function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardContent };

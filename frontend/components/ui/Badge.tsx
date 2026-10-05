import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'active' | 'expired' | 'low-stock' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:    'bg-neutral-100 text-neutral-700',
  active:     'bg-primary-light text-primary-dark',
  expired:    'bg-red-50 text-error',
  'low-stock': 'bg-orange-50 text-accent-dark',
  primary:    'bg-primary text-white',
};

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

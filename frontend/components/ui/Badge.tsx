import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'active' | 'expired' | 'low-stock' | 'primary';

const variantMap: Record<BadgeVariant, string> = {
  default:     'bg-surface-soft text-ink-muted',
  active:      'bg-[var(--success-bg)] text-[var(--success)]',
  expired:     'bg-[var(--error-bg)] text-[var(--error)]',
  'low-stock': 'bg-[var(--warning-bg)] text-[var(--warning)]',
  primary:     'bg-accent-muted text-accent-dark',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({
  variant = 'default',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-xs py-2xs text-[length:var(--step--1)] font-medium',
        variantMap[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

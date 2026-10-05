import { cn } from '@/lib/utils';

type AlertType = 'error' | 'success' | 'warning' | 'info';

const typeMap: Record<
  AlertType,
  { bg: string; border: string; text: string; role: 'alert' | 'status'; live: 'assertive' | 'polite' }
> = {
  error:   { bg: 'bg-[var(--error-bg)]',   border: 'border-s-[var(--error)]',   text: 'text-[var(--error)]',   role: 'alert',  live: 'assertive' },
  success: { bg: 'bg-[var(--success-bg)]', border: 'border-s-[var(--success)]', text: 'text-[var(--success)]', role: 'status', live: 'polite' },
  warning: { bg: 'bg-[var(--warning-bg)]', border: 'border-s-[var(--warning)]', text: 'text-[var(--warning)]', role: 'status', live: 'polite' },
  info:    { bg: 'bg-[var(--info-bg)]',    border: 'border-s-[var(--info)]',    text: 'text-[var(--info)]',    role: 'status', live: 'polite' },
};

interface AlertProps {
  type: AlertType;
  children: React.ReactNode;
  className?: string;
}

export default function Alert({ type, children, className }: AlertProps) {
  const t = typeMap[type];
  return (
    <div
      role={t.role}
      aria-live={t.live}
      className={cn(
        'rounded-md p-m border-s-[3px]',
        t.bg,
        t.border,
        className
      )}
    >
      <p className={cn('text-[length:var(--step-0)] font-medium', t.text)}>
        {children}
      </p>
    </div>
  );
}

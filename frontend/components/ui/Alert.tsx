import { cn } from '@/lib/utils';

type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  children: React.ReactNode;
  className?: string;
}

const typeConfig: Record<AlertType, { border: string; bg: string; text: string; icon: string }> = {
  error:   { border: 'border-error',   bg: 'bg-red-50',    text: 'text-red-900',    icon: '✕' },
  success: { border: 'border-success', bg: 'bg-green-50',  text: 'text-green-900',  icon: '✓' },
  warning: { border: 'border-warning', bg: 'bg-orange-50', text: 'text-orange-900', icon: '⚠' },
  info:    { border: 'border-blue-400', bg: 'bg-blue-50',  text: 'text-blue-900',   icon: 'ℹ' },
};

export default function Alert({ type, children, className }: AlertProps) {
  const config = typeConfig[type];
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex gap-3 p-4 rounded-lg border-s-4',
        config.border,
        config.bg,
        config.text,
        className
      )}
    >
      <span className="shrink-0 font-bold" aria-hidden="true">
        {config.icon}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

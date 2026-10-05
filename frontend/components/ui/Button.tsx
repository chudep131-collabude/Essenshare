import Link from 'next/link';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-[var(--accent-on)] hover:bg-accent-dark border-transparent',
  secondary:
    'bg-surface-soft text-ink hover:bg-line border-transparent',
  ghost:
    'bg-transparent text-ink-muted border-line hover:bg-surface-soft',
  dark:
    'bg-[var(--surface-dark)] text-[var(--ink-on-dark)] border-transparent hover:bg-[oklch(22%_0.012_80)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-[length:var(--step--1)] px-m min-h-[36px]',
  md: 'text-[length:var(--step-0)] px-xl min-h-[44px]',
  lg: 'text-[length:var(--step-1)] px-2xl min-h-[52px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  disabled,
  children,
  className,
  type = 'button',
  'aria-label': ariaLabel,
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-pill border transition-all duration-[var(--dur-fast)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-3 disabled:opacity-50 disabled:pointer-events-none';
  const classes = cn(base, variantStyles[variant], sizeStyles[size], className);

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface AlertProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
  popup?: boolean;
  onClose?: () => void;
  action?: AlertAction;
}

const styles: Record<
  AlertType,
  {
    container: string;
    badge: string;
    title: string;
    text: string;
    actionBtn: string;
    role: 'alert' | 'status';
    live: 'assertive' | 'polite';
  }
> = {
  error: {
    container: 'bg-rose-50 border-rose-200/90 text-rose-950 shadow-xs animate-error-shake',
    badge: 'bg-rose-100 text-rose-600',
    title: 'text-rose-950',
    text: 'text-rose-800',
    actionBtn: 'bg-rose-100 hover:bg-rose-200/80 text-rose-900 border-rose-200',
    role: 'alert',
    live: 'assertive',
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200/90 text-emerald-950 shadow-xs animate-toast-in',
    badge: 'bg-emerald-100 text-emerald-700',
    title: 'text-emerald-950',
    text: 'text-emerald-800',
    actionBtn: 'bg-emerald-100 hover:bg-emerald-200/80 text-emerald-900 border-emerald-200',
    role: 'status',
    live: 'polite',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200/90 text-amber-950 shadow-xs animate-toast-in',
    badge: 'bg-amber-100 text-amber-700',
    title: 'text-amber-950',
    text: 'text-amber-800',
    actionBtn: 'bg-amber-100 hover:bg-amber-200/80 text-amber-900 border-amber-200',
    role: 'status',
    live: 'polite',
  },
  info: {
    container: 'bg-sky-50 border-sky-200/90 text-sky-950 shadow-xs animate-toast-in',
    badge: 'bg-sky-100 text-sky-700',
    title: 'text-sky-950',
    text: 'text-sky-800',
    actionBtn: 'bg-sky-100 hover:bg-sky-200/80 text-sky-900 border-sky-200',
    role: 'status',
    live: 'polite',
  },
};

function AlertIcon({ type }: { type: AlertType }) {
  if (type === 'error') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (type === 'success') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (type === 'warning') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export default function Alert({
  type,
  title,
  children,
  className,
  popup,
  onClose,
  action,
}: AlertProps) {
  const s = styles[type];

  // Auto-detect common helpful contextual actions if not explicitly provided
  const messageStr = typeof children === 'string' ? children.toLowerCase() : '';
  const detectedAction: AlertAction | undefined = action
    ? action
    : messageStr.includes('already exists') || messageStr.includes('already registered')
    ? { label: 'Sign in instead', href: '/login' }
    : messageStr.includes('password') && (messageStr.includes('incorrect') || messageStr.includes('invalid'))
    ? { label: 'Forgot password?', href: '/forgot-password' }
    : undefined;

  const content = (
    <div
      role={s.role}
      aria-live={s.live}
      className={cn(
        'rounded-xl p-3.5 sm:p-4 border flex items-start gap-3 transition-all duration-200',
        s.container,
        popup && 'shadow-xl ring-1 ring-black/5 bg-white/95 backdrop-blur-md',
        className
      )}
    >
      {/* Icon badge */}
      <div className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5', s.badge)}>
        <AlertIcon type={type} />
      </div>

      {/* Main message & details */}
      <div className="flex-1 min-w-0 pt-0.5">
        {title && (
          <h4 className={cn('text-sm font-semibold leading-tight mb-1', s.title)}>
            {title}
          </h4>
        )}
        <div className={cn('text-sm font-normal leading-relaxed', s.text)}>
          {children}
        </div>

        {detectedAction && (
          <div className="mt-2.5">
            {detectedAction.href ? (
              <Link
                href={detectedAction.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-colors',
                  s.actionBtn
                )}
              >
                <span>{detectedAction.label}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={detectedAction.onClick}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer',
                  s.actionBtn
                )}
              >
                <span>{detectedAction.label}</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1.5 -mr-1 -mt-1 text-ink-muted hover:text-ink hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );

  if (popup) {
    return (
      <div className="fixed top-5 right-5 sm:right-6 z-[100] w-[calc(100%-2.5rem)] max-w-sm sm:max-w-md animate-toast-in">
        {content}
      </div>
    );
  }

  return content;
}

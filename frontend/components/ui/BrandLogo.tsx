'use client';

import { HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  variant?: 'default' | 'white' | 'inverted';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({
  variant = 'default',
  size = 'md',
  showText = true,
  className,
}: BrandLogoProps) {
  const badgeSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl',
    lg: 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
  };

  const isWhite = variant === 'white' || variant === 'inverted';

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {/* Icon Badge */}
      <div
        className={cn(
          badgeSizes[size],
          'flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105',
          isWhite
            ? 'bg-teal-500 text-white shadow-teal-900/30'
            : 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-teal-900/20'
        )}
        style={{
          boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
        }}
        aria-hidden="true"
      >
        <HeartHandshake className={cn(iconSizes[size], 'stroke-[2.25]')} />
      </div>

      {/* Wordmark */}
      {showText && (
        <span
          className={cn(
            textSizes[size],
            'font-display font-extrabold tracking-tight leading-none',
            isWhite ? 'text-white' : 'text-[var(--ink)]'
          )}
        >
          <span>Essen</span>
          <span className={isWhite ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400'}>
            Share
          </span>
        </span>
      )}
    </div>
  );
}

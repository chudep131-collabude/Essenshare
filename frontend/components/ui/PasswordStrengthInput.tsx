'use client';

import { useState } from 'react';
import { evaluatePassword } from '@/lib/password';
import { cn } from '@/lib/utils';

interface PasswordStrengthInputProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

export default function PasswordStrengthInput({
  id = 'password',
  name = 'password',
  label = 'Password',
  required = true,
  value,
  onChange,
  autoComplete = 'new-password',
  placeholder = 'Create a secure password',
  error,
  className,
}: PasswordStrengthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const strength = evaluatePassword(value);
  const hasValue = value.length > 0;

  // Show rules if user has interacted or is currently typing
  const showChecklist = isFocused || hasValue;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="text-error ms-1" aria-label="required">
              *
            </span>
          )}
        </label>
        {hasValue && (
          <span
            className="text-xs font-semibold uppercase tracking-wider transition-colors duration-200"
            style={{ color: strength.color }}
          >
            {strength.label}
          </span>
        )}
      </div>

      {/* Input container with Show/Hide toggle */}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={`${id}-strength-meter ${id}-requirements ${error ? `${id}-err` : ''}`}
          aria-invalid={!!error}
          className={cn(
            'w-full px-4 py-2.5 pe-11 rounded-md border text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors',
            error
              ? 'border-error focus:border-error'
              : 'border-line focus:border-accent'
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-ink-muted hover:text-ink transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {showPassword ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Visual Strength Meter (segmented bar) */}
      <div
        id={`${id}-strength-meter`}
        className="space-y-1.5 pt-1"
        aria-label={`Password strength: ${hasValue ? strength.label : 'None'}`}
        role="progressbar"
        aria-valuenow={strength.score}
        aria-valuemin={0}
        aria-valuemax={5}
      >
        <div className="grid grid-cols-5 gap-1.5 h-1.5">
          {Array.from({ length: 5 }).map((_, idx) => {
            const isFilled = idx < strength.score;
            return (
              <div
                key={idx}
                className="h-full rounded-full transition-all duration-300"
                style={{
                  backgroundColor: isFilled
                    ? strength.color
                    : 'var(--line-subtle)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Interactive Criteria Checklist */}
      {showChecklist && (
        <div
          id={`${id}-requirements`}
          className="p-3 rounded-md bg-[var(--surface-soft)] border border-[var(--line-subtle)] space-y-1.5 mt-2 transition-all duration-200"
          role="region"
          aria-label="Password complexity requirements"
        >
          <p className="text-xs font-semibold text-ink-muted mb-1">
            Password must contain:
          </p>
          <ul className="space-y-1 text-xs" role="list">
            {strength.ruleResults.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  'flex items-center gap-2 transition-colors duration-150',
                  rule.passed ? 'text-[var(--accent-dark)] font-medium' : 'text-ink-quiet'
                )}
              >
                {rule.passed ? (
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--accent-muted)] text-[var(--accent-dark)] shrink-0"
                    aria-hidden="true"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-transparent border border-line-strong shrink-0"
                    aria-hidden="true"
                  >
                    <span className="w-1 h-1 rounded-full bg-line-strong" />
                  </span>
                )}
                <span>{rule.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-error font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

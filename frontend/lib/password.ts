/**
 * lib/password.ts
 * Comprehensive password complexity evaluation and criteria rules.
 * Enforces:
 *  - Minimum 8 characters
 *  - At least one uppercase letter (A-Z)
 *  - At least one lowercase letter (a-z)
 *  - At least one number (0-9)
 *  - At least one special character (!@#$%^&* etc.)
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (p) => p.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter (A–Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter (a–z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'number',
    label: 'At least one number (0–9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'At least one special character (!@#$%^&*)',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export interface PasswordStrength {
  score: number; // 0 to 5
  percentage: number; // 0 to 100
  label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  passedCount: number;
  totalCount: number;
  isStrong: boolean;
  ruleResults: { id: string; label: string; passed: boolean }[];
}

export function evaluatePassword(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      percentage: 0,
      label: 'Too weak',
      color: 'var(--ink-disabled)',
      passedCount: 0,
      totalCount: PASSWORD_RULES.length,
      isStrong: false,
      ruleResults: PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, passed: false })),
    };
  }

  const ruleResults = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: rule.test(password),
  }));

  const passedCount = ruleResults.filter((r) => r.passed).length;
  const isStrong = passedCount === PASSWORD_RULES.length;

  let label: PasswordStrength['label'] = 'Too weak';
  let color = 'var(--error)';

  if (passedCount <= 1) {
    label = 'Too weak';
    color = 'var(--error)';
  } else if (passedCount === 2) {
    label = 'Weak';
    color = 'oklch(62% 0.18 35)';
  } else if (passedCount === 3) {
    label = 'Fair';
    color = 'var(--warning)';
  } else if (passedCount === 4) {
    label = 'Good';
    color = 'oklch(68% 0.16 120)';
  } else {
    label = 'Strong';
    color = 'var(--accent)';
  }

  return {
    score: passedCount,
    percentage: (passedCount / PASSWORD_RULES.length) * 100,
    label,
    color,
    passedCount,
    totalCount: PASSWORD_RULES.length,
    isStrong,
    ruleResults,
  };
}

/**
 * Validates a password and returns the first error message or null if valid.
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter (A–Z).';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter (a–z).';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number (0–9).';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special character (e.g. !@#$%^&*).';
  }
  return null;
}

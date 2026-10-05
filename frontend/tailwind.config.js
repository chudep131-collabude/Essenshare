/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          light: 'var(--color-primary-light)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
        },
        'neutral-900': 'var(--color-neutral-900)',
        'neutral-700': 'var(--color-neutral-700)',
        'neutral-500': 'var(--color-neutral-500)',
        'neutral-300': 'var(--color-neutral-300)',
        'neutral-100': 'var(--color-neutral-100)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        'bg-base': 'var(--color-bg)',
        'text-base': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        'border-base': 'var(--color-border)',
      },
    },
  },
  plugins: [],
};

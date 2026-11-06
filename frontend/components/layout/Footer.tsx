'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Footer() {
  const { t } = useTranslation();

  const platformLinks = [
    { href: '/find',   label: t('nav.find_food') },
    { href: '/impact', label: t('nav.impact') },
    { href: '/about',  label: t('nav.about') },
  ];

  const donorLinks = [
    { href: '/register', label: t('footer.post_surplus') },
    { href: '/login',    label: t('nav.login') },
    { href: '/safety',   label: t('nav.safety') },
  ];

  const legalLinks = [
    { href: '/privacy', label: t('nav.privacy') },
    { href: '/safety',  label: t('nav.safety') },
  ];

  return (
    <footer
      style={{ backgroundColor: 'var(--surface-dark)' }}
      aria-label="Site footer"
    >
      <div className="max-w-[1440px] mx-auto px-[var(--space-page)] py-[var(--space-4xl)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-[var(--space-3xl)]">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Essenshare home" className="inline-block mb-[var(--space-m)]">
              <BrandLogo variant="white" size="md" />
            </Link>
            <p
              className="text-[var(--step--1)] leading-relaxed mb-4"
              style={{ color: 'var(--ink-on-dark-muted)' }}
            >
              {t('footer.tagline')}
            </p>
            <div>
              <LanguageSwitcher variant="footer" />
            </div>
          </div>

          {/* Platform */}
          <div>
            <p
              className="text-[var(--step--1)] font-medium uppercase tracking-[0.08em] mb-[var(--space-m)]"
              style={{ color: 'var(--accent)' }}
            >
              {t('footer.platform')}
            </p>
            <ul className="space-y-[var(--space-s)]" role="list">
              {platformLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="footer-link text-[var(--step--1)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Donors */}
          <div>
            <p
              className="text-[var(--step--1)] font-medium uppercase tracking-[0.08em] mb-[var(--space-m)]"
              style={{ color: 'var(--accent)' }}
            >
              {t('footer.donors')}
            </p>
            <ul className="space-y-[var(--space-s)]" role="list">
              {donorLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="footer-link text-[var(--step--1)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p
              className="text-[var(--step--1)] font-medium uppercase tracking-[0.08em] mb-[var(--space-m)]"
              style={{ color: 'var(--accent)' }}
            >
              {t('footer.legal_safety')}
            </p>
            <ul className="space-y-[var(--space-s)]" role="list">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="footer-link text-[var(--step--1)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-[var(--space-3xl)] pt-[var(--space-l)] border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: 'oklch(28% 0.010 80)' }}
        >
          <p className="text-[var(--step--1)] text-center sm:text-start" style={{ color: 'var(--ink-quiet)' }}>
            &copy; {new Date().getFullYear()} Essenshare. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ink-on-dark-muted)' }}>
            <Link href="/privacy" className="footer-link hover:underline">
              {t('nav.privacy')}
            </Link>
            <span>·</span>
            <Link href="/safety" className="footer-link hover:underline">
              {t('nav.safety')}
            </Link>
            <span>·</span>
            <Link href="/impact" className="footer-link hover:underline">
              {t('nav.impact')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

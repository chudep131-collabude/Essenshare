'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import NotificationCenter from '@/components/layout/NotificationCenter';
import BrandLogo from '@/components/ui/BrandLogo';


const navLinks = [
  { href: '/find',     label: 'Find Food' },
  { href: '/register', label: 'Donate' },
  { href: '/about',    label: 'About' },
  { href: '/safety',   label: 'Safety' },
  { href: '/impact',   label: 'Impact' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const navLinks = [
    { href: '/find',     label: t('nav.find_food') },
    { href: '/register', label: t('nav.post_surplus') },
    { href: '/about',    label: t('nav.about') },
    { href: '/safety',   label: t('nav.safety') },
    { href: '/impact',   label: t('nav.impact') },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-[var(--surface)]',
        scrolled ? 'border-b border-[var(--line)]' : 'border-b border-[var(--line-subtle)]'
      )}
      style={{
        boxShadow: scrolled
          ? '0 8px 24px oklch(0% 0 0 / 0.08), 0 2px 6px oklch(0% 0 0 / 0.04)'
          : 'none',
        transition: `box-shadow var(--dur-fast) var(--ease-out)`,
      }}
    >
      <nav
        aria-label="Main navigation"
        className="max-w-[1440px] mx-auto px-[var(--space-page)] flex items-center justify-between h-16"
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          aria-label="Essenshare home"
          className="shrink-0 flex items-center transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-lg group"
        >
          <BrandLogo size="md" />
        </Link>

        {/* Desktop nav — lg and above */}
        <ul className="hidden lg:flex items-center gap-1 xl:gap-2" role="list">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative px-3.5 py-2 text-[var(--step--1)] font-medium transition-colors duration-[var(--dur-fast)] rounded-sm whitespace-nowrap',
                    active
                      ? 'text-[var(--accent)] after:absolute after:bottom-0 after:inset-x-3.5 after:h-0.5 after:bg-[var(--accent)] after:rounded-pill'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop auth + language — lg and above */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <LanguageSwitcher variant="navbar" />
          {user && <NotificationCenter />}
          {user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                  className="text-[var(--step--1)] font-semibold text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors duration-[var(--dur-fast)] whitespace-nowrap px-2"
                >
                  {t('nav.admin')}
                </Link>
              )}
              <Link
                href="/dashboard"
                aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}
                className="text-[var(--step--1)] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors duration-[var(--dur-fast)] whitespace-nowrap px-2"
              >
                {t('nav.dashboard')}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center justify-center text-[var(--step--1)] font-semibold bg-[var(--accent)] text-[var(--accent-on)] rounded-pill px-5 min-h-[44px] hover:bg-[var(--accent-dark)] transition-colors duration-[var(--dur-fast)] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                aria-current={pathname === '/login' ? 'page' : undefined}
                className="text-[var(--step--1)] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors duration-[var(--dur-fast)] whitespace-nowrap px-3"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/register"
                aria-current={pathname === '/register' ? 'page' : undefined}
                className="inline-flex items-center justify-center text-[var(--step--1)] font-semibold bg-[var(--accent)] text-[var(--accent-on)] rounded-pill px-5 min-h-[44px] hover:bg-[var(--accent-dark)] transition-colors duration-[var(--dur-fast)] active:scale-[0.98] whitespace-nowrap shrink-0 shadow-sm"
              >
                {t('home.cta_post')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile / Tablet controls (Language + Notifications + Hamburger) */}
        <div className="lg:hidden flex items-center gap-2">
          <LanguageSwitcher variant="navbar" />
          {user && <NotificationCenter />}
          <button
            type="button"
            className="inline-flex items-center justify-center w-11 h-11 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors duration-[var(--dur-fast)]"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((p) => !p)}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile / Tablet menu — visible below lg */}
      <div
        id="mobile-nav"
        className="lg:hidden overflow-hidden"
        aria-hidden={!menuOpen}
        style={{
          maxHeight: menuOpen ? '600px' : '0',
          opacity: menuOpen ? 1 : 0,
          transition: `max-height var(--dur-base) var(--ease-out), opacity var(--dur-fast) var(--ease-out)`,
          backgroundColor: 'var(--surface)',
          borderBottom: menuOpen ? '1px solid var(--line)' : 'none',
        }}
      >
        <ul className="px-[var(--space-page)] pt-[var(--space-s)] pb-[var(--space-l)] space-y-1" role="list">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block w-full px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-medium transition-colors duration-[var(--dur-fast)]',
                    active
                      ? 'bg-[var(--accent-muted)] text-[var(--accent-dark)] font-semibold'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]'
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="pt-[var(--space-s)] flex flex-col gap-[var(--space-s)]">
            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="block w-full text-center px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-semibold bg-[var(--accent-muted)] text-[var(--accent-dark)] hover:bg-[var(--line)] transition-colors duration-[var(--dur-fast)] min-h-[44px] flex items-center justify-center"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="block w-full text-center px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-medium border border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface-soft)] transition-colors duration-[var(--dur-fast)] min-h-[44px] flex items-center justify-center"
                >
                  {t('nav.dashboard')}
                </Link>
                <button
                  type="button"
                  onClick={() => { closeMenu(); void logout(); }}
                  className="block w-full text-center px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-semibold bg-[var(--accent)] text-[var(--accent-on)] hover:bg-[var(--accent-dark)] transition-colors duration-[var(--dur-fast)] min-h-[44px] cursor-pointer"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="block w-full text-center px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-medium border border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface-soft)] transition-colors duration-[var(--dur-fast)] min-h-[44px] flex items-center justify-center"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="block w-full text-center px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-semibold bg-[var(--accent)] text-[var(--accent-on)] hover:bg-[var(--accent-dark)] transition-colors duration-[var(--dur-fast)] min-h-[44px] flex items-center justify-center"
                >
                  {t('home.cta_post')}
                </Link>
              </>
            )}
          </li>
        </ul>
      </div>
    </header>
  );
}

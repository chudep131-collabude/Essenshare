'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-[var(--surface)] transition-shadow duration-[var(--dur-fast)]',
        scrolled ? 'shadow-sm border-b border-[var(--line)]' : 'border-b border-[var(--line-subtle)]'
      )}
    >
      <nav
        aria-label="Main navigation"
        className="max-w-[1440px] mx-auto px-[var(--space-page)] flex items-center justify-between h-16"
      >
        {/* Logo */}
        <Link href="/" onClick={closeMenu} aria-label="Essenshare home" className="shrink-0">
          <Image
            src="/essenshare_logo_transparent.png"
            alt="Essenshare"
            width={140}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative px-[var(--space-m)] py-[var(--space-s)] text-[var(--step--1)] font-medium transition-colors duration-[var(--dur-fast)] rounded-sm',
                    active
                      ? 'text-[var(--accent)] after:absolute after:bottom-0 after:inset-x-[var(--space-m)] after:h-0.5 after:bg-[var(--accent)] after:rounded-pill'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-[var(--space-m)]">
          <Link
            href="/login"
            aria-current={pathname === '/login' ? 'page' : undefined}
            className="text-[var(--step--1)] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors duration-[var(--dur-fast)]"
          >
            Login
          </Link>
          <Link
            href="/register"
            aria-current={pathname === '/register' ? 'page' : undefined}
            className="inline-flex items-center justify-center text-[var(--step--1)] font-semibold bg-[var(--accent)] text-[var(--accent-on)] rounded-pill px-[var(--space-l)] min-h-[38px] hover:bg-[var(--accent-dark)] transition-colors duration-[var(--dur-fast)] active:scale-[0.98]"
          >
            Register
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors duration-[var(--dur-fast)]"
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
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="md:hidden bg-[var(--surface)] border-b border-[var(--line)] shadow-md"
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
              <Link
                href="/login"
                onClick={closeMenu}
                className="block w-full text-center px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-medium border border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface-soft)] transition-colors duration-[var(--dur-fast)]"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="block w-full text-center px-[var(--space-l)] py-[var(--space-m)] rounded-pill text-[var(--step-0)] font-semibold bg-[var(--accent)] text-[var(--accent-on)] hover:bg-[var(--accent-dark)] transition-colors duration-[var(--dur-fast)]"
              >
                Register
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

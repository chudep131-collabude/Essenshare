'use client';

import { useState } from 'react';
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
  const pathname = usePathname();

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border-base shadow-sm">
      <nav
        aria-label="Main navigation"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
      >
        {/* Logo */}
        <Link href="/" className="shrink-0" onClick={closeMenu} aria-label="Essenshare home">
          <Image
            src="/essenshare_logo_transparent.png"
            alt="Essenshare"
            width={140}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                    active
                      ? 'text-primary font-semibold'
                      : 'text-neutral-700 hover:text-primary hover:bg-primary-light'
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold border border-primary text-primary hover:bg-primary-light transition-colors duration-150',
              pathname === '/login' && 'bg-primary-light'
            )}
            aria-current={pathname === '/login' ? 'page' : undefined}
          >
            Login
          </Link>
          <Link
            href="/register"
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors duration-150',
              pathname === '/register' && 'bg-primary-dark'
            )}
            aria-current={pathname === '/register' ? 'page' : undefined}
          >
            Register
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-neutral-700 hover:text-primary hover:bg-primary-light transition-colors duration-150"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={toggleMenu}
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

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="md:hidden absolute inset-x-0 top-16 bg-surface border-b border-border-base shadow-lg z-40"
        >
          <ul className="px-4 pt-2 pb-4 space-y-1" role="list">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={closeMenu}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block px-4 py-3 rounded-lg text-base font-medium transition-colors duration-150',
                      active
                        ? 'bg-primary-light text-primary font-semibold'
                        : 'text-neutral-700 hover:bg-primary-light hover:text-primary'
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={closeMenu}
                className="block w-full text-center px-4 py-3 rounded-lg text-base font-semibold border border-primary text-primary hover:bg-primary-light transition-colors duration-150"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="block w-full text-center px-4 py-3 rounded-lg text-base font-semibold bg-primary text-white hover:bg-primary-dark transition-colors duration-150"
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

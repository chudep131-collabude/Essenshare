'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPerson() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
  );
}

// ── Nav links config ──────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: <IconGrid /> },
  { href: '/admin/users', label: 'Users', icon: <IconPerson /> },
  { href: '/admin/donations', label: 'Donations', icon: <IconBox /> },
  { href: '/admin/reports', label: 'Reports', icon: <IconFlag /> },
  { href: '/admin/audit', label: 'Audit Logs', icon: <IconList /> },
];

// ── AdminNavLink (client, uses usePathname) ───────────────────────────────────

function AdminNavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  // Exact match for dashboard, startsWith for sub-routes
  const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-s)',
        padding: 'var(--space-s) var(--space-m)',
        fontSize: 'var(--step-0)',
        color: isActive ? 'var(--accent)' : 'var(--ink-on-dark-muted)',
        borderInlineStart: isActive ? '3px solid var(--accent)' : '3px solid transparent',
        textDecoration: 'none',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        transition: `color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)`,
        background: isActive ? 'oklch(99% 0.004 85 / 0.06)' : 'transparent',
        fontWeight: isActive ? 600 : 400,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink-on-dark)';
          (e.currentTarget as HTMLAnchorElement).style.background = 'oklch(99% 0.004 85 / 0.04)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink-on-dark-muted)';
          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
        }
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
      }}
    >
      {/* ── Sidebar (desktop) / Top nav (mobile) ── */}
      <nav
        aria-label="Admin navigation"
        style={{
          width: '220px',
          flexShrink: 0,
          background: 'var(--surface-dark)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
        className="admin-sidebar"
      >
        {/* Site name */}
        <div
          style={{
            padding: 'var(--space-l) var(--space-m)',
            borderBottom: '1px solid oklch(30% 0.012 80)',
          }}
        >
          <span
            style={{
              display: 'block',
              color: 'var(--ink-on-dark)',
              fontSize: 'var(--step-1)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textDecoration: 'none',
            }}
          >
            EssenShare
          </span>
          <span
            style={{
              display: 'block',
              color: 'var(--ink-on-dark-muted)',
              fontSize: 'var(--step--1)',
              marginTop: 'var(--space-2xs)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Admin Panel
          </span>
        </div>

        {/* Nav links */}
        <div
          style={{
            padding: 'var(--space-s) 0',
            flex: 1,
          }}
        >
          {NAV_LINKS.map((link) => (
            <AdminNavLink key={link.href} href={link.href} label={link.label} icon={link.icon} />
          ))}
        </div>
      </nav>

      {/* ── Mobile top nav ── */}
      <div className="admin-mobile-nav" aria-label="Admin navigation mobile">
        <span
          style={{
            fontWeight: 700,
            fontSize: 'var(--step-1)',
            color: 'var(--ink-on-dark)',
            letterSpacing: '-0.02em',
          }}
        >
          EssenShare Admin
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto' }}>
          {NAV_LINKS.map((link) => (
            <AdminNavLink key={link.href} href={link.href} label={link.label} icon={link.icon} />
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <main
        style={{
          flex: 1,
          background: 'var(--bg)',
          minHeight: '100vh',
          padding: 'var(--space-xl)',
        }}
        className="admin-main"
      >
        {children}
      </main>

      {/* Responsive styles */}
      <style>{`
        .admin-sidebar {
          display: flex;
        }
        .admin-mobile-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .admin-sidebar {
            display: none;
          }
          .admin-mobile-nav {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: var(--surface-dark);
            padding: var(--space-s) var(--space-m);
            flex-direction: column;
            gap: var(--space-xs);
            border-bottom: 1px solid oklch(30% 0.012 80);
          }
          .admin-main {
            padding-top: calc(var(--space-xl) + 80px) !important;
          }
        }
      `}</style>
    </div>
  );
}

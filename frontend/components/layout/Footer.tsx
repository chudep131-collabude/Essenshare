import Link from 'next/link';
import Image from 'next/image';

const platformLinks = [
  { href: '/find',   label: 'Find Food' },
  { href: '/impact', label: 'Impact Data' },
  { href: '/about',  label: 'About Us' },
];

const donorLinks = [
  { href: '/register', label: 'Become a Donor' },
  { href: '/login',    label: 'Donor Login' },
  { href: '/safety',   label: 'Safety Policy' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
];

export default function Footer() {
  return (
    <footer
      style={{ backgroundColor: 'var(--surface-dark)' }}
      aria-label="Site footer"
    >
      <div className="max-w-[1440px] mx-auto px-[var(--space-page)] py-[var(--space-4xl)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--space-3xl)]">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" aria-label="Essenshare home">
              <Image
                src="/essenshare_logo_transparent.png"
                alt="Essenshare"
                width={140}
                height={36}
                className="h-8 w-auto brightness-0 invert mb-[var(--space-m)]"
              />
            </Link>
            <p
              className="text-[var(--step--1)] leading-relaxed"
              style={{ color: 'var(--ink-on-dark-muted)' }}
            >
              No good food should become waste while someone nearby is hungry.
            </p>
          </div>

          {/* Platform */}
          <div>
            <p
              className="text-[var(--step--1)] font-medium uppercase tracking-[0.08em] mb-[var(--space-m)]"
              style={{ color: 'var(--accent)' }}
            >
              Platform
            </p>
            <ul className="space-y-[var(--space-s)]" role="list">
              {platformLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--step--1)] transition-colors duration-[var(--dur-fast)]"
                    style={{ color: 'var(--ink-on-dark-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink-on-dark)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-on-dark-muted)')}
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
              Donors
            </p>
            <ul className="space-y-[var(--space-s)]" role="list">
              {donorLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--step--1)] transition-colors duration-[var(--dur-fast)]"
                    style={{ color: 'var(--ink-on-dark-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink-on-dark)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-on-dark-muted)')}
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
              Legal
            </p>
            <ul className="space-y-[var(--space-s)]" role="list">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--step--1)] transition-colors duration-[var(--dur-fast)]"
                    style={{ color: 'var(--ink-on-dark-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink-on-dark)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-on-dark-muted)')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-[var(--space-3xl)] pt-[var(--space-l)] border-t"
          style={{ borderColor: 'oklch(28% 0.010 80)' }}
        >
          <p className="text-[var(--step--1)] text-center" style={{ color: 'var(--ink-quiet)' }}>
            &copy; Essenshare. Free, nonprofit-operated. Built with dignity.{' '}
            <Link
              href="/privacy"
              className="underline hover:text-[var(--ink-on-dark-muted)] transition-colors duration-[var(--dur-fast)]"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

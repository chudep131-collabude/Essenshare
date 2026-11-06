import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div style={{minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingInline: 'var(--space-page)'}}>
      <div style={{maxWidth: '36rem', textAlign: 'center'}}>
        {/* Large 404 number */}
        <p style={{fontSize: 'var(--display)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--accent-muted)', fontVariantNumeric: 'tabular-nums', marginBlockEnd: 'var(--space-xl)'}} aria-hidden="true">
          404
        </p>
        <h1 style={{fontSize: 'var(--step-3)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink)', marginBlockEnd: 'var(--space-m)'}}>
          Page not found
        </h1>
        <p style={{fontSize: 'var(--step-0)', color: 'var(--ink-muted)', lineHeight: 1.65, marginBlockEnd: 'var(--space-2xl)', maxWidth: '30ch', marginInline: 'auto'}}>
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{display: 'flex', gap: 'var(--space-m)', justifyContent: 'center', flexWrap: 'wrap'}}>
          <Link href="/" style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingInline: 'var(--space-xl)', paddingBlock: '0.75rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 600, fontSize: 'var(--step-0)', textDecoration: 'none', minHeight: '44px'}}>
            Back to home
          </Link>
          <Link href="/find" style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingInline: 'var(--space-xl)', paddingBlock: '0.75rem', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--line-strong)', background: 'transparent', color: 'var(--ink)', fontWeight: 600, fontSize: 'var(--step-0)', textDecoration: 'none', minHeight: '44px'}}>
            Find food near me
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function DonorCTA() {
  return (
    <section
      aria-labelledby="donor-cta-heading"
      style={{
        background: 'var(--surface-dark)',
        paddingBlock: 'var(--space-section)',
      }}
    >
      <div
        style={{
          maxInlineSize: 'var(--page-max)',
          marginInline: 'auto',
          paddingInline: 'var(--space-page)',
        }}
      >
        {/* Section label */}
        <p
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 500,
            marginBlockEnd: 'var(--space-s)',
          }}
        >
          Join the movement
        </p>

        {/* Heading + body — stacked on mobile, side-by-side on md+ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2xl)',
          }}
          className="md:flex-row md:items-end md:justify-between"
        >
          {/* Left: copy */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-m)',
            }}
          >
            <h2
              id="donor-cta-heading"
              style={{
                fontSize: 'var(--step-3)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                color: 'var(--ink-on-dark)',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
                maxInlineSize: '22ch',
              }}
            >
              Your surplus is someone&rsquo;s dinner table.
            </h2>

            <p
              style={{
                fontSize: 'var(--step-0)',
                color: 'var(--ink-on-dark-muted)',
                lineHeight: 1.65,
                maxInlineSize: '50ch',
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              Register as a donor in under five minutes. List what you have,
              set a collection window, and we handle everything else. No
              administration. No paperwork. No cost.
            </p>
          </div>

          {/* Right: CTAs */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-s)',
              flexShrink: 0,
            }}
            className="sm:flex-row"
          >
            {/* Primary — accent */}
            <Link
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 'var(--space-xl)',
                paddingBlock: '0.75rem',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent)',
                color: 'var(--accent-on)',
                fontWeight: 700,
                fontSize: 'var(--step-0)',
                minHeight: '44px',
                textDecoration: 'none',
                border: '2px solid transparent',
                transition: 'background var(--dur-fast) var(--ease-out)',
                whiteSpace: 'nowrap',
              }}
            >
              Start Donating
            </Link>

            {/* Ghost — white outline */}
            <Link
              href="/about"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 'var(--space-xl)',
                paddingBlock: '0.75rem',
                borderRadius: 'var(--radius-pill)',
                background: 'transparent',
                color: 'oklch(99% 0 0 / 0.80)',
                fontWeight: 700,
                fontSize: 'var(--step-0)',
                minHeight: '44px',
                textDecoration: 'none',
                border: '2px solid oklch(99% 0 0 / 0.35)',
                transition:
                  'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              Learn How It Works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

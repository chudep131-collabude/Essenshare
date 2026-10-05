import type { Metadata } from 'next';
import Link from 'next/link';
import HeroCarousel from '@/components/home/HeroCarousel';
import ImpactStats from '@/components/home/ImpactStats';
import HowItWorks from '@/components/home/HowItWorks';
import DonorCTA from '@/components/home/DonorCTA';

export const metadata: Metadata = {
  title: 'Home',
  description:
    'Find free surplus food and groceries near you, or donate your surplus. Free, nonprofit-operated. No account required to receive.',
};

const trustPoints = [
  {
    label: 'Privacy',
    title: 'Browse completely anonymously',
    body: 'No account needed to find food. We collect no location data from recipients. Your need is your own.',
  },
  {
    label: 'Food Safety',
    title: 'Every listing is accountable',
    body: 'Donors agree to our food safety policy before their first listing. Allergens, use-by dates, and storage conditions are mandatory fields.',
  },
  {
    label: 'Verification',
    title: 'Organisations are verified',
    body: 'Partner organisations complete a verification process before listing food. Individuals self-certify under our terms.',
  },
  {
    label: 'Transparency',
    title: 'All impact data is public',
    body: 'Every completed transaction contributes to our public impact report. No numbers are estimated. All data is verified.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <HeroCarousel />

      {/* 2. Impact stats — white, border-y */}
      <ImpactStats />

      {/* 3. How it works — editorial alternating */}
      <HowItWorks />

      {/* 4. Trust — editorial asymmetric, two-column */}
      <section
        aria-labelledby="trust-heading"
        style={{ backgroundColor: 'var(--bg)', paddingBlock: 'var(--space-section)' }}
      >
        <div className="page-container">
          <div
            style={{ gap: 'clamp(3rem, 6vw, 5rem)' }}
            className="grid grid-cols-1 lg:grid-cols-2"
          >
            {/* LEFT — editorial statement */}
            <div>
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
                Why it works
              </p>

              <h2
                id="trust-heading"
                style={{
                  fontSize: 'var(--step-3)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  maxWidth: '24rem',
                  marginBlockEnd: 'var(--space-l)',
                }}
              >
                Dignity is not a feature. It is the foundation.
              </h2>

              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  maxWidth: '24rem',
                  textWrap: 'pretty',
                  lineHeight: 1.65,
                  marginBlockEnd: 'var(--space-xl)',
                }}
              >
                Essenshare was built with one rule: the person receiving food is never made to
                feel lesser for receiving it. No queues, no vouchers, no public declarations of
                need.
              </p>

              <Link
                href="/about"
                style={{
                  color: 'var(--accent)',
                  fontSize: 'var(--step-0)',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  textDecoration: 'none',
                }}
                className="hover:underline"
              >
                Learn about our approach <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* RIGHT — stacked trust points, no card surfaces */}
            <ul style={{ listStyle: 'none', padding: 0 }} aria-label="Trust and safety points">
              {trustPoints.map((point, i) => (
                <li
                  key={point.label}
                  style={{
                    borderInlineStart: '2px solid var(--line)',
                    paddingInlineStart: 'var(--space-l)',
                    marginBlockEnd: i < trustPoints.length - 1 ? 'var(--space-2xl)' : undefined,
                    transition: 'border-color 0.2s ease',
                  }}
                  className="trust-point"
                >
                  <p
                    style={{
                      fontSize: 'var(--step--1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--accent)',
                      fontWeight: 500,
                      marginBlockEnd: 'var(--space-2xs)',
                    }}
                  >
                    {point.label}
                  </p>
                  <h3
                    style={{
                      fontSize: 'var(--step-1)',
                      fontWeight: 700,
                      color: 'var(--ink)',
                      letterSpacing: '-0.02em',
                      marginBlockEnd: 'var(--space-xs)',
                    }}
                  >
                    {point.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 'var(--step-0)',
                      color: 'var(--ink-muted)',
                      lineHeight: 1.65,
                    }}
                  >
                    {point.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Donor CTA */}
      <DonorCTA />
    </>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import WhyItMatters from '@/components/about/WhyItMatters';

gsap.registerPlugin(ScrollTrigger);

// ─── Data ─────────────────────────────────────────────────────────────────────

const roles = [
  {
    id: 'donors',
    label: 'For Donors',
    title: 'List what you cannot use.',
    body: 'Businesses, farms, restaurants, bakeries, and individuals post surplus food with pickup details, allergen information, and use-by dates. The listing takes under two minutes. The food that would have become waste instead becomes someone\'s meal.',
    image: { src: '/web/grocerys.jpg', alt: 'Surplus grocery items ready for redistribution', position: 'center 55%' },
    cta: { href: '/register', label: 'Start donating' },
    textAlign: 'start' as const,
  },
  {
    id: 'recipients',
    label: 'For Recipients',
    title: 'Find food. No paperwork. No account.',
    body: 'Anyone can browse available donations anonymously. No registration, no means test, no queue number. Open the platform, allow location, and see what is available within walking distance right now. No one should have to prove they are hungry in order to eat.',
    image: { src: '/web/more1.jpg', alt: 'Community member collecting food', position: 'center 40%' },
    cta: { href: '/find', label: 'Find food near me' },
    textAlign: 'end' as const,
  },
  {
    id: 'partners',
    label: 'For Partners',
    title: 'Coordinate redistribution at scale.',
    body: 'Food banks, community centres, and NGOs register to receive larger or regular donations and coordinate redistribution across their area. When an organisation is involved, a single surplus event can feed many more people than it ever could alone.',
    image: { src: '/web/more.jpg', alt: 'Community food redistribution in action', position: 'center center' },
    cta: { href: '/register', label: 'Register your organisation' },
    textAlign: 'start' as const,
  },
];

const principles = [
  { number: '01', title: 'Minimum data', body: 'We collect only what the platform needs to function. Not what would be useful. Not what might be interesting. Nothing more.' },
  { number: '02', title: 'Recipient first', body: 'When we make a decision that could go two ways, recipient privacy wins. Every time. No exception.' },
  { number: '03', title: 'Transparency', body: 'Every user knows exactly what is collected and why. No buried permissions, no vague consent language.' },
  { number: '04', title: 'Control', body: 'Users can access, export, and permanently delete their data at any time. Not in six weeks. Now.' },
  { number: '05', title: 'Dignity', body: 'The platform never treats a person seeking food as a suspect. No suspicion. No gatekeeping. No humiliation.' },
  { number: '06', title: 'No poverty testing', body: 'No means-testing, no eligibility checks, no proof of need. Hunger is not a qualification to be verified.' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RolePanel({
  role,
  panelRef,
}: {
  role: (typeof roles)[0];
  panelRef: (el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={panelRef}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        height: 'clamp(440px, 58vh, 680px)',
        background: 'var(--skeleton)',
      }}
    >
      {/* Full-bleed image */}
      <div
        className="role-image"
        style={{ position: 'absolute', inset: 0, willChange: 'transform, opacity' }}
      >
        <Image
          src={role.image.src}
          alt={role.image.alt}
          fill
          style={{ objectFit: 'cover', objectPosition: role.image.position }}
          sizes="(max-width: 768px) 100vw, calc(100vw - clamp(2rem, 8vw, 5rem))"
          quality={88}
        />
      </div>

      {/* Directional scrim */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            role.textAlign === 'start'
              ? 'linear-gradient(135deg, oklch(5% 0.01 150 / 0.85) 0%, oklch(5% 0.008 80 / 0.45) 45%, transparent 72%)'
              : 'linear-gradient(225deg, oklch(5% 0.01 150 / 0.85) 0%, oklch(5% 0.008 80 / 0.45) 45%, transparent 72%)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(to top, oklch(5% 0.010 80 / 0.72) 0%, oklch(5% 0.010 80 / 0.20) 38%, transparent 62%)',
        }}
      />

      {/* Label pill */}
      <div
        aria-hidden="true"
        className="role-pill"
        style={{
          position: 'absolute',
          insetBlockStart: 'var(--space-l)',
          insetInlineStart: 'var(--space-l)',
          zIndex: 3,
          background: 'oklch(0% 0 0 / 0.48)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid oklch(99% 0 0 / 0.14)',
          borderRadius: 'var(--radius-pill)',
          paddingInline: 'var(--space-m)',
          paddingBlock: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: 'var(--step--1)',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {role.label}
        </span>
      </div>

      {/* Text card */}
      <div
        className={`role-card w-[calc(100%-2rem)] md:w-auto left-4 right-4 md:left-auto md:right-auto ${
          role.textAlign === 'start' ? 'md:!left-[var(--space-2xl)]' : 'md:!right-[var(--space-2xl)]'
        }`}
        style={{
          position: 'absolute',
          zIndex: 3,
          insetBlockEnd: 'clamp(1rem, 3vw, var(--space-2xl))',
          maxInlineSize: 'clamp(18rem, 42%, 26rem)',
          background: 'oklch(8% 0.010 150 / 0.74)',
          backdropFilter: 'blur(16px) saturate(120%)',
          WebkitBackdropFilter: 'blur(16px) saturate(120%)',
          border: '1px solid oklch(99% 0 0 / 0.10)',
          borderRadius: 'var(--radius-md)',
          padding: 'clamp(1rem, 3vw, var(--space-xl))',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-s)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--step-1)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'oklch(97% 0.004 85)',
            textWrap: 'balance' as React.CSSProperties['textWrap'],
          }}
        >
          {role.title}
        </h3>
        <p
          style={{
            fontSize: 'var(--step--1)',
            color: 'oklch(82% 0.006 85)',
            lineHeight: 1.6,
            textWrap: 'pretty' as React.CSSProperties['textWrap'],
          }}
        >
          {role.body}
        </p>
        <Link
          href={role.cta.href}
          style={{
            marginBlockStart: 'var(--space-2xs)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: 'var(--step--1)',
            fontWeight: 600,
            color: 'oklch(75% 0.130 150)',
            textDecoration: 'none',
          }}
          className="hover:underline"
        >
          {role.cta.label} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Inner border ring */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'inset 0 0 0 1px oklch(99% 0 0 / 0.06)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  // Refs
  const heroTextRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const rolesSectionRef = useRef<HTMLElement>(null);
  const rolesHeaderRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const principlesSectionRef = useRef<HTMLElement>(null);
  const principlesHeaderRef = useRef<HTMLDivElement>(null);
  const principleRefs = useRef<(HTMLLIElement | null)[]>([]);
  const modelSectionRef = useRef<HTMLElement>(null);
  const modelImageRef = useRef<HTMLDivElement>(null);
  const modelTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) return;

    const ctx = gsap.context(() => {

      // ── Hero text reveal ──
      if (heroTextRef.current) {
        const eyebrow = heroTextRef.current.querySelector('.hero-eyebrow');
        const headline = heroTextRef.current.querySelector('.hero-headline');
        const sub = heroTextRef.current.querySelector('.hero-sub');
        const ctas = heroTextRef.current.querySelector('.hero-ctas');

        const tl = gsap.timeline({ delay: 0.3 });
        tl.from(eyebrow, { opacity: 0, y: 14, duration: 0.45, ease: 'power2.out' }, 0)
          .from(headline, { clipPath: 'inset(0 0 100% 0)', y: 20, opacity: 0, duration: 0.85, ease: 'power4.out', clearProps: 'clipPath,y,opacity' }, 0.1)
          .from(sub, { opacity: 0, y: 16, duration: 0.55, ease: 'power2.out' }, 0.35)
          .from(ctas, { opacity: 0, y: 12, duration: 0.45, ease: 'power2.out' }, 0.52);
      }

      // ── Pull quote ──
      if (quoteRef.current) {
        gsap.from(quoteRef.current, {
          y: 40, opacity: 0, duration: 0.75, ease: 'power3.out',
          scrollTrigger: { trigger: quoteRef.current, start: 'top 85%', once: true },
        });
      }

      // ── Roles header ──
      if (rolesHeaderRef.current) {
        gsap.from(rolesHeaderRef.current, {
          y: 32, opacity: 0, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: rolesHeaderRef.current, start: 'top 88%', once: true },
        });
      }

      // ── Role panels ──
      panelRefs.current.forEach((panel) => {
        if (!panel) return;
        const img = panel.querySelector('.role-image');
        const card = panel.querySelector('.role-card');
        const pill = panel.querySelector('.role-pill');

        const tl = gsap.timeline({
          scrollTrigger: { trigger: panel, start: 'top 80%', once: true },
        });
        tl.from(img, { scale: 1.06, opacity: 0, duration: 1.1, ease: 'power3.out' }, 0)
          .from(pill, { scale: 0.6, opacity: 0, duration: 0.4, ease: 'back.out(2.2)' }, 0.2)
          .from(card, { y: 40, opacity: 0, duration: 0.65, ease: 'power3.out' }, 0.35);
      });

      // ── Principles header ──
      if (principlesHeaderRef.current) {
        gsap.from(principlesHeaderRef.current, {
          y: 32, opacity: 0, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: principlesHeaderRef.current, start: 'top 88%', once: true },
        });
      }

      // ── Principle items ──
      principleRefs.current.forEach((item, i) => {
        if (!item) return;
        gsap.from(item, {
          x: -20, opacity: 0, duration: 0.5, ease: 'power3.out', delay: (i % 2) * 0.08,
          scrollTrigger: { trigger: item, start: 'top 88%', once: true },
        });
      });

      // ── Model section ──
      if (modelImageRef.current) {
        gsap.from(modelImageRef.current, {
          scale: 0.94, opacity: 0, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: modelImageRef.current, start: 'top 85%', once: true },
        });
      }
      if (modelTextRef.current) {
        gsap.from(modelTextRef.current, {
          y: 28, opacity: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: modelTextRef.current, start: 'top 85%', once: true },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO full-viewport, image-first
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="about-hero-heading"
        style={{
          position: 'relative',
          overflow: 'hidden',
          height: 'clamp(560px, 88vh, 920px)',
        }}
      >
        {/* Background image */}
        <Image
          src="/web/about.jpg"
          alt="A community food sharing moment hands exchanging fresh food"
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center 38%' }}
          sizes="100vw"
          quality={90}
        />

        {/* Gradient scrim */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(to bottom, oklch(0% 0 0 / 0.10) 0%, oklch(0% 0 0 / 0.22) 30%, oklch(0% 0 0 / 0.68) 72%, oklch(0% 0 0 / 0.82) 100%)',
          }}
        />

        {/* Content */}
        <div
          ref={heroTextRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingInline: 'var(--space-page)',
            paddingBlockEnd: 'clamp(3rem, 6vw, 5rem)',
            maxInlineSize: 'var(--page-max)',
            marginInline: 'auto',
            insetInlineStart: 0,
            insetInlineEnd: 0,
          }}
        >
          <div style={{ maxWidth: '48rem' }}>
            <p
              className="hero-eyebrow"
              style={{
                fontSize: 'var(--step--1)',
                color: 'oklch(99% 0 0 / 0.60)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 500,
                marginBlockEnd: 'var(--space-s)',
              }}
            >
              Our mission
            </p>

            <h1
              id="about-hero-heading"
              className="hero-headline"
              style={{
                fontSize: 'var(--display)',
                fontWeight: 800,
                color: 'oklch(99% 0 0)',
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
                marginBlockEnd: 'var(--space-m)',
                willChange: 'clip-path, transform, opacity',
              }}
            >
              Food should never be a problem because people cannot find it.
            </h1>

            <p
              className="hero-sub"
              style={{
                fontSize: 'var(--step-0)',
                color: 'oklch(99% 0 0 / 0.76)',
                maxWidth: '38rem',
                lineHeight: 1.65,
                marginBlockEnd: 'var(--space-xl)',
              }}
            >
              EssenShare is a free global platform connecting surplus food with people
              who need it. Same neighbourhood, same day, no paperwork, no barriers.
            </p>

            <div
              className="hero-ctas"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-s)' }}
            >
              <Link
                href="/find"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  paddingInline: 'var(--space-xl)', paddingBlock: '0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent)', color: 'var(--accent-on)',
                  fontWeight: 600, fontSize: 'var(--step-0)',
                  minHeight: '44px', textDecoration: 'none',
                  transition: 'background var(--dur-fast) var(--ease-out)',
                }}
              >
                Find Food Near Me
              </Link>
              <Link
                href="/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  paddingInline: 'var(--space-xl)', paddingBlock: '0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'transparent', color: 'oklch(99% 0 0)',
                  fontWeight: 600, fontSize: 'var(--step-0)',
                  minHeight: '44px', textDecoration: 'none',
                  border: '1.5px solid oklch(99% 0 0 / 0.50)',
                  transition: 'border-color var(--dur-fast)',
                }}
              >
                List a Donation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. PULL QUOTE
      ══════════════════════════════════════════════════════════════════════ */}
      <blockquote
        ref={quoteRef}
        aria-label="Essenshare mission statement"
        style={{
          background: 'var(--surface)',
          borderBlockStart: '1px solid var(--line)',
          borderBlockEnd: '1px solid var(--line)',
          paddingBlock: 'clamp(3rem, 6vw, 5rem)',
          paddingInline: 'var(--space-page)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxInlineSize: '54rem',
            marginInline: 'auto',
          }}
        >
          {/* Opening quote mark */}
          <p
            aria-hidden="true"
            style={{
              fontSize: 'clamp(4rem, 8vw, 8rem)',
              lineHeight: 0.6,
              color: 'var(--accent)',
              fontWeight: 800,
              marginBlockEnd: 'var(--space-m)',
              fontFamily: 'var(--font-display)',
            }}
          >
            &ldquo;
          </p>
          <p
            style={{
              fontSize: 'var(--step-2)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              color: 'var(--ink)',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
              marginBlockEnd: 'var(--space-l)',
            }}
          >
            The food already exists. The people already exist. The need already exists.
            EssenShare exists to connect them.
          </p>
          <footer
            style={{
              fontSize: 'var(--step--1)',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 500,
            }}
          >
            Essenshare Platform Principles
          </footer>
        </div>
      </blockquote>

      {/* ══════════════════════════════════════════════════════════════════════
          3. WHY IT MATTERS deep narrative prose, no images
      ══════════════════════════════════════════════════════════════════════ */}
      <WhyItMatters />

      {/* ══════════════════════════════════════════════════════════════════════
          4. WHO WE SERVE role panels (full-bleed, same pattern as HowItWorks)
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={rolesSectionRef}
        aria-labelledby="roles-heading"
        style={{
          background: 'var(--bg)',
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
          {/* Header */}
          <div
            ref={rolesHeaderRef}
            style={{ marginBlockEnd: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
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
              Who we serve
            </p>
            <h2
              id="roles-heading"
              style={{
                fontSize: 'var(--step-3)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                color: 'var(--ink)',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
                maxInlineSize: '24ch',
              }}
            >
              Three ways to take part. All of them free. All of them matter.
            </h2>
          </div>

          {/* Role panels */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            {roles.map((role, i) => (
              <RolePanel
                key={role.id}
                role={role}
                panelRef={(el) => { panelRefs.current[i] = el; }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. PRINCIPLES editorial two-column grid
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={principlesSectionRef}
        aria-labelledby="principles-heading"
        style={{
          background: 'var(--surface-soft)',
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
          {/* Header */}
          <div
            ref={principlesHeaderRef}
            style={{ marginBlockEnd: 'clamp(3rem, 6vw, 5rem)' }}
          >
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
              How we operate
            </p>
            <h2
              id="principles-heading"
              style={{
                fontSize: 'var(--step-3)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                color: 'var(--ink)',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
                maxInlineSize: '28ch',
              }}
            >
              Six principles that govern every decision we make about your data.
            </h2>
          </div>

          {/* Principles grid */}
          <ol
            aria-label="Essenshare platform principles"
            style={{
              listStyle: 'none',
              display: 'grid',
              gap: 'clamp(2rem, 4vw, 3rem)',
            }}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {principles.map((p, i) => (
              <li
                key={p.number}
                ref={(el) => { principleRefs.current[i] = el; }}
                style={{
                  borderBlockStart: '1px solid var(--line)',
                  paddingBlockStart: 'var(--space-l)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-s)',
                }}
              >
                {/* Big accent number */}
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 'var(--step-4)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: 'var(--accent-muted)',
                    fontVariantNumeric: 'tabular-nums',
                    display: 'block',
                  }}
                >
                  {p.number}
                </span>
                <h3
                  style={{
                    fontSize: 'var(--step-1)',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    lineHeight: 1.2,
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontSize: 'var(--step-0)',
                    color: 'var(--ink-muted)',
                    lineHeight: 1.65,
                  }}
                >
                  {p.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. OPERATING MODEL + LIABILITY editorial, image beside text
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={modelSectionRef}
        aria-labelledby="model-heading"
        style={{
          background: 'var(--bg)',
          paddingBlock: 'var(--space-section)',
        }}
      >
        <div
          style={{
            maxInlineSize: 'var(--page-max)',
            marginInline: 'auto',
            paddingInline: 'var(--space-page)',
            display: 'grid',
            gap: 'clamp(3rem, 6vw, 5rem)',
            alignItems: 'start',
          }}
          className="grid-cols-1 lg:grid-cols-2"
        >
          {/* Image */}
          <div
            ref={modelImageRef}
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              aspectRatio: '3 / 4',
              background: 'var(--skeleton)',
            }}
          >
            <Image
              src="/mobile/heroorabout.jpg"
              alt="Community member with collected food real impact, confirmed"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 25%' }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={85}
            />
            {/* Subtle accent tag */}
            <div
              style={{
                position: 'absolute',
                insetBlockEnd: 'var(--space-l)',
                insetInlineStart: 'var(--space-l)',
                zIndex: 2,
                background: 'oklch(0% 0 0 / 0.52)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid oklch(99% 0 0 / 0.14)',
                borderRadius: 'var(--radius-pill)',
                paddingInline: 'var(--space-m)',
                paddingBlock: 'var(--space-xs)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--step--1)',
                  fontWeight: 600,
                  color: 'oklch(75% 0.130 150)',
                  letterSpacing: '0.06em',
                }}
              >
                100% nonprofit-operated
              </span>
            </div>
          </div>

          {/* Text */}
          <div
            ref={modelTextRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3xl)',
            }}
          >
            {/* Operating model */}
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
                Operating model
              </p>
              <h2
                id="model-heading"
                style={{
                  fontSize: 'var(--step-2)',
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.15,
                  color: 'var(--ink)',
                  marginBlockEnd: 'var(--space-l)',
                  textWrap: 'balance' as React.CSSProperties['textWrap'],
                }}
              >
                No fees. No ads. No data sales.
              </h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-m)',
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--step-0)',
                    color: 'var(--ink-muted)',
                    lineHeight: 1.65,
                    maxInlineSize: '52ch',
                  }}
                >
                  EssenShare operates as a nonprofit platform. There is no charge to donors or
                  recipients. The platform does not sell data, display advertising, or seek profit.
                  We exist to close a gap, not to monetise it.
                </p>
                <p
                  style={{
                    fontSize: 'var(--step-0)',
                    color: 'var(--ink-muted)',
                    lineHeight: 1.65,
                    maxInlineSize: '52ch',
                  }}
                >
                  All impact data is published publicly. We report only what is real: completed,
                  confirmed pickups. We never estimate. We never inflate. An honest zero is better
                  than an inflated number.
                </p>
              </div>
            </div>

            {/* Liability styled as a callout, not a card */}
            <div
              aria-labelledby="liability-heading"
              style={{
                borderBlockStart: '2px solid var(--accent-muted)',
                paddingBlockStart: 'var(--space-l)',
              }}
            >
              <h3
                id="liability-heading"
                style={{
                  fontSize: 'var(--step-0)',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                  marginBlockEnd: 'var(--space-m)',
                }}
              >
                Liability
              </h3>
              <p
                style={{
                  fontSize: 'var(--step--1)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.65,
                  maxInlineSize: '52ch',
                }}
              >
                The platform makes no warranty regarding the safety of any food listed by donors.
                Essenshare facilitates connections, requires donors to agree to a safety policy,
                and operates a reporting system to remove unsafe listings. The platform is not a
                food retailer or distributor.
              </p>
              <Link
                href="/safety"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBlockStart: 'var(--space-m)',
                  fontSize: 'var(--step--1)',
                  color: 'var(--accent)',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
                className="hover:underline"
              >
                Read the full safety policy <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. BOTTOM CTA single punchy row
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Get started with Essenshare"
        style={{
          background: 'var(--surface-dark)',
          paddingBlock: 'clamp(3rem, 6vw, 5rem)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxInlineSize: '38rem',
            marginInline: 'auto',
            paddingInline: 'var(--space-page)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-xl)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--step-3)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              color: 'oklch(97% 0.004 85)',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            Ready to make food move?
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-s)', justifyContent: 'center' }}>
            <Link
              href="/find"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                paddingInline: 'var(--space-xl)', paddingBlock: '0.75rem',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent)', color: 'var(--accent-on)',
                fontWeight: 700, fontSize: 'var(--step-0)',
                minHeight: '44px', textDecoration: 'none',
                transition: 'background var(--dur-fast) var(--ease-out)',
              }}
            >
              Find Food Near Me
            </Link>
            <Link
              href="/register"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                paddingInline: 'var(--space-xl)', paddingBlock: '0.75rem',
                borderRadius: 'var(--radius-pill)',
                background: 'transparent', color: 'oklch(99% 0 0 / 0.80)',
                fontWeight: 700, fontSize: 'var(--step-0)',
                minHeight: '44px', textDecoration: 'none',
                border: '2px solid oklch(99% 0 0 / 0.30)',
                transition: 'border-color var(--dur-fast)',
              }}
            >
              Start Donating
            </Link>
          </div>
          <p
            style={{
              fontSize: 'var(--step--1)',
              color: 'oklch(75% 0.006 85)',
            }}
          >
            Free, nonprofit-operated, and always will be.
          </p>
        </div>
      </section>
    </>
  );
}

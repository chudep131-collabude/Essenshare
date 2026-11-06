'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'A donor lists what they have.',
    body: 'A bakery has 40 loaves at 6pm. A supermarket has a pallet of tinned goods expiring this week. A Samaritan made too much. They post it: what it is, how much, where, and until when. That information, which would otherwise vanish, becomes visible to everyone nearby.',
    detail: 'Under two minutes. No approval queue for individuals.',
    image: {
      src: '/web/grocerys.jpg',
      alt: 'Surplus grocery items packaged goods ready for redistribution',
      position: 'center 55%',
    },
    // Text card docks: 'start' = bottom-left, 'end' = bottom-right
    textAlign: 'start' as const,
  },
  {
    number: '02',
    title: 'Anyone nearby finds it.',
    body: 'No account. No means test. No form to fill in. Open the platform, allow location, and see what is available within walking distance right now. A restaurant 2 km away. A grocer around the corner. A neighbour with surplus from the market. The information was always there. Now it is findable.',
    detail: 'Anonymous. Private. Always free.',
    image: {
      src: '/web/more1.jpg',
      alt: 'Community members collecting surplus food',
      position: 'center 40%',
    },
    textAlign: 'end' as const,
  },
  {
    number: '03',
    title: 'A code confirms the handover.',
    body: 'The recipient gets a temporary single-use code. The donor scans it, confirms what was given, and the impact board adds one more real number. Not an estimate. A confirmed fact. The food moved. Someone ate. The surplus did not become waste.',
    detail: 'Every completed pickup is counted. Every gram is recorded.',
    image: {
      src: '/web/more.jpg',
      alt: 'Community handover food changing hands between neighbours',
      position: 'center center',
    },
    textAlign: 'start' as const,
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      // Header entrance
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: 36,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 88%',
            once: true,
          },
        });
      }

      panelRefs.current.forEach((panel) => {
        if (!panel) return;

        const img = panel.querySelector('.step-bg-image');
        const card = panel.querySelector('.step-card');
        const pill = panel.querySelector('.step-pill');

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: 'top 80%',
            once: true,
          },
        });

        // Image: subtle scale-down from slightly bigger (Ken Burns entrance)
        tl.from(img, {
          scale: 1.06,
          opacity: 0,
          duration: 1.1,
          ease: 'power3.out',
        }, 0);

        // Number pill: pop in
        tl.from(pill, {
          scale: 0.6,
          opacity: 0,
          duration: 0.4,
          ease: 'back.out(2.2)',
        }, 0.2);

        // Text card: slide up from below the panel
        tl.from(card, {
          y: 40,
          opacity: 0,
          duration: 0.65,
          ease: 'power3.out',
        }, 0.35);
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="how-it-works-heading"
      style={{
        background: 'var(--bg)',
        paddingBlock: 'var(--space-section)',
      }}
    >
      {/* ── Section header inside page container ── */}
      <div
        style={{
          maxInlineSize: 'var(--page-max)',
          marginInline: 'auto',
          paddingInline: 'var(--space-page)',
          marginBlockEnd: 'clamp(2.5rem, 5vw, 4rem)',
        }}
      >
        <div ref={headerRef}>
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
            How it works
          </p>
          <h2
            id="how-it-works-heading"
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
            Three steps. No bureaucracy. No barriers. No hunger by default.
          </h2>
        </div>
      </div>

      {/* ── Steps full-width panels, no side-by-side split ── */}
      <ol
        aria-label="How Essenshare works three steps"
        style={{
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(1.5rem, 3vw, 2.5rem)',
          paddingInline: 'var(--space-page)',
          maxInlineSize: 'var(--page-max)',
          marginInline: 'auto',
        }}
      >
        {steps.map((step, index) => (
          <li
            key={step.number}
            ref={(el) => { panelRefs.current[index] = el; }}
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              // Full-width tall panel image dominates
              height: 'clamp(500px, 66vh, 720px)',
              background: 'var(--skeleton)',
            }}
          >
            {/* ── Full-bleed background image ── */}
            <div
              className="step-bg-image"
              style={{
                position: 'absolute',
                inset: 0,
                willChange: 'transform, opacity',
              }}
            >
              <Image
                src={step.image.src}
                alt={step.image.alt}
                fill
                priority={index === 0}
                style={{
                  objectFit: 'cover',
                  objectPosition: step.image.position,
                }}
                sizes="(max-width: 768px) 100vw, calc(100vw - clamp(2rem, 8vw, 5rem))"
                quality={88}
              />
            </div>

            {/* ── Gradient scrim anchored to the text card side ── */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                background:
                  step.textAlign === 'start'
                    ? // Darkens bottom-left corner, fades toward top-right
                      'linear-gradient(135deg, oklch(5% 0.01 150 / 0.82) 0%, oklch(5% 0.008 80 / 0.50) 40%, transparent 70%)'
                    : // Darkens bottom-right corner
                      'linear-gradient(225deg, oklch(5% 0.01 150 / 0.82) 0%, oklch(5% 0.008 80 / 0.50) 40%, transparent 70%)',
                // Always darken the very bottom for legibility
              }}
            />
            {/* Bottom gradient for number pill + card legibility */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                background:
                  'linear-gradient(to top, oklch(5% 0.010 80 / 0.70) 0%, oklch(5% 0.010 80 / 0.25) 35%, transparent 65%)',
              }}
            />

            {/* ── Step number pill top-left always ── */}
            <div
              className="step-pill"
              aria-hidden="true"
              style={{
                position: 'absolute',
                insetBlockStart: 'var(--space-l)',
                insetInlineStart: 'var(--space-l)',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
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
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {step.number}
              </span>
            </div>

            {/* ── Text card docks bottom on mobile, side-anchored on desktop ── */}
            <div
              className={`step-card w-[calc(100%-2rem)] md:w-auto left-4 right-4 md:left-auto md:right-auto ${
                step.textAlign === 'start' ? 'md:!left-[var(--space-2xl)]' : 'md:!right-[var(--space-2xl)]'
              }`}
              style={{
                position: 'absolute',
                zIndex: 3,
                insetBlockEnd: 'clamp(1rem, 3vw, var(--space-2xl))',
                maxInlineSize: 'clamp(18rem, 42%, 26rem)',
                // Frosted glass card
                background: 'oklch(8% 0.010 150 / 0.76)',
                backdropFilter: 'blur(16px) saturate(120%)',
                WebkitBackdropFilter: 'blur(16px) saturate(120%)',
                border: '1px solid oklch(99% 0 0 / 0.12)',
                borderRadius: 'var(--radius-md)',
                padding: 'clamp(1rem, 3vw, var(--space-xl))',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-s)',
              }}
            >
              {/* Step label */}
              <p
                style={{
                  fontSize: 'var(--step--1)',
                  color: 'oklch(80% 0.090 150)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  fontWeight: 600,
                }}
              >
                Step {step.number}
              </p>

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
                {step.title}
              </h3>

              <p
                style={{
                  fontSize: 'var(--step--1)',
                  color: 'oklch(82% 0.006 85)',
                  lineHeight: 1.6,
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                {step.body}
              </p>

              {/* Detail callout */}
              <p
                style={{
                  marginBlockStart: 'var(--space-2xs)',
                  fontSize: 'var(--step--1)',
                  color: 'oklch(75% 0.110 150)',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  borderInlineStart: '2px solid oklch(55% 0.130 150)',
                  paddingInlineStart: 'var(--space-s)',
                }}
              >
                {step.detail}
              </p>
            </div>

            {/* Inner border ring for depth */}
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
          </li>
        ))}
      </ol>
    </section>
  );
}

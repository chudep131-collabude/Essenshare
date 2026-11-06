'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function DonorCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 78%',
          once: true,
        },
      });

      tl.from(labelRef.current, {
        opacity: 0,
        y: 14,
        duration: 0.45,
        ease: 'power2.out',
      }, 0);

      tl.from(headingRef.current, {
        clipPath: 'inset(0 0 100% 0)',
        y: 16,
        opacity: 0,
        duration: 0.75,
        ease: 'power4.out',
        clearProps: 'clipPath,y,opacity',
      }, 0.12);

      tl.from(bodyRef.current, {
        opacity: 0,
        y: 14,
        duration: 0.55,
        ease: 'power2.out',
      }, 0.3);

      tl.from(ctasRef.current, {
        opacity: 0,
        y: 12,
        duration: 0.45,
        ease: 'power2.out',
      }, 0.48);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="donor-cta-heading"
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingBlock: 'var(--space-section)',
        // Fallback bg while image loads
        background: 'var(--surface-dark)',
      }}
    >
      {/* Background image */}
      <Image
        src="/web/about.jpg"
        alt=""
        aria-hidden="true"
        fill
        style={{
          objectFit: 'cover',
          objectPosition: 'center 40%',
          zIndex: 0,
        }}
        quality={85}
        sizes="100vw"
      />

      {/* Gradient scrim dark enough for 4.5:1 contrast over the lightest frame */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(105deg, oklch(10% 0.012 150 / 0.90) 0%, oklch(10% 0.010 80 / 0.78) 55%, oklch(10% 0.008 80 / 0.55) 100%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxInlineSize: 'var(--page-max)',
          marginInline: 'auto',
          paddingInline: 'var(--space-page)',
        }}
      >
        {/* Section label */}
        <p
          ref={labelRef}
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            fontWeight: 600,
            marginBlockEnd: 'var(--space-s)',
          }}
        >
          Join the movement
        </p>

        {/* Heading + body stacked on mobile, side-by-side on md+ */}
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
              ref={headingRef}
              style={{
                fontSize: 'var(--step-3)',
                fontWeight: 800,
                letterSpacing: '-0.028em',
                lineHeight: 1.12,
                color: 'oklch(99% 0.004 85)',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
                maxInlineSize: '22ch',
                willChange: 'clip-path, transform, opacity',
              }}
            >
              You have surplus. Someone nearby is going without. This is the moment to connect them.
            </h2>

            <p
              ref={bodyRef}
              style={{
                fontSize: 'var(--step-0)',
                color: 'oklch(90% 0.006 85 / 0.85)',
                lineHeight: 1.65,
                maxInlineSize: '50ch',
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              Register in under five minutes. Post what you have. A recipient
              nearby gets a code and comes to collect. You confirm the handover.
              That is the whole system. No complexity. No bureaucracy. Just food
              moving from where it exists to where it is needed.
            </p>
          </div>

          {/* Right: CTAs */}
          <div
            ref={ctasRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-s)',
              flexShrink: 0,
            }}
            className="sm:flex-row"
          >
            {/* Primary accent */}
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

            {/* Ghost white outline */}
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
                color: 'oklch(99% 0 0 / 0.85)',
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

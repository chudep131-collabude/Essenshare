'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';

interface Slide {
  src: string;
  alt: string;
  eyebrow: string;
  subtitle: string;
}

const slides: Slide[] = [
  {
    src: '/web/grocerys.jpg',
    alt: 'Boxes of packaged grocery surplus items ready for collection',
    eyebrow: 'Surplus Groceries',
    subtitle: 'Surplus groceries and everyday essentials — given, not wasted.',
  },
  {
    src: '/web/hero.jpg',
    alt: 'Freshly baked bread and pastries at end of day',
    eyebrow: 'Bakeries & Cafes',
    subtitle: 'Bakeries and cafes sharing what remains at the end of the day.',
  },
  {
    src: '/web/hero.png',
    alt: 'Crates of farm-fresh produce surplus ready for redistribution',
    eyebrow: 'Farm Produce',
    subtitle: 'Fresh farm produce reaching the people who need it most.',
  },
  {
    src: '/web/more.jpg',
    alt: 'Community members exchanging a grocery bag at a local handover point',
    eyebrow: 'Community',
    subtitle: 'Every pickup is a story. Every handover creates real impact.',
  },
];

const HEADLINE = 'No good food should become waste while someone nearby is hungry.';
const AUTO_ADVANCE_MS = 5000;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const touchStartX = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRevealedRef = useRef(false);

  // SSR-safe reduced-motion detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // GSAP headline reveal — fires once on first mount
  // Uses clipPath + translateY instead of Club-only SplitText
  useEffect(() => {
    if (reducedMotion || hasRevealedRef.current || !headlineRef.current) return;
    hasRevealedRef.current = true;

    const ctx = gsap.context(() => {
      gsap.from(headlineRef.current!, {
        clipPath: 'inset(0 0 100% 0)',
        y: 32,
        duration: 1.1,
        ease: 'power4.out',
        delay: 0.3,
        clearProps: 'clipPath,y',
      });
    }, headlineRef);

    return () => ctx.revert();
    // intentionally only on mount — reducedMotion guard handles the skip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrent(((index % slides.length) + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance — skip if reducedMotion
  useEffect(() => {
    if (reducedMotion || paused) return;
    intervalRef.current = setInterval(next, AUTO_ADVANCE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, paused, reducedMotion]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  }

  return (
    <section
      aria-label="Essenshare hero carousel"
      className="relative overflow-hidden"
      style={{ height: 'clamp(520px, 88vh, 900px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Slides ── */}
      {slides.map((slide, idx) => (
        <div
          key={slide.src}
          aria-hidden={idx !== current}
          className="absolute inset-0"
          style={{
            opacity: idx === current ? 1 : 0,
            transition: 'opacity 700ms var(--ease-inout)',
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={idx === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}

      {/* ── Dark gradient overlay ── */}
      <div
        className="absolute inset-0 z-10"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to bottom, oklch(0% 0 0 / 0.08) 0%, oklch(0% 0 0 / 0.45) 40%, oklch(0% 0 0 / 0.72) 100%)',
        }}
      />

      {/* ── Content — bottom-third, left-aligned ── */}
      <div
        className="relative z-20 flex flex-col justify-end h-full"
        style={{ paddingInline: 'var(--space-page)', paddingBlockEnd: 'clamp(3rem, 6vw, 5rem)' }}
      >
        <div style={{ maxWidth: '48rem' }}>
          {/* Eyebrow */}
          <p
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 'var(--step--1)',
              color: 'oklch(99% 0 0 / 0.70)',
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              fontWeight: 500,
              marginBlockEnd: 'var(--space-s)',
            }}
          >
            {slides[current].eyebrow}
          </p>

          {/* Headline — constant, GSAP reveal target */}
          <h1
            ref={headlineRef}
            style={{
              fontSize: 'var(--display)',
              fontWeight: 800,
              color: 'oklch(99% 0 0)',
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
              marginBlockEnd: 'var(--space-l)',
            }}
          >
            {HEADLINE}
          </h1>

          {/* Subtitle */}
          <p
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 'var(--step-1)',
              color: 'oklch(99% 0 0 / 0.80)',
              maxWidth: '36rem',
              lineHeight: 1.55,
              marginBlockEnd: 'var(--space-xl)',
              transition: 'opacity 500ms var(--ease-out)',
            }}
          >
            {slides[current].subtitle}
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-s)',
            }}
          >
            <Link
              href="/find"
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
              }}
            >
              Find Food Near Me
            </Link>
            <Link
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 'var(--space-xl)',
                paddingBlock: '0.75rem',
                borderRadius: 'var(--radius-pill)',
                background: 'transparent',
                color: 'oklch(99% 0 0)',
                fontWeight: 700,
                fontSize: 'var(--step-0)',
                minHeight: '44px',
                textDecoration: 'none',
                border: '2px solid oklch(99% 0 0 / 0.70)',
                transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast)',
              }}
            >
              Become a Donor
            </Link>
          </div>
        </div>
      </div>

      {/* ── Previous arrow — hidden on mobile ── */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous slide"
        className="hidden sm:flex"
        style={{
          position: 'absolute',
          insetBlockStart: '50%',
          insetInlineStart: 'var(--space-l)',
          transform: 'translateY(-50%)',
          zIndex: 30,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1.5px solid oklch(99% 0 0 / 0.40)',
          background: 'oklch(0% 0 0 / 0.25)',
          color: 'oklch(99% 0 0)',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background var(--dur-fast)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── Next arrow — hidden on mobile ── */}
      <button
        type="button"
        onClick={next}
        aria-label="Next slide"
        className="hidden sm:flex"
        style={{
          position: 'absolute',
          insetBlockStart: '50%',
          insetInlineEnd: 'var(--space-l)',
          transform: 'translateY(-50%)',
          zIndex: 30,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1.5px solid oklch(99% 0 0 / 0.40)',
          background: 'oklch(0% 0 0 / 0.25)',
          color: 'oklch(99% 0 0)',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background var(--dur-fast)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── Dot indicators — bottom-end ── */}
      <div
        role="tablist"
        aria-label="Carousel slide indicators"
        style={{
          position: 'absolute',
          insetBlockEnd: 'var(--space-l)',
          insetInlineEnd: 'var(--space-l)',
          zIndex: 30,
          display: 'flex',
          gap: 'var(--space-xs)',
          alignItems: 'center',
        }}
      >
        {slides.map((slide, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={idx === current}
            aria-label={`Slide ${idx + 1}: ${slide.eyebrow}`}
            onClick={() => goTo(idx)}
            style={{
              width: idx === current ? '24px' : '8px',
              height: '8px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background:
                idx === current ? 'oklch(99% 0 0)' : 'oklch(99% 0 0 / 0.45)',
              cursor: 'pointer',
              padding: 0,
              transition: 'width 300ms var(--ease-out), background 200ms',
              minWidth: '8px',
              // Ensure 44px touch target via padding
              paddingBlock: '18px',
              marginBlock: '-18px',
            }}
          />
        ))}
      </div>
    </section>
  );
}

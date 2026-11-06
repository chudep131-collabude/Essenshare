'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';

interface Slide {
  src: string;
  alt: string;
  eyebrow: string;
  headline: string;
  subtitle: string;
  position: string;
}

const slides: Slide[] = [
  {
    src: '/web/joel-muniz-3k3l2brxmwQ-unsplash.jpg',
    alt: 'Volunteers sorting donated food along a long table at a food bank',
    eyebrow: 'The food already exists',
    headline: 'The problem was never scarcity. It was connection.',
    subtitle:
      'Every day, enough food is thrown away in a single city to feed everyone in it who is hungry. EssenShare exists to close that gap for free.',
    position: 'center 35%',
  },
  {
    src: '/web/compagnons-BVMDDiePqXU-unsplash.jpg',
    alt: 'Bags of fresh vegetables carrots, kale and squash ready for collection',
    eyebrow: 'Farm & garden surplus',
    headline: 'The harvest is in. Not all of it reached the market. It can still reach someone.',
    subtitle:
      'Farms, allotments, and producers list what markets cannot take. Families collect directly. The gap closes.',
    position: 'center 40%',
  },
  {
    src: '/web/about.jpg',
    alt: 'Volunteers packing meal bags at a community food distribution table',
    eyebrow: 'Same day. Same neighbourhood.',
    headline: 'At closing time, the bread is still fresh. Someone nearby needs it.',
    subtitle:
      'End-of-day surplus from bakeries, restaurants, and cafés reaches people within the hour not the bin.',
    position: 'center 30%',
  },
  {
    src: '/web/pasquale-farro-XOb2dnK8EeM-unsplash.jpg',
    alt: 'Vendor handing produce to a customer at a farmer\'s market stall',
    eyebrow: 'Every handover is proof',
    headline: 'A code. A confirmed handover. One more real number on the board.',
    subtitle:
      'Every completed collection is recorded permanently. No estimates. No inflation. Just the truth of what moved from surplus to someone who needed it.',
    position: 'center 45%',
  },
];

const AUTO_ADVANCE_MS = 6000;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Refs for GSAP text animations
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);

  // Progress bar animation
  const progressRef = useRef<HTMLSpanElement[]>([]);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // SSR-safe reduced-motion detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Text reveal animation runs on every slide change
  const animateContent = useCallback(() => {
    if (reducedMotion) return;
    const targets = [eyebrowRef.current, headlineRef.current, subtitleRef.current, ctaRef.current, taglineRef.current].filter(Boolean);
    if (!targets.length) return;

    const tl = gsap.timeline();

    // Eyebrow fast fade up
    tl.fromTo(
      eyebrowRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      0
    );

    // Headline clip-path reveal from bottom (signature moment)
    tl.fromTo(
      headlineRef.current,
      { clipPath: 'inset(0 0 100% 0)', y: 20, opacity: 0 },
      {
        clipPath: 'inset(0 0 0% 0)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power4.out',
        clearProps: 'clipPath,y,opacity',
      },
      0.1
    );

    // Subtitle fade up, slight delay
    tl.fromTo(
      subtitleRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      0.35
    );

    // CTAs fade up together
    tl.fromTo(
      ctaRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      0.5
    );

    // Tagline last, very subtle
    tl.fromTo(
      taglineRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'none' },
      0.65
    );
  }, [reducedMotion]);

  // Progress bar fills over AUTO_ADVANCE_MS for the active slide
  const startProgressBar = useCallback(
    (index: number) => {
      if (reducedMotion) return;
      const bar = progressRef.current[index];
      if (!bar) return;

      // Kill any running tween
      if (progressTweenRef.current) progressTweenRef.current.kill();

      // Reset all bars
      progressRef.current.forEach((b, i) => {
        if (b) gsap.set(b, { scaleX: i === index ? 0 : 0 });
      });

      progressTweenRef.current = gsap.fromTo(
        bar,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: AUTO_ADVANCE_MS / 1000,
          ease: 'none',
          transformOrigin: 'left center',
          paused: false,
        }
      );
    },
    [reducedMotion]
  );

  // Pause/resume the progress bar
  useEffect(() => {
    if (!progressTweenRef.current) return;
    if (paused) {
      progressTweenRef.current.pause();
    } else {
      progressTweenRef.current.resume();
    }
  }, [paused]);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      const next = ((index % slides.length) + slides.length) % slides.length;
      setCurrent(next);
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 500);
    },
    []
  );

  const advance = useCallback(() => {
    setCurrent(c => {
      const next = (c + 1) % slides.length;
      return next;
    });
  }, []);

  // Auto-advance
  useEffect(() => {
    if (reducedMotion || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(advance, AUTO_ADVANCE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [advance, paused, reducedMotion]);

  // Run content animation + progress bar whenever slide changes
  useEffect(() => {
    animateContent();
    startProgressBar(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Initial mount animation
  useEffect(() => {
    animateContent();
    startProgressBar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(delta < 0 ? current + 1 : current - 1);
    }
    touchStartX.current = null;
  };

  return (
    <section
      aria-label="Essenshare hero"
      className="relative overflow-hidden"
      style={{ height: 'clamp(600px, 92vh, 960px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Slides smooth crossfade ── */}
      {slides.map((slide, idx) => (
        <div
          key={slide.src}
          aria-hidden={idx !== current}
          className="absolute inset-0"
          style={{
            opacity: idx === current ? 1 : 0,
            transition: reducedMotion
              ? 'none'
              : 'opacity 1000ms cubic-bezier(0.65, 0.05, 0.36, 1)',
            zIndex: idx === current ? 2 : 1,
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={idx === 0}
            style={{
              objectFit: 'cover',
              objectPosition: slide.position,
              transform: idx === current ? 'scale(1.0)' : 'scale(1.04)',
              transition: reducedMotion
                ? 'none'
                : 'transform 9000ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            sizes="100vw"
            quality={90}
          />
        </div>
      ))}

      {/* ── Gradient overlay stronger at bottom for legibility ── */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          zIndex: 3,
          background:
            'linear-gradient(to bottom, oklch(0% 0 0 / 0.08) 0%, oklch(0% 0 0 / 0.20) 30%, oklch(0% 0 0 / 0.65) 70%, oklch(0% 0 0 / 0.82) 100%)',
        }}
      />

      {/* ── Content ── */}
      <div
        className="absolute inset-0 flex flex-col justify-end"
        style={{
          zIndex: 4,
          paddingInline: 'var(--space-page)',
          paddingBlockEnd: 'clamp(3rem, 6vw, 5rem)',
        }}
      >
        <div style={{ maxWidth: '46rem' }}>
          {/* Eyebrow */}
          <p
            ref={eyebrowRef}
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 'var(--step--1)',
              color: 'oklch(99% 0 0 / 0.60)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 500,
              marginBlockEnd: 'var(--space-s)',
            }}
          >
            {slides[current].eyebrow}
          </p>

          {/* Headline */}
          <h1
            ref={headlineRef}
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
            {slides[current].headline}
          </h1>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 'var(--step-0)',
              color: 'oklch(99% 0 0 / 0.78)',
              maxWidth: '36rem',
              lineHeight: 1.65,
              marginBlockEnd: 'var(--space-xl)',
            }}
          >
            {slides[current].subtitle}
          </p>

          {/* CTAs */}
          <div
            ref={ctaRef}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-s)' }}
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
                fontWeight: 600,
                fontSize: 'var(--step-0)',
                minHeight: '44px',
                textDecoration: 'none',
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
                fontWeight: 600,
                fontSize: 'var(--step-0)',
                minHeight: '44px',
                textDecoration: 'none',
                border: '1.5px solid oklch(99% 0 0 / 0.50)',
                transition: 'border-color var(--dur-fast), background var(--dur-fast)',
              }}
            >
              List a Donation
            </Link>
          </div>

          <p
            ref={taglineRef}
            style={{
              marginBlockStart: 'var(--space-m)',
              fontSize: 'var(--step--1)',
              color: 'oklch(99% 0 0 / 0.45)',
            }}
          >
            No account needed to find or collect food.
          </p>
        </div>
      </div>

      {/* ── Progress bar indicators (replaces arrows + dots) ── */}
      <div
        role="tablist"
        aria-label="Carousel slides"
        style={{
          position: 'absolute',
          insetBlockEnd: 'var(--space-l)',
          insetInlineEnd: 'var(--space-page)',
          zIndex: 5,
          display: 'flex',
          gap: '6px',
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
            onClick={() => {
              goTo(idx);
              setPaused(false);
              // Reset interval
              if (intervalRef.current) clearInterval(intervalRef.current);
              if (!reducedMotion) {
                intervalRef.current = setInterval(advance, AUTO_ADVANCE_MS);
              }
            }}
            style={{
              position: 'relative',
              width: idx === current ? '64px' : '28px',
              height: '3px',
              borderRadius: '2px',
              border: 'none',
              background: 'oklch(99% 0 0 / 0.28)',
              cursor: 'pointer',
              padding: 0,
              // Extend tap target without changing visual
              paddingBlock: '14px',
              marginBlock: '-14px',
              overflow: 'hidden',
              transition: 'width 300ms var(--ease-out)',
            }}
          >
            {/* Progress fill */}
            <span
              ref={(el) => {
                if (el) progressRef.current[idx] = el;
              }}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'oklch(99% 0 0)',
                borderRadius: '2px',
                transformOrigin: 'left center',
                transform: 'scaleX(0)',
                // Instant full fill for already-passed slides
                ...(idx < current ? { transform: 'scaleX(1)' } : {}),
              }}
            />
          </button>
        ))}
      </div>

      {/* ── Slide counter ── */}
      <p
        aria-live="polite"
        style={{
          position: 'absolute',
          insetBlockEnd: 'var(--space-l)',
          insetInlineStart: 'var(--space-page)',
          zIndex: 5,
          fontSize: 'var(--step--1)',
          color: 'oklch(99% 0 0 / 0.45)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.06em',
        }}
      >
        {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
      </p>
    </section>
  );
}

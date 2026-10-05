'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Slide {
  src: string;
  alt: string;
  subtitle: string;
}

const slides: Slide[] = [
  {
    src: '/web/grocerys.jpg',
    alt: 'Boxes of packaged grocery surplus items ready for collection',
    subtitle: 'Surplus groceries and everyday essentials — given, not wasted.',
  },
  {
    src: '/web/hero.jpg',
    alt: 'Freshly baked bread and pastries at end of day ready for collection',
    subtitle: 'Bakeries and cafes sharing what remains at the end of the day.',
  },
  {
    src: '/web/hero.png',
    alt: 'Crates of farm-fresh produce surplus ready for redistribution',
    subtitle: 'Fresh farm produce reaching the people who need it most.',
  },
  {
    src: '/web/more.jpg',
    alt: 'Community members exchanging a grocery bag at a local handover point',
    subtitle: 'Every pickup is a story. Every handover creates real impact.',
  },
];

const HEADLINE = 'No good food should become waste while someone nearby is hungry.';
const AUTO_ADVANCE_MS = 5000;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrent(((index % slides.length) + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    if (reducedMotion || paused) return;
    intervalRef.current = setInterval(next, AUTO_ADVANCE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, paused, reducedMotion]);

  // Touch swipe
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
      aria-label="Essenshare hero"
      className="relative overflow-hidden"
      style={{ height: 'clamp(520px, 88vh, 900px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides — all use next/image for WebP/AVIF optimization and responsive srcset */}
      {slides.map((slide, idx) => (
        <div
          key={slide.src}
          role="img"
          aria-label={slide.alt}
          aria-hidden={idx !== current}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: idx === current ? 1 : 0 }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={idx === 0}
            className="object-cover object-center"
            sizes="100vw"
            aria-hidden="true"
          />
        </div>
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55 z-10" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full px-4 text-center text-white">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight max-w-4xl mb-4 drop-shadow-lg">
          {HEADLINE}
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-neutral-200 max-w-2xl mb-8 drop-shadow transition-opacity duration-500">
          {slides[current].subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/find"
            className="px-6 py-3 rounded-lg bg-primary text-white font-semibold text-base hover:bg-primary-dark transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
          >
            Find Food Near Me
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-transparent text-white font-semibold text-base border-2 border-white hover:bg-white/10 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
          >
            Become a Donor
          </Link>
        </div>
      </div>

      {/* Prev/Next arrows — hidden on mobile (logical CSS: inset-inline-start / inset-inline-end) */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous slide"
        className="hidden sm:flex absolute inset-y-0 start-0 z-30 items-center px-4 text-white/70 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next slide"
        className="hidden sm:flex absolute inset-y-0 end-0 z-30 items-center px-4 text-white/70 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div
        role="tablist"
        aria-label="Carousel slides"
        className="absolute bottom-6 inset-x-0 z-30 flex justify-center gap-2"
      >
        {slides.map((slide, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={idx === current}
            aria-label={`Slide ${idx + 1}: ${slide.subtitle}`}
            onClick={() => goTo(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white ${
              idx === current
                ? 'bg-white scale-125'
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </section>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const trustPoints = [
  {
    label: 'No account. No barriers.',
    title: 'Anyone can find food right now.',
    body: 'Open the platform, allow location, see what is available nearby. No registration, no queue number, no proof of need. Your privacy stays yours. Someone should never go hungry because they were too embarrassed to ask.',
  },
  {
    label: 'Safety, not just goodwill.',
    title: 'Every donor signs a safety agreement.',
    body: 'Before a single listing goes live, donors commit in writing. Allergens, use-by dates, and storage conditions are mandatory not optional. Goodwill without accountability is not enough when people are eating the result.',
  },
  {
    label: 'Real numbers only.',
    title: 'Every figure on the impact board is confirmed.',
    body: 'Every kilogram, every meal, every handover is a real completed transaction. We do not estimate. We do not project. We do not inflate. When we say 10,000 pickups, 10,000 people collected food.',
  },
  {
    label: 'Built for the world.',
    title: 'Any country, any language, any device.',
    body: 'EssenShare works on a basic smartphone over a slow connection. It supports RTL languages and adapts to local address formats. The problem of food waste and hunger is global. The platform has to be too.',
  },
];

export default function TrustSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const pointRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      // Left editorial copy slide up
      if (leftRef.current) {
        gsap.from(leftRef.current, {
          y: 40,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: leftRef.current,
            start: 'top 82%',
            once: true,
          },
        });
      }

      // Image scale up from slightly smaller + fade
      if (imageRef.current) {
        gsap.from(imageRef.current, {
          scale: 0.94,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: imageRef.current,
            start: 'top 85%',
            once: true,
          },
        });
      }

      // Trust points stagger in from left border
      pointRefs.current.forEach((point, i) => {
        if (!point) return;
        gsap.from(point, {
          x: -24,
          opacity: 0,
          duration: 0.55,
          ease: 'power3.out',
          delay: i * 0.08,
          scrollTrigger: {
            trigger: point,
            start: 'top 86%',
            once: true,
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="trust-heading"
      style={{ backgroundColor: 'var(--bg)', paddingBlock: 'var(--space-section)' }}
    >
      <div className="page-container">
        {/* ── Top row: editorial statement + image ── */}
        <div
          style={{
            display: 'grid',
            gap: 'clamp(2.5rem, 5vw, 4rem)',
            marginBlockEnd: 'clamp(3.5rem, 6vw, 5.5rem)',
            alignItems: 'end',
          }}
          className="grid-cols-1 lg:grid-cols-2"
        >
          {/* LEFT editorial statement */}
          <div ref={leftRef}>
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
                letterSpacing: '-0.025em',
                lineHeight: 1.12,
                maxWidth: '24rem',
                marginBlockEnd: 'var(--space-l)',
              }}
            >
              The food is there. The people are there. They just cannot find each other.
            </h2>

            <p
              style={{
                fontSize: 'var(--step-0)',
                color: 'var(--ink-muted)',
                maxWidth: '26rem',
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
                lineHeight: 1.65,
                marginBlockEnd: 'var(--space-xl)',
              }}
            >
              Every day, enough food is wasted in a single city to feed everyone in it who is
              hungry. The gap is not a shortage. It is a missing connection. EssenShare is
              that connection. Direct, free, and already happening near you.
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

          {/* RIGHT image */}
          <div
            ref={imageRef}
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              background: 'var(--skeleton)',
            }}
          >
            <Image
              src="/mobile/heroorabout.jpg"
              alt="Community member collecting surplus food a real Essenshare handover"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={85}
            />
            {/* Subtle vignette */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                boxShadow: 'inset 0 0 0 1px oklch(0% 0 0 / 0.07)',
                borderRadius: 'var(--radius-lg)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* ── Trust points full-width 2-col grid below ── */}
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            display: 'grid',
            gap: 'var(--space-2xl)',
          }}
          className="grid-cols-1 sm:grid-cols-2"
          aria-label="Trust and safety points"
        >
          {trustPoints.map((point, i) => (
            <li
              key={point.label}
              ref={(el) => { pointRefs.current[i] = el; }}
              style={{
                borderInlineStart: '2px solid var(--line)',
                paddingInlineStart: 'var(--space-l)',
                transition: 'border-color var(--dur-fast) var(--ease-out)',
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
    </section>
  );
}

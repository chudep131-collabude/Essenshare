'use client';

/**
 * HeroScroll
 * Scroll-scrubbed full-viewport image sequence.
 * One GSAP timeline scrubbed against the wrapper's scroll progress.
 * Mobile: stacked full-height panels.
 * prefers-reduced-motion: first slide static.
 */

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from '@/lib/i18n';

gsap.registerPlugin(ScrollTrigger);

interface Slide {
  src: string;
  alt: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  position: string;
  isFinal?: boolean;
}

const slides: Slide[] = [
  {
    src: '/web/close-up-volunteers-working-together.jpg',
    alt: 'Volunteers working together sorting food donations',
    eyebrow: 'The hands that give',
    headline: "She came in after her shift.\nDidn\u2019t say much.\nJust started sorting.",
    subtext: "Most of the people who make this work don\u2019t call themselves heroes. They just show up.",
    position: 'center 40%',
  },
  {
    src: '/web/close-up-volunteers-collecting-food-donations.jpg',
    alt: 'Volunteers collecting and packing food donations',
    eyebrow: "The food that almost wasn\u2019t",
    headline: 'This was going to be\nthrown away at 9pm\nlast night.',
    subtext: 'Not because it was bad. Because the shift ended and nobody came. Until someone posted it here.',
    position: 'center 35%',
  },
  {
    src: '/web/pexels-julia-m-cameron-6994943.jpg',
    alt: 'Community food distribution — people gathered around a table',
    eyebrow: 'The table that changes things',
    headline: 'There is something about\nbeing handed food\nby a stranger who smiles.',
    subtext: "It doesn\u2019t feel like charity. It feels like a neighbour. That\u2019s the difference.",
    position: 'center 45%',
  },
  {
    src: '/web/pexels-julia-m-cameron-6994944.jpg',
    alt: 'Food being handed from one person to another',
    eyebrow: 'The moment it crosses',
    headline: "He didn\u2019t know her name.\nShe didn\u2019t know his story.\nThat was fine.",
    subtext: 'The food moved from someone who had too much to someone who needed it. That is the entire point.',
    position: 'center 40%',
  },
  {
    src: '/web/pexels-julia-m-cameron-6994945.jpg',
    alt: 'Person receiving food, a moment of connection',
    eyebrow: 'What dignity looks like',
    headline: 'No form to fill in.\nNo proof required.\nNo one asking why.',
    subtext: 'Hunger is not a test you have to pass. You should never have to explain yourself to eat.',
    position: 'center 38%',
  },
  {
    src: '/web/close-up-man-holding-box-with-food.jpg',
    alt: 'Man holding a box full of food donations',
    eyebrow: 'The box that started here',
    headline: 'Someone listed this\ntwo hours ago.\nYou found it.',
    subtext: "That\u2019s all it takes. Surplus on one side. Someone who needs it on the other. EssenShare in between.",
    position: 'center 45%',
    isFinal: true,
  },
];

const TOTAL = slides.length;
// Each slide occupies 1 screen-height of scroll. 100vh per slide + 100vh buffer at end.
const WRAPPER_HEIGHT = `${TOTAL * 100 + 100}vh`;

export default function HeroScroll() {
  const { t } = useTranslation();
  const wrapperRef    = useRef<HTMLDivElement>(null);
  const stickyRef     = useRef<HTMLDivElement>(null);
  const imageRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef   = useRef<HTMLSpanElement>(null);
  const ctaRef        = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!wrapperRef.current) return;

    const ctx = gsap.context(() => {
      // ── Ensure initial opacity states ──
      imageRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { opacity: i === 0 ? 1 : 0 });
      });

      textRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { opacity: i === 0 ? 1 : 0 });
      });

      // ── Build one timeline for the full sequence ──
      const tl = gsap.timeline({ paused: true });

      // Fade out scroll hint early as soon as user begins scrolling
      if (scrollHintRef.current) {
        tl.to(scrollHintRef.current, { opacity: 0, duration: 0.25, ease: 'none' }, 0.1);
      }

      for (let i = 0; i < TOTAL; i++) {
        const imgEl = imageRefs.current[i];
        const txtEl = textRefs.current[i];
        if (!imgEl || !txtEl) continue;

        const eyebrow  = txtEl.querySelector<HTMLElement>('.hs-ey');
        const headline = txtEl.querySelector<HTMLElement>('.hs-hl');
        const subtext  = txtEl.querySelector<HTMLElement>('.hs-st');

        const base = i;

        if (i > 0) {
          // ── Image: new slide fades IN on top — previous NEVER fades out ──
          tl.fromTo(imgEl, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'none' }, base);

          // ── Text: reveal this slide's copy ──
          tl.to(txtEl, { opacity: 1, duration: 0.05 }, base + 0.05);

          // Staggered reveal of individual text elements
          if (eyebrow)  tl.fromTo(eyebrow,  { y: 12, opacity: 0 }, { y: 0, opacity: 1,    duration: 0.22, ease: 'power2.out' }, base + 0.10);
          if (headline) tl.fromTo(headline, { y: 18, opacity: 0 }, { y: 0, opacity: 1,    duration: 0.24, ease: 'power2.out' }, base + 0.14);
          if (subtext)  tl.fromTo(subtext,  { y: 12, opacity: 0 }, { y: 0, opacity: 0.88, duration: 0.22, ease: 'power2.out' }, base + 0.18);
        }

        // Last slide: text stays — no fade out needed
        // All other slides: text fades out as the next slide begins
        if (i < TOTAL - 1) {
          tl.to(txtEl, { opacity: 0, duration: 0.18, ease: 'none' }, base + 0.82);
        }
      }

      // ── Scrub timeline against scroll ──
      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        animation: tl,
      });

      // ── Progress bar ──
      if (progressRef.current) {
        gsap.fromTo(progressRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapperRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.3,
            },
          }
        );
      }
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={wrapperRef}
      style={{ height: WRAPPER_HEIGHT, position: 'relative' }}
      aria-label="EssenShare story"
    >
      {/* Sticky viewport — 100dvh for mobile address bar stability */}
      <div
        ref={stickyRef}
        style={{
          position: 'sticky',
          top: 0,
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {/* ── Image stack — all absolutely positioned ── */}
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            ref={(el) => { imageRefs.current[i] = el; }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: i + 1,
              opacity: i === 0 ? 1 : 0,
            }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i <= 1}
              style={{
                objectFit: 'cover',
                objectPosition: slide.position,
              }}
              sizes="100vw"
              quality={i === 0 ? 92 : 85}
            />
            {/* Dark scrim for text contrast */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to bottom,' +
                  'oklch(0% 0 0 / 0.05) 0%,' +
                  'oklch(0% 0 0 / 0.18) 25%,' +
                  'oklch(0% 0 0 / 0.65) 65%,' +
                  'oklch(0% 0 0 / 0.88) 100%)',
              }}
            />
          </div>
        ))}

        {/* ── Text overlays — strictly above CTA zone ── */}
        {slides.map((slide, i) => (
          <div
            key={`txt-${slide.src}`}
            ref={(el) => { textRefs.current[i] = el; }}
            className="hs-text-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: TOTAL + 2 + i,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              paddingInline: 'var(--space-page)',
              paddingBlockEnd: '0.75rem',
              pointerEvents: 'none',
              opacity: i === 0 ? 1 : 0,
            }}
          >
            <div style={{ maxWidth: '50rem' }}>
              <p
                className="hs-ey"
                style={{
                  fontSize: 'clamp(0.72rem, 1.8vw, var(--step--1))',
                  fontFamily: 'var(--font-body)',
                  color: 'oklch(99% 0 0 / 0.75)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  fontWeight: 600,
                  marginBlockEnd: 'clamp(0.35rem, 1vh, var(--space-s))',
                }}
              >
                {slide.eyebrow}
              </p>

              <h1
                className="hs-hl font-display"
                style={{
                  fontSize: 'clamp(1.45rem, 4.2vw, var(--display))',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  color: 'oklch(99% 0 0)',
                  lineHeight: 1.14,
                  letterSpacing: '-0.025em',
                  whiteSpace: 'pre-line',
                  textWrap: 'balance' as React.CSSProperties['textWrap'],
                  marginBlockEnd: 'clamp(0.4rem, 1.2vh, 0.85rem)',
                  willChange: 'transform, opacity',
                }}
              >
                {slide.headline}
              </h1>

              <p
                className="hs-st"
                style={{
                  fontSize: 'clamp(0.85rem, 2.2vw, var(--step-0))',
                  fontFamily: 'var(--font-body)',
                  color: 'oklch(99% 0 0 / 0.86)',
                  lineHeight: 1.55,
                  fontWeight: 400,
                  maxWidth: '44ch',
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                {slide.subtext}
              </p>
            </div>
          </div>
        ))}

        {/* ── Persistent CTAs — visible across all scroll stages ── */}
        <div
          ref={ctaRef}
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            bottom: 'clamp(0.85rem, 2.2vh, 1.75rem)',
            zIndex: TOTAL + 30,
            paddingInline: 'var(--space-page)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ maxWidth: '50rem' }}>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <Link
                href="/find"
                className="font-body"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingInline: 'var(--space-xl)',
                  paddingBlock: '0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent)',
                  color: 'var(--accent-on)',
                  fontWeight: 600,
                  fontSize: 'clamp(0.9rem, 2.2vw, var(--step-0))',
                  fontFamily: 'var(--font-body)',
                  minHeight: '44px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px oklch(0% 0 0 / 0.35)',
                }}
              >
                {t('home.cta_find')}
              </Link>
              <Link
                href="/register"
                className="font-body"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingInline: 'var(--space-xl)',
                  paddingBlock: '0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'oklch(0% 0 0 / 0.35)',
                  color: 'oklch(99% 0 0)',
                  fontWeight: 600,
                  fontSize: 'clamp(0.9rem, 2.2vw, var(--step-0))',
                  fontFamily: 'var(--font-body)',
                  minHeight: '44px',
                  textDecoration: 'none',
                  border: '1.5px solid oklch(99% 0 0 / 0.65)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                {t('home.cta_post')}
              </Link>
            </div>
            <p
              ref={scrollHintRef}
              style={{
                fontSize: 'var(--step--1)',
                fontFamily: 'var(--font-body)',
                color: 'oklch(99% 0 0 / 0.70)',
                marginBlockStart: '0.35rem',
                lineHeight: 1.35,
              }}
            >
              <span aria-hidden="true">↓</span> {t('home.scroll_hint')}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetBlockEnd: 0,
            insetInlineStart: 0,
            insetInlineEnd: 0,
            zIndex: TOTAL + 20,
            height: '3px',
            background: 'oklch(99% 0 0 / 0.14)',
          }}
        >
          <span
            ref={progressRef}
            style={{
              display: 'block',
              height: '100%',
              background: 'var(--accent)',
              transformOrigin: 'left center',
              transform: 'scaleX(0)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

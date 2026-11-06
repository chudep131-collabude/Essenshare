'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ManifestoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const donorRef = useRef<HTMLDivElement>(null);
  const recipientRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) return;

    const ctx = gsap.context(() => {
      // Problem statement slides up as one block
      if (problemRef.current) {
        gsap.from(problemRef.current, {
          y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: problemRef.current, start: 'top 88%', once: true },
        });
      }

      // Divider line draws across
      if (dividerRef.current) {
        gsap.from(dividerRef.current, {
          scaleX: 0, duration: 0.9, ease: 'power3.out', transformOrigin: 'left center',
          scrollTrigger: { trigger: dividerRef.current, start: 'top 90%', once: true },
        });
      }

      // Donor column
      if (donorRef.current) {
        gsap.from(donorRef.current, {
          x: -28, opacity: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: donorRef.current, start: 'top 86%', once: true },
        });
      }

      // Recipient column slight delay so they stagger
      if (recipientRef.current) {
        gsap.from(recipientRef.current, {
          x: 28, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.12,
          scrollTrigger: { trigger: recipientRef.current, start: 'top 86%', once: true },
        });
      }

      // Closing line
      if (closingRef.current) {
        gsap.from(closingRef.current, {
          y: 24, opacity: 0, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: closingRef.current, start: 'top 90%', once: true },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="manifesto-heading"
      style={{
        background: 'var(--surface-soft)',
        paddingBlock: 'var(--space-section)',
        borderBlockStart: '1px solid var(--line)',
        borderBlockEnd: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          maxInlineSize: 'var(--page-max)',
          marginInline: 'auto',
          paddingInline: 'var(--space-page)',
        }}
      >
        {/* ── Problem statement centred, editorial ── */}
        <div
          ref={problemRef}
          style={{
            maxInlineSize: '62ch',
            marginInline: 'auto',
            textAlign: 'center',
            marginBlockEnd: 'clamp(3.5rem, 7vw, 6rem)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--step--1)',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              fontWeight: 600,
              marginBlockEnd: 'var(--space-l)',
            }}
          >
            Why this exists
          </p>

          <h2
            id="manifesto-heading"
            style={{
              fontSize: 'var(--step-3)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
              color: 'var(--ink)',
              marginBlockEnd: 'var(--space-xl)',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            Every day, food is thrown away in cities where people go hungry.
            Not because there is not enough. Because the two sides cannot find each other.
          </h2>

          <p
            style={{
              fontSize: 'var(--step-0)',
              color: 'var(--ink-muted)',
              lineHeight: 1.7,
              textWrap: 'pretty' as React.CSSProperties['textWrap'],
            }}
          >
            A restaurant closes and 40 portions go into the bin. A bakery ends its day
            with a hundred unsold loaves. A farmer has more produce than the market could
            take. A grocer has products approaching their sell-by date. Meanwhile, three
            streets away, someone is working out whether they can afford to eat today.
          </p>

          <p
            style={{
              marginBlockStart: 'var(--space-l)',
              fontSize: 'var(--step-0)',
              color: 'var(--ink-muted)',
              lineHeight: 1.7,
              textWrap: 'pretty' as React.CSSProperties['textWrap'],
            }}
          >
            That is the gap EssenShare was built to close. Not with warehouses or logistics
            fleets. With information. The simple act of making available things visible
            to the people who need them, before the opportunity disappears.
          </p>
        </div>

        {/* ── Divider ── */}
        <div
          ref={dividerRef}
          aria-hidden="true"
          style={{
            height: '1px',
            background: 'var(--line)',
            marginBlockEnd: 'clamp(3.5rem, 7vw, 6rem)',
            transformOrigin: 'left center',
          }}
        />

        {/* ── Two-column letter: Donor / Recipient ── */}
        <div
          style={{
            display: 'grid',
            gap: 'clamp(3rem, 6vw, 5rem)',
            alignItems: 'start',
          }}
          className="grid-cols-1 lg:grid-cols-2"
        >
          {/* LEFT For Donors */}
          <div ref={donorRef}>
            <p
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                fontWeight: 600,
                marginBlockEnd: 'var(--space-l)',
              }}
            >
              For those who want to give
            </p>

            <h3
              style={{
                fontSize: 'var(--step-2)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                color: 'var(--ink)',
                marginBlockEnd: 'var(--space-xl)',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
              }}
            >
              You already have something that can change someone's day. You just need
              a way to reach them.
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-l)',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                If you run a business, you know the feeling. The end of the day arrives
                and there is still food on the shelf, in the kitchen, in the storeroom.
                Food that is perfectly good. Food that someone would be genuinely grateful
                for. And yet, without a way to connect it to that person, it gets thrown
                away. Every time. Not because you want to waste it. Because there was
                no other option.
              </p>

              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                If you are an individual someone who grew too much in their garden,
                bought more than you needed, made a meal for twelve and fed four you
                have probably wondered what to do with the rest. You did not want to
                waste it. You just did not know who to give it to.
              </p>

              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                EssenShare is the answer to that question. Post what you have. Someone
                nearby will see it. They will come and collect it. You will know it
                reached a real person, because you will confirm it yourself. Two minutes
                of your time. Someone else's full stomach.
              </p>

              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                  borderInlineStart: '2px solid var(--accent)',
                  paddingInlineStart: 'var(--space-l)',
                }}
              >
                You do not need a charity partnership or a logistics plan. You need
                a platform that puts your surplus in front of the right people,
                before it becomes waste. That is all this is.
              </p>
            </div>

            <Link
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBlockStart: 'var(--space-2xl)',
                fontSize: 'var(--step-0)',
                fontWeight: 600,
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
              className="hover:underline"
            >
              Start donating <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* RIGHT For Recipients */}
          <div
            ref={recipientRef}
            className="border-t-2 border-line pt-10 lg:border-t-0 lg:pt-0 lg:border-s lg:border-line lg:ps-[clamp(3rem,6vw,5rem)]"
          >
            <p
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                fontWeight: 600,
                marginBlockEnd: 'var(--space-l)',
              }}
            >
              For those who need it
            </p>

            <h3
              style={{
                fontSize: 'var(--step-2)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                color: 'var(--ink)',
                marginBlockEnd: 'var(--space-xl)',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
              }}
            >
              You should not have to explain yourself to find food that is being
              given away freely.
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-l)',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                There are systems in the world that make people feel small for needing
                help. Forms to fill in. Queues to join. Eligibility thresholds to clear.
                Proof to provide. EssenShare is not one of those systems.
              </p>

              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                You open the platform. You allow your location. You see what is
                available near you right now a bakery with bread, a shop with
                groceries nearing their expiration dates, a neighbour with more than they need. You collect it with
                a single-use code. No account. No registration. No record attached to
                your name. No one asks why you need it.
              </p>

              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                }}
              >
                We built it this way because we believe finding food should not feel
                like a test you can fail. Hard times are not a character flaw. Needing
                help is not a disqualification. And the food was going to be given away
                regardless the only question was whether the right person could find it.
              </p>

              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                  borderInlineStart: '2px solid var(--accent)',
                  paddingInlineStart: 'var(--space-l)',
                }}
              >
                You are that person. You do not need to justify that. You just need
                to know where to look.
              </p>
            </div>

            <Link
              href="/find"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBlockStart: 'var(--space-2xl)',
                fontSize: 'var(--step-0)',
                fontWeight: 600,
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
              className="hover:underline"
            >
              Find food near me <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* ── Closing line ── */}
        <div
          ref={closingRef}
          style={{
            marginBlockStart: 'clamp(4rem, 8vw, 7rem)',
            textAlign: 'center',
            maxInlineSize: '52ch',
            marginInline: 'auto',
          }}
        >
          <p
            style={{
              fontSize: 'var(--step-1)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.35,
              color: 'var(--ink)',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            The food already exists.
            The people already exist.
            The need already exists.
          </p>
          <p
            style={{
              marginBlockStart: 'var(--space-m)',
              fontSize: 'var(--step-0)',
              color: 'var(--accent)',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            EssenShare exists to connect them.
          </p>
        </div>
      </div>
    </section>
  );
}

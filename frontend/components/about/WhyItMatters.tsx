'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Each block: an eyebrow label + one or more paragraphs
const passages = [
  {
    id: 'contradiction',
    eyebrow: 'The contradiction we refuse to accept',
    heading: 'The food is there. The people are there. They simply cannot find each other.',
    paragraphs: [
      'Every day, food is produced, prepared, stored, and sold in cities and towns all over the world. And every day, a portion of that food perfectly edible, genuinely nutritious, completely safe does not reach a person. It reaches a bin.',
      'Not because anyone intended for that to happen. Not because the food was bad. But because without a way to connect available surplus with the people nearby who need it, the default outcome is waste. The food expires. The moment passes. The opportunity disappears.',
      'At exactly the same time, in exactly the same city, there are people who cannot afford their next meal. Who are stretching what they have further than it should have to go. Who would be genuinely grateful for what just went into the rubbish.',
      'That is the contradiction EssenShare was built to address. Not with charity in the traditional sense. Not with warehouses or logistics networks or government programmes. With something simpler: information. Making what is available visible to the people who need it, before the window closes.',
    ],
  },
  {
    id: 'problem',
    eyebrow: 'What the real problem is',
    heading: 'It is not a scarcity problem. It is a connection problem.',
    paragraphs: [
      'When people hear about food waste and hunger existing side by side, they often assume the solution must be complicated. That it requires scale, infrastructure, funding, policy. And while those things matter at a systemic level, they miss something important: many of the individual moments of waste and hunger happen within a few kilometres of each other.',
      'A restaurant 2 kilometres from where you are sitting may have 40 portions available tonight that will go unsold. A bakery around the corner will close in two hours with bread still on the shelf. A family nearby has more from their allotment than they can possibly eat. None of them know you exist. You do not know they exist either.',
      'The problem is not that the food does not exist. The problem is that the information about the food does not exist not in a form that connects supply with need at the right moment, in the right place, for the right people.',
      'EssenShare is that information system. Nothing more, nothing less. A way for people who have something to offer to make it visible, and a way for people who need it to find it without friction, without paperwork, without stigma.',
    ],
  },
  {
    id: 'who',
    eyebrow: 'Who this is for',
    heading: 'Anyone who has food to give. Anyone who needs food to find.',
    paragraphs: [
      'EssenShare is not a platform for a specific type of person. It is not only for charities or food banks or people in extreme crisis. It is for everyone who sits anywhere along the chain between surplus and need.',
      'It is for the restaurant owner who cannot bear throwing away tonight\'s unsold meals but has no way to distribute them. For the supermarket with a pallet of products expiring tomorrow. For the farmer whose crop exceeded what the market could absorb. For the wholesaler with a surplus they cannot move.',
      'It is for the individual who made too much, bought too much, grew too much. For the Samaritan who simply wants to help people in their neighbourhood and is looking for where that help is actually needed right now.',
      'And it is for the person who opens the platform quietly, privately, without registering, without explaining themselves and finds that there is food available two streets away, right now, that they can collect with a single-use code and no questions asked.',
      'It is for the community organisation that wants to coordinate something larger to aggregate surplus from multiple donors, to run regular distributions, to serve people at scale rather than one pickup at a time.',
      'All of them are welcome here. All of them are necessary. The platform only works when both sides are present.',
    ],
  },
  {
    id: 'dignity',
    eyebrow: 'On dignity',
    heading: 'Needing help is not a disqualification.',
    paragraphs: [
      'There is a pattern in many assistance systems that, however well-intentioned, ends up doing harm alongside the good it does. The pattern is this: to receive help, a person must first prove they deserve it.',
      'Forms. Appointments. Means tests. Eligibility criteria. Proof of income, proof of address, proof of circumstances. All of it designed, in theory, to ensure help reaches the right people. All of it, in practice, requiring a person to repeatedly demonstrate their vulnerability to strangers before anything is given.',
      'EssenShare does not work that way. We made a deliberate decision, early on, that no one should have to justify needing food in order to access food that is being given away freely.',
      'The food was going to be donated regardless. The donor does not know who will collect it. They do not need to know. They simply need someone to show up, present a code, and take it. Who that person is, what their circumstances are, why they need it none of that is required. None of that is recorded.',
      'We believe that the dignity of the person collecting is not a detail. It is not a nice-to-have. It is a design requirement. A platform that makes people feel like suspects or charity cases in exchange for a loaf of bread has failed at something important, regardless of how many meals it distributes.',
    ],
  },
  {
    id: 'honesty',
    eyebrow: 'On honesty',
    heading: 'We report only what actually happened.',
    paragraphs: [
      'Impact numbers in the charity and nonprofit world have a problem. The problem is inflation. Meals "served" that were never confirmed. Quantities "redistributed" that were estimated rather than actual pickups. People "reached" counted as a multiplier of a household who may or may not have been fed.',
      'We refuse to do that. Every number on our impact board is a confirmed completed transaction. A donor posted. A recipient collected. A code was scanned. The handover was confirmed. That is what we count.',
      'If we have completed 500 pickups, we say 500. Not "up to 1,500 people fed" based on an average household size. Not "thousands of meals" based on a category guess. 500 confirmed pickups, and the actual items confirmed at each one.',
      'An honest zero is better than a comfortable lie. We believe the people who use this platform donors, recipients, partners, and supporters deserve to know exactly what is real.',
    ],
  },
  {
    id: 'vision',
    eyebrow: 'Where this is going',
    heading: 'A global network for redistributing surplus resources to people who need them.',
    paragraphs: [
      'EssenShare starts with food because food is the most immediate, most universal, most time-sensitive form of surplus. But the logic applies more broadly. Essential products. Household goods. Hygiene supplies. Things that accumulate in warehouses and stockrooms and homes and never reach the families who need them because the connection was never made.',
      'The vision is a platform that works anywhere in the world. That adapts to local languages, local address formats, local donation cultures. That serves a small community in one country and a city of millions in another, with the same simple mechanism at its core: surplus made visible, connection made easy, dignity preserved throughout.',
      'We are building it because we believe the problem is solvable. Not fully, not immediately, not by a single platform acting alone. But meaningfully, incrementally, one confirmed handover at a time.',
      'Every pickup that happens on this platform is food that did not become waste and a person who did not go without. That is the thing we are here to multiply.',
    ],
  },
];

export default function WhyItMatters() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const passageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) return;

    const ctx = gsap.context(() => {
      // Header
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: 36, opacity: 0, duration: 0.75, ease: 'power3.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 88%', once: true },
        });
      }

      // Each passage block staggers in
      passageRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.from(el, {
          y: 32, opacity: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          delay: (i % 2) * 0.06,
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="why-heading"
      style={{
        background: 'var(--bg)',
        paddingBlock: 'var(--space-section)',
        borderBlockStart: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          maxInlineSize: 'var(--page-max)',
          marginInline: 'auto',
          paddingInline: 'var(--space-page)',
        }}
      >
        {/* ── Section header ── */}
        <div
          ref={headerRef}
          style={{
            maxInlineSize: '60ch',
            marginBlockEnd: 'clamp(4rem, 8vw, 7rem)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--step--1)',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              fontWeight: 600,
              marginBlockEnd: 'var(--space-m)',
            }}
          >
            The full story
          </p>
          <h2
            id="why-heading"
            style={{
              fontSize: 'var(--step-4)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              color: 'var(--ink)',
              marginBlockEnd: 'var(--space-l)',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            Why EssenShare exists.
          </h2>
          <p
            style={{
              fontSize: 'var(--step-1)',
              color: 'var(--ink-muted)',
              lineHeight: 1.65,
              fontWeight: 400,
              textWrap: 'pretty' as React.CSSProperties['textWrap'],
            }}
          >
            This is not a summary. If you want to understand what we are building and why
            the problem we are trying to solve, who it is for, and what we refuse to compromise on
            this is that explanation.
          </p>
        </div>

        {/* ── Passage blocks ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'clamp(4rem, 8vw, 7rem)',
          }}
        >
          {passages.map((passage, i) => (
            <div
              key={passage.id}
              ref={(el) => { passageRefs.current[i] = el; }}
              style={{
                display: 'grid',
                gap: 'clamp(2rem, 4vw, 3.5rem)',
                alignItems: 'start',
              }}
              className="grid-cols-1 md:grid-cols-[18ch_1fr]"
            >
              {/* Left column sticky eyebrow label */}
              <div>
                <p
                  style={{
                    fontSize: 'var(--step--1)',
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {passage.eyebrow}
                </p>
              </div>

              {/* Right column heading + body */}
              <div>
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
                  {passage.heading}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-l)',
                  }}
                >
                  {passage.paragraphs.map((para, j) => (
                    <p
                      key={j}
                      style={{
                        fontSize: 'var(--step-0)',
                        color: 'var(--ink-muted)',
                        lineHeight: 1.75,
                        maxInlineSize: '62ch',
                        textWrap: 'pretty' as React.CSSProperties['textWrap'],
                      }}
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Closing statement ── */}
        <div
          style={{
            marginBlockStart: 'clamp(5rem, 10vw, 9rem)',
            paddingBlockStart: 'clamp(3rem, 6vw, 5rem)',
            borderBlockStart: '1px solid var(--line)',
            maxInlineSize: '56ch',
            marginInline: 'auto',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 'var(--step-2)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.3,
              color: 'var(--ink)',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
              marginBlockEnd: 'var(--space-l)',
            }}
          >
            Food should never be a problem because people cannot find it.
          </p>
          <p
            style={{
              fontSize: 'var(--step-0)',
              color: 'var(--ink-muted)',
              lineHeight: 1.7,
              textWrap: 'pretty' as React.CSSProperties['textWrap'],
            }}
          >
            No matter where you are in the world, you should be able to discover available food
            and essential resources around you, understand where they are, and know how to reach
            them. That is the platform we are building. That is why we will not stop until it works.
          </p>
          <p
            style={{
              marginBlockStart: 'var(--space-xl)',
              fontSize: 'var(--step--1)',
              color: 'var(--accent)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            EssenShare Connecting what is available with those who need it.
          </p>
        </div>
      </div>
    </section>
  );
}

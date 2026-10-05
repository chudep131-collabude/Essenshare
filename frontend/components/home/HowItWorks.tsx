const steps = [
  {
    number: '1',
    title: 'A donor lists surplus food',
    body: 'Any individual or business with surplus food posts a listing — what it is, how much, where to collect, and for how long.',
    detail: 'Takes under 2 minutes',
  },
  {
    number: '2',
    title: 'Someone nearby sees it',
    body: 'Anyone can browse without an account or login. No means-testing, no eligibility checks. If you need it, it is for you.',
    detail: 'Anonymous browsing, always',
  },
  {
    number: '3',
    title: 'They collect it. Done.',
    body: 'The recipient contacts the donor through our anonymised system and arranges a pickup. No money changes hands. No data is stored after the transaction.',
    detail: 'Zero friction, zero cost',
  },
];

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
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
        {/* Section header */}
        <div style={{ marginBlockEnd: 'clamp(3rem, 6vw, 5rem)' }}>
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
              maxInlineSize: '26ch',
            }}
          >
            Three steps. No bureaucracy. No barriers.
          </h2>
        </div>

        {/* Steps — alternating editorial layout */}
        <ol
          aria-label="How Essenshare works — three steps"
          style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(3rem, 6vw, 5rem)',
          }}
        >
          {steps.map((step, index) => {
            const isReversed = index % 2 === 1;

            return (
              <li
                key={step.number}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-m)',
                  alignItems: 'center',
                }}
                className={`sm:flex-row${isReversed ? ' sm:flex-row-reverse' : ''}`}
              >
                {/* Large step number — purely decorative */}
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    fontSize: 'clamp(6rem, 12vw, 14rem)',
                    fontWeight: 800,
                    color: 'var(--accent-muted)',
                    lineHeight: 1,
                    userSelect: 'none',
                    // On mobile, reduce to reasonable size and centre
                    minInlineSize: '0',
                  }}
                  className="sm:w-1/2 flex items-center justify-center"
                >
                  {step.number}
                </div>

                {/* Text content */}
                <div
                  className="sm:w-1/2"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-s)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: 'var(--step-2)',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      color: 'var(--ink)',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 'var(--step-0)',
                      color: 'var(--ink-muted)',
                      lineHeight: 1.65,
                      maxInlineSize: '52ch',
                      textWrap: 'pretty' as React.CSSProperties['textWrap'],
                    }}
                  >
                    {step.body}
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--step--1)',
                      color: 'var(--accent)',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {step.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

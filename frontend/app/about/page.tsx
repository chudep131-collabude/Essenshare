import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About Essenshare',
  description:
    'Learn about the Essenshare mission: no good food should become waste while someone nearby is hungry.',
};

const principles = [
  {
    number: '1',
    title: 'Collect minimum data',
    description: 'Only what the platform needs to function.',
  },
  {
    number: '2',
    title: 'Recipient first',
    description: 'Recipient privacy is the highest priority.',
  },
  {
    number: '3',
    title: 'Transparency',
    description: 'Users know what is collected and why.',
  },
  {
    number: '4',
    title: 'Control',
    description: 'Users can access and delete their data.',
  },
  {
    number: '5',
    title: 'Dignity',
    description: 'The platform never treats users as suspects.',
  },
  {
    number: '6',
    title: 'No poverty testing',
    description: 'No means-testing, no eligibility checks.',
  },
];

export default function AboutPage() {
  return (
    <article className="max-w-page mx-auto px-[var(--space-page)] py-section">
      {/* Hero image — full-width, 400px height, object-cover */}
      <div className="w-full rounded-md overflow-hidden mb-10">
        <Image
          src="/web/about.jpg"
          alt="A community food sharing moment — hands exchanging fresh food in a warm setting"
          width={1200}
          height={400}
          className="w-full h-[400px] object-cover"
          priority
        />
      </div>

      {/* Mission */}
      <section aria-labelledby="mission-heading" className="mb-12">
        <h1
          id="mission-heading"
          className="text-step-3 font-bold text-ink mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          About Essenshare
        </h1>
        <p className="text-step-1 text-accent font-semibold mb-4 italic">
          &ldquo;No good food should become waste while someone nearby is hungry.&rdquo;
        </p>
        <p className="text-ink-muted leading-relaxed mb-4 max-w-prose">
          Essenshare is a free, nonprofit-operated platform that connects people who have surplus
          food with people who need it — in the same neighbourhood, on the same day. No
          bureaucracy, no means-testing, no waiting lists.
        </p>
        <p className="text-ink-muted leading-relaxed max-w-prose">
          We believe access to food is a right, not a privilege. Our platform is built to be as
          frictionless as possible for recipients, and as simple as possible for donors.
        </p>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="mb-12">
        <h2
          id="how-heading"
          className="text-step-2 font-bold text-ink mb-6"
          style={{ letterSpacing: '-0.02em' }}
        >
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              role: 'Donors',
              description:
                'Businesses, farms, and individuals list surplus food — groceries, prepared meals, produce, bakery items — with pickup details, allergen information, and use-by dates.',
            },
            {
              role: 'Recipients',
              description:
                'Anyone can browse available donations anonymously. No account required. Find food by location and category, then collect using a simple one-time code.',
            },
            {
              role: 'Partners',
              description:
                'Organisations such as food banks, community centres, and NGOs can register to receive larger or regular donations and coordinate redistribution in their area.',
            },
          ].map((item) => (
            <div
              key={item.role}
              className="bg-surface-soft rounded-md p-6 border border-line"
            >
              <h3 className="text-base font-semibold text-accent mb-2">{item.role}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-heading" className="mb-12">
        <h2
          id="principles-heading"
          className="text-step-2 font-bold text-ink mb-6"
          style={{ letterSpacing: '-0.02em' }}
        >
          Platform Principles
        </h2>
        <ol className="space-y-4" aria-label="Essenshare platform principles">
          {principles.map((p) => (
            <li key={p.number} className="flex gap-4">
              <span
                className="shrink-0 w-8 h-8 rounded-full bg-accent text-[var(--accent-on)] flex items-center justify-center text-sm font-bold"
                aria-hidden="true"
              >
                {p.number}
              </span>
              <div>
                <span className="font-semibold text-ink">{p.title}</span>
                {' — '}
                <span className="text-ink-muted">{p.description}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Operating model */}
      <section aria-labelledby="operating-heading" className="mb-12">
        <h2
          id="operating-heading"
          className="text-step-2 font-bold text-ink mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          Operating Model
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4 max-w-prose">
          Essenshare operates as a nonprofit platform. There is no charge to donors or recipients.
          The platform does not sell data, display advertising, or seek profit. Operating costs are
          covered by grants and community contributions.
        </p>
        <p className="text-ink-muted leading-relaxed max-w-prose">
          All impact data is published publicly. We report only what is real: completed,
          confirmed pickups. We never inflate numbers.
        </p>
      </section>

      {/* Liability */}
      <section
        aria-labelledby="liability-heading"
        className="bg-surface-soft border border-line rounded-md p-6"
      >
        <h2
          id="liability-heading"
          className="text-step-1 font-semibold text-ink mb-3"
          style={{ letterSpacing: '-0.02em' }}
        >
          Liability Statement
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed max-w-prose">
          The platform makes no warranty regarding the safety of any food listed by donors. The
          platform facilitates connections between donors and recipients, requires donors to agree
          to a safety policy, and operates a reporting system to remove unsafe listings. The
          platform is not a food retailer or distributor.
        </p>
      </section>
    </article>
  );
}

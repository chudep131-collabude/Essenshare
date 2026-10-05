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
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero image */}
      <div className="w-full rounded-xl overflow-hidden mb-10">
        <Image
          src="/web/about.jpg"
          alt="A community food sharing moment — hands exchanging fresh food in a warm setting"
          width={1200}
          height={400}
          className="w-full h-[280px] sm:h-[360px] object-cover"
          priority
        />
      </div>

      {/* Mission */}
      <section aria-labelledby="mission-heading" className="mb-12">
        <h1 id="mission-heading" className="text-3xl sm:text-4xl font-bold text-text-base mb-4">
          About Essenshare
        </h1>
        <p className="text-lg text-primary font-semibold mb-4 italic">
          &ldquo;No good food should become waste while someone nearby is hungry.&rdquo;
        </p>
        <p className="text-text-muted leading-relaxed mb-4">
          Essenshare is a free, nonprofit-operated platform that connects people who have surplus
          food with people who need it — in the same neighbourhood, on the same day. No
          bureaucracy, no means-testing, no waiting lists.
        </p>
        <p className="text-text-muted leading-relaxed">
          We believe access to food is a right, not a privilege. Our platform is built to be as
          frictionless as possible for recipients, and as simple as possible for donors.
        </p>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="mb-12">
        <h2 id="how-heading" className="text-2xl font-bold text-text-base mb-6">
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
              className="bg-surface-alt rounded-xl p-6 border border-border-base"
            >
              <h3 className="text-base font-semibold text-primary mb-2">{item.role}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-heading" className="mb-12">
        <h2 id="principles-heading" className="text-2xl font-bold text-text-base mb-6">
          Platform Principles
        </h2>
        <ol className="space-y-4" aria-label="Essenshare platform principles">
          {principles.map((p) => (
            <li key={p.number} className="flex gap-4">
              <span
                className="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold"
                aria-hidden="true"
              >
                {p.number}
              </span>
              <div>
                <span className="font-semibold text-text-base">{p.title}</span>
                {' — '}
                <span className="text-text-muted">{p.description}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Operating model */}
      <section aria-labelledby="operating-heading" className="mb-12">
        <h2 id="operating-heading" className="text-2xl font-bold text-text-base mb-4">
          Operating Model
        </h2>
        <p className="text-text-muted leading-relaxed mb-4">
          Essenshare operates as a nonprofit platform. There is no charge to donors or recipients.
          The platform does not sell data, display advertising, or seek profit. Operating costs are
          covered by grants and community contributions.
        </p>
        <p className="text-text-muted leading-relaxed">
          All impact data is published publicly. We report only what is real: completed,
          confirmed pickups. We never inflate numbers.
        </p>
      </section>

      {/* Liability */}
      <section
        aria-labelledby="liability-heading"
        className="bg-surface-alt border border-border-base rounded-xl p-6"
      >
        <h2 id="liability-heading" className="text-lg font-semibold text-text-base mb-3">
          Liability Statement
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          The platform makes no warranty regarding the safety of any food listed by donors. The
          platform facilitates connections between donors and recipients, requires donors to agree
          to a safety policy, and operates a reporting system to remove unsafe listings. The
          platform is not a food retailer or distributor.
        </p>
      </section>
    </article>
  );
}

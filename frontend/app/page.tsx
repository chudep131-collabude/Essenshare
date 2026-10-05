import type { Metadata } from 'next';
import HeroCarousel from '@/components/home/HeroCarousel';
import ImpactStats from '@/components/home/ImpactStats';
import HowItWorks from '@/components/home/HowItWorks';
import DonorCTA from '@/components/home/DonorCTA';

export const metadata: Metadata = {
  title: 'Home',
  description:
    'Find free surplus food and groceries near you, or donate your surplus. Free, nonprofit-operated. No account required to receive.',
};

const featureCards = [
  {
    icon: '🔒',
    title: 'Privacy Protected',
    description:
      'Recipients browse anonymously. No account required. Your location is never stored or shared with donors.',
  },
  {
    icon: '🛡️',
    title: 'Food Safety First',
    description:
      'Every donor agrees to our food safety policy before listing. Allergens, use-by dates, and storage requirements are mandatory.',
  },
  {
    icon: '🌍',
    title: 'Built Globally',
    description:
      'Logical CSS layout for every language, every direction. Essenshare works from Accra to Amsterdam.',
  },
  {
    icon: '📊',
    title: 'Real Impact Data',
    description:
      'Every pickup is tracked and reported publicly. No greenwashing — only verified, completed transactions.',
  },
];

export default function HomePage() {
  return (
    <>
      <HeroCarousel />

      <ImpactStats />

      <HowItWorks />

      {/* Feature grid */}
      <section aria-labelledby="features-heading" className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="features-heading"
              className="text-2xl sm:text-3xl font-bold text-text-base mb-4"
            >
              Built on Dignity, Not Charity
            </h2>
            <p className="text-text-muted text-base max-w-xl mx-auto">
              Essenshare is designed with the recipient at the centre, not as an afterthought.
            </p>
          </div>

          <ul
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            aria-label="Platform features"
          >
            {featureCards.map((card) => (
              <li
                key={card.title}
                className="bg-surface-alt rounded-xl p-6 border border-border-base"
              >
                <span className="text-3xl mb-3 block" aria-hidden="true">
                  {card.icon}
                </span>
                <h3 className="text-base font-semibold text-text-base mb-2">{card.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{card.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <DonorCTA />
    </>
  );
}

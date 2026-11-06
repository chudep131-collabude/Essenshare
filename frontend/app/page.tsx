import type { Metadata } from 'next';
import HeroScroll from '@/components/home/HeroScroll';
import ImpactStats from '@/components/home/ImpactStats';
import ManifestoSection from '@/components/home/ManifestoSection';
import HowItWorks from '@/components/home/HowItWorks';
import TrustSection from '@/components/home/TrustSection';
import DonorCTA from '@/components/home/DonorCTA';

// ImpactStats fetches live data avoid SSG timeout
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Home',
  description:
    'Find free surplus food and groceries near you, or donate your surplus. Free, nonprofit-operated. No account required to receive.',
};

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — scroll-scrubbed image sequence */}
      <HeroScroll />

      {/* 2. Impact stats */}
      <ImpactStats />

      {/* 3. Why this exists heartfelt donor/recipient editorial */}
      <ManifestoSection />

      {/* 4. How it works */}
      <HowItWorks />

      {/* 4. Trust + image */}
      <TrustSection />

      {/* 5. Donor CTA */}
      <DonorCTA />
    </>
  );
}

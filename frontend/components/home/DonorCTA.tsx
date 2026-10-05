import Link from 'next/link';

export default function DonorCTA() {
  return (
    <section
      aria-labelledby="donor-cta-heading"
      className="py-20 bg-primary-light"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          id="donor-cta-heading"
          className="text-2xl sm:text-3xl font-bold text-text-base mb-3"
        >
          Have surplus food? List it today.
        </h2>
        <p className="text-text-muted text-base mb-8">
          It takes 2 minutes. No cost. Real impact.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-primary text-white font-semibold text-base hover:bg-primary-dark transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Start Donating
        </Link>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import SafetyReportCard from '@/components/safety/SafetyReportCard';

export const metadata: Metadata = {
  title: 'Food Safety Policy',
  description:
    'Essenshare food safety policy what donors must agree to, what is prohibited, and how to report unsafe donations.',
};

export default function SafetyPage() {
  return (
    <article className="max-w-page mx-auto px-[var(--space-page)] py-section">
      <div className="prose max-w-prose mx-auto">
        <h1 id="top">Food Safety Policy</h1>
        <p className="text-ink-quiet text-sm">Version 1.0 October 2026</p>

        {/* Purpose */}
        <section aria-labelledby="purpose-heading">
          <h2 id="purpose-heading">Purpose</h2>
          <p>
            The platform facilitates the redistribution of surplus food. Food safety is non-negotiable.
            This policy defines:
          </p>
          <ul>
            <li>What donors must agree to before listing food</li>
            <li>What information donors must provide</li>
            <li>What the platform will and will not do regarding safety enforcement</li>
            <li>How safety concerns are reported and handled</li>
            <li>How the platform protects recipients from unsafe donations</li>
          </ul>
        </section>

        {/* Donor Safety Agreement */}
        <section aria-labelledby="agreement-heading">
          <h2 id="agreement-heading">Donor Safety Agreement</h2>
          <p>
            Every donor must accept the following agreement before posting any donation:
          </p>
          <div
            className="safety-agreement not-prose"
            role="region"
            aria-label="Donor safety agreement"
          >
            <p className="font-semibold text-ink mb-3 text-sm">I confirm that:</p>
            <ol className="space-y-2 text-sm text-ink-muted list-decimal ps-5">
              <li>
                The items I am donating are safe, fit for their intended use, and suitable for
                distribution to members of the public.
              </li>
              <li>
                I will not knowingly distribute food or products that are spoiled, contaminated,
                improperly stored, past their use-by date, subject to a recall, or otherwise unsafe
                or prohibited from distribution.
              </li>
              <li>
                The information I provide about my donation including descriptions, quantities,
                allergens, storage requirements, and use-by dates is accurate to the best of my
                knowledge.
              </li>
              <li>
                I understand that recipients may include people with dietary needs, allergies, or
                medical conditions, and I take that responsibility seriously.
              </li>
              <li>
                I accept that the platform is a facilitator and not responsible for the safety of
                food or products I list. I bear sole responsibility for items I choose to distribute.
              </li>
              <li>
                I understand that deliberately providing false or misleading safety information may
                result in my account being suspended or permanently banned, and may have legal
                consequences.
              </li>
              <li>
                I will remove or update my listing immediately if I become aware that any item may
                be unsafe.
              </li>
            </ol>
          </div>
        </section>

        {/* Required Listing Information */}
        <section aria-labelledby="listing-heading">
          <h2 id="listing-heading">Required Listing Information</h2>
          <p>All food donations require:</p>
          <ul>
            <li>Category</li>
            <li>Description (minimum 20 characters)</li>
            <li>Items and quantities</li>
            <li>Use-by or best-before date (must not be in the past)</li>
            <li>Storage requirement (room temperature / refrigerated / frozen)</li>
            <li>Pickup deadline (must be on or before use-by date)</li>
            <li>Condition</li>
          </ul>
          <p>
            High-risk categories (prepared meals, meat/fish/poultry, dairy, baby food) require
            additional fields including preparation date, allergen declarations, and storage
            verification.
          </p>
        </section>

        {/* Allergens */}
        <section aria-labelledby="allergens-heading">
          <h2 id="allergens-heading">Allergens</h2>
          <p>
            Donors must declare allergens from the standardized list:
          </p>
          <ul>
            <li>Gluten</li>
            <li>Crustaceans</li>
            <li>Eggs</li>
            <li>Fish</li>
            <li>Peanuts</li>
            <li>Soybeans</li>
            <li>Milk/Dairy</li>
            <li>Tree Nuts (specify type)</li>
            <li>Celery</li>
            <li>Mustard</li>
            <li>Sesame</li>
            <li>Sulphur dioxide/Sulphites</li>
            <li>Lupin</li>
            <li>Molluscs</li>
          </ul>
        </section>

        {/* Prohibited */}
        <section aria-labelledby="prohibited-heading">
          <h2 id="prohibited-heading">What Is Prohibited</h2>
          <p>Donors may never list:</p>
          <ul>
            <li>Food that is known or suspected to be unsafe or spoiled</li>
            <li>Food subject to an active recall</li>
            <li>Medications of any kind</li>
            <li>Alcohol (region-dependent)</li>
            <li>Unpackaged raw meat or fish that cannot be maintained at safe temperatures</li>
            <li>Opened or expired infant formula</li>
            <li>Any illegal substance</li>
          </ul>
        </section>

        {/* Reporting */}
        <section aria-labelledby="reporting-heading">
          <h2 id="reporting-heading">Reporting an Unsafe Donation</h2>
          <p>
            Anyone recipient, donor, or visitor can submit a safety report. No account required.
          </p>
          <p>Report categories:</p>
          <ul>
            <li>Unsafe Food (listing immediately hidden)</li>
            <li>Spoiled or Expired</li>
            <li>Wrong Allergen Information</li>
            <li>Wrong Description</li>
            <li>Cold Chain Concern</li>
            <li>Already Gone</li>
          </ul>
          <p>
            Reports are reviewed by the platform team. Confirmed unsafe listings are removed and
            donors may be suspended.
          </p>
        </section>

        {/* Liability */}
        <section aria-labelledby="liability-heading">
          <h2 id="liability-heading">Platform Liability</h2>
          <p>
            The platform makes no warranty regarding the safety of any food or product listed by
            donors. The platform facilitates connections, requires donors to agree to this safety
            agreement, and operates a reporting system. The platform is not a food retailer or
            distributor and does not inspect food before redistribution.
          </p>
          <p>
            In many jurisdictions, good-faith food donors are protected from civil liability under
            Good Samaritan laws (e.g. US: Bill Emerson Good Samaritan Food Donation Act 1996).
          </p>
        </section>

        {/* Report button */}
        <section aria-labelledby="report-heading">
          <h2 id="report-heading">Report an Unsafe Donation</h2>
          <p>
            Use the form below to report a safety concern. Your report is anonymous and helps keep
            the community safe.
          </p>
          <SafetyReportCard />
        </section>
      </div>
    </article>
  );
}

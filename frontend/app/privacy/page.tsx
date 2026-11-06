import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Essenshare privacy policy what we collect, what we never collect, and your rights over your data.',
};

export default function PrivacyPage() {
  return (
    <article className="max-w-page mx-auto px-[var(--space-page)] py-section">
      <div className="prose max-w-prose mx-auto">
        <h1 id="top">Privacy Policy</h1>
        <p className="text-ink-quiet text-sm">Version 1.0 October 2026</p>

        <nav aria-label="Privacy policy sections" className="not-prose my-8">
          <p className="text-sm font-semibold text-ink mb-2">Jump to section:</p>
          <ol className="list-decimal ps-5 space-y-1 text-sm">
            <li><a href="#who-we-are" className="text-accent hover:text-accent-dark">Who We Are</a></li>
            <li><a href="#what-we-collect" className="text-accent hover:text-accent-dark">What We Collect and Why</a></li>
            <li><a href="#what-we-never-collect" className="text-accent hover:text-accent-dark">What We Never Collect</a></li>
            <li><a href="#location-privacy" className="text-accent hover:text-accent-dark">Location Privacy</a></li>
            <li><a href="#log-safety" className="text-accent hover:text-accent-dark">Log Safety</a></li>
            <li><a href="#data-retention" className="text-accent hover:text-accent-dark">Data Retention</a></li>
            <li><a href="#data-sharing" className="text-accent hover:text-accent-dark">Data Sharing</a></li>
            <li><a href="#your-rights" className="text-accent hover:text-accent-dark">Your Rights</a></li>
            <li><a href="#cookies" className="text-accent hover:text-accent-dark">Cookies</a></li>
            <li><a href="#contact" className="text-accent hover:text-accent-dark">Contact</a></li>
          </ol>
        </nav>

        <section aria-labelledby="who-we-are">
          <h2 id="who-we-are">1. Who We Are</h2>
          <p>
            Essenshare is a free, nonprofit-operated platform that facilitates the redistribution of
            surplus food. We are committed to handling your personal information with care,
            transparency, and respect.
          </p>
        </section>

        <section aria-labelledby="what-we-collect">
          <h2 id="what-we-collect">2. What We Collect and Why</h2>

          <h3>Recipients (no account required)</h3>
          <p>We collect only:</p>
          <ul>
            <li>
              A session cookie (random UUID, 24-hour expiry) to enable the pickup flow
            </li>
            <li>
              Optionally your email address if you choose to receive a pickup confirmation
            </li>
          </ul>
          <p>
            Your location coordinates are used only to find nearby donations and are never stored
            server-side or linked to your session.
          </p>

          <h3>Individual Donors</h3>
          <ul>
            <li>First and last name (private)</li>
            <li>Display name (public)</li>
            <li>Email address (private)</li>
            <li>Phone number (private)</li>
            <li>Pickup location address and coordinates (public necessary for recipients to collect)</li>
            <li>A record of your safety agreement acceptance</li>
          </ul>

          <h3>Business Donors</h3>
          <ul>
            <li>Business name (public)</li>
            <li>Contact person name (private, admin only)</li>
            <li>Business email and phone (private, admin only)</li>
            <li>Website URL if provided (public)</li>
            <li>Business category (public)</li>
            <li>Pickup address (public)</li>
          </ul>

          <h3>Organisations</h3>
          <p>
            Same as business donors, plus organisation type, service area, and description (all public).
          </p>
        </section>

        <section aria-labelledby="what-we-never-collect">
          <h2 id="what-we-never-collect">3. What We Never Collect</h2>
          <p>We never collect:</p>
          <ul>
            <li>Recipient identity</li>
            <li>Proof of income or hardship</li>
            <li>Recipient GPS coordinates at rest</li>
            <li>Donor&apos;s private residential address</li>
            <li>Payment information</li>
            <li>Biometric data</li>
            <li>Political or religious affiliation</li>
            <li>Health or medical conditions</li>
            <li>Race or ethnicity</li>
            <li>National identification numbers</li>
          </ul>
        </section>

        <section aria-labelledby="location-privacy">
          <h2 id="location-privacy">4. Location Privacy</h2>
          <p>
            Recipient location coordinates are sent to our server only to perform the nearby search
            query. They are never logged, never stored in the database, and never shared with donors.
            Donors never see where a recipient is located.
          </p>
        </section>

        <section aria-labelledby="log-safety">
          <h2 id="log-safety">5. Log Safety</h2>
          <p>
            We never log passwords, pickup codes, full email addresses, phone numbers, or GPS
            coordinates. Emails in logs are masked (e.g. j****@example.com). Application logs are
            retained for 30 days.
          </p>
        </section>

        <section aria-labelledby="data-retention">
          <h2 id="data-retention">6. Data Retention</h2>
          <p>
            Recipient sessions expire after 24 hours. Completed transaction records are retained for
            5 years for impact reporting, then anonymized. Audit logs are retained indefinitely for
            compliance.
          </p>
          <p>
            When a donor deletes their account, personal identifiers are replaced with anonymized
            placeholders within 7 days. Completed transaction records are kept in anonymized form to
            preserve impact reporting integrity.
          </p>
        </section>

        <section aria-labelledby="data-sharing">
          <h2 id="data-sharing">7. Data Sharing</h2>
          <p>
            We share pickup address and donor display name publicly (necessary for recipients to
            collect food). We share aggregate impact statistics publicly.
          </p>
          <p>
            We never sell or share personal data with third parties for advertising. We may use
            third-party services for email delivery (SMTP), SMS verification, and geocoding these
            receive only the minimum data necessary.
          </p>
        </section>

        <section aria-labelledby="your-rights">
          <h2 id="your-rights">8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your data</li>
            <li>Correct it</li>
            <li>Request deletion</li>
            <li>Receive a portable copy (JSON export)</li>
            <li>Object to processing</li>
            <li>Withdraw consent</li>
          </ul>
          <p>
            To exercise these rights, use the in-app settings or contact us by email. We respond
            within 30 days.
          </p>
        </section>

        <section aria-labelledby="cookies">
          <h2 id="cookies">9. Cookies</h2>
          <p>We use only functional cookies:</p>
          <ul>
            <li>A session cookie (24-hour expiry) for the pickup flow</li>
            <li>A refresh token (30-day expiry) for donor login</li>
            <li>A language preference cookie (1-year expiry)</li>
          </ul>
          <p>
            No advertising, analytics, or tracking cookies are set. No third-party cookie scripts
            are loaded.
          </p>
        </section>

        <section aria-labelledby="contact">
          <h2 id="contact">10. Contact</h2>
          <p>
            For data requests or privacy questions, contact our Data Protection contact via the
            email address listed in the platform footer.
          </p>
        </section>
      </div>
    </article>
  );
}

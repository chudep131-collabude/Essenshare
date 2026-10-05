import Link from 'next/link';

const footerLinks = [
  { href: '/',         label: 'Home' },
  { href: '/find',     label: 'Find Food' },
  { href: '/about',    label: 'About' },
  { href: '/safety',   label: 'Safety Policy' },
  { href: '/privacy',  label: 'Privacy Policy' },
  { href: '/impact',   label: 'Impact' },
  { href: '/login',    label: 'Donor Login' },
  { href: '/register', label: 'Register' },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-white" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold text-white mb-2">Essenshare</p>
            <p className="text-sm text-neutral-300 leading-relaxed">
              No good food should become waste while someone nearby is hungry.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-4">
              Navigation
            </p>
            <ul className="space-y-2" role="list">
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-neutral-300 hover:text-white transition-colors duration-150 no-underline hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mission */}
          <div>
            <p className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-4">
              Our Mission
            </p>
            <p className="text-sm text-neutral-300 leading-relaxed mb-2">
              Connecting surplus food with people who need it — free, anonymous, no means-testing.
            </p>
            <p className="text-sm text-neutral-300">
              No account required to receive food.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-700">
          <p className="text-sm text-neutral-500 text-center">
            © Essenshare. Free, nonprofit-operated.{' '}
            <Link href="/privacy" className="underline text-neutral-400 hover:text-white transition-colors duration-150">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

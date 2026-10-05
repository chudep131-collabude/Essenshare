const steps = [
  {
    number: '1',
    title: 'Donors List Surplus',
    description:
      'Businesses, farms, and individuals post available food with pickup details. It takes 2 minutes and no cost.',
  },
  {
    number: '2',
    title: 'Recipients Find Nearby',
    description:
      'Anyone can search by location and browse available donations. No account needed. Full anonymity guaranteed.',
  },
  {
    number: '3',
    title: 'Pickup Confirmed',
    description:
      'Recipient collects using a one-time pickup code. No account needed. No questions asked.',
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="py-16 bg-surface-alt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            id="how-it-works-heading"
            className="text-2xl sm:text-3xl font-bold text-text-base mb-4"
          >
            How Essenshare Works
          </h2>
          <p className="text-text-muted text-base max-w-xl mx-auto">
            Simple, dignified, and free. No accounts, no eligibility checks.
          </p>
        </div>

        <ol
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          aria-label="How Essenshare works — 3 steps"
        >
          {steps.map((step) => (
            <li
              key={step.number}
              className="flex flex-col items-center text-center bg-surface rounded-xl p-8 border border-border-base shadow-sm"
            >
              <span
                className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold mb-4 shrink-0"
                aria-hidden="true"
              >
                {step.number}
              </span>
              <h3 className="text-lg font-semibold text-text-base mb-2">{step.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

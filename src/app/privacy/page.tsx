import type { Metadata } from 'next';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | BoxStreamTV',
  description: 'Learn how BoxStreamTV collects, uses, and protects your personal information when you use our live boxing streaming platform.',
  alternates: { canonical: 'https://boxstreamtv.com/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <div className="min-h-screen bg-black pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto sm:px-6">

          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Privacy Policy</h1>
            <div className="w-16 h-[2px] bg-white mt-6" />
            <p className="text-sm text-gray-500 mt-4">Last updated: April 5, 2025</p>
          </div>

          <div className="space-y-10 text-gray-400 leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-white mb-3">1. Overview</h2>
              <p>
                BoxStreamTV (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your choices regarding that information when you use our website and streaming service at boxstreamtv.com.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">2. Information We Collect</h2>

              <h3 className="text-white font-semibold mb-2 mt-4">Information you provide directly</h3>
              <ul className="list-none space-y-2 pl-4 border-l border-white/10 mb-4">
                <li><span className="text-white">Account registration:</span> email address and password (or Google profile name and email if you use Google sign-in)</li>
                <li><span className="text-white">Payments:</span> billing information is collected and processed by Stripe. We do not store your full card number on our servers.</li>
                <li><span className="text-white">Contact form:</span> name, email, phone number, and message content</li>
              </ul>

              <h3 className="text-white font-semibold mb-2">Information collected automatically</h3>
              <ul className="list-none space-y-2 pl-4 border-l border-white/10">
                <li><span className="text-white">Usage data:</span> pages visited, events viewed, purchase history, and playback activity</li>
                <li><span className="text-white">Device &amp; technical data:</span> IP address, browser type, operating system, and referring URLs</li>
                <li><span className="text-white">Location data:</span> approximate geographic location derived from your IP address, used solely to enforce broadcast blackout restrictions for certain live events</li>
                <li><span className="text-white">Cookies &amp; local storage:</span> session tokens and preference data to keep you logged in and personalize your experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">3. How We Use Your Information</h2>
              <ul className="list-none space-y-2 pl-4 border-l border-white/10">
                <li>Provide and operate the Service, including streaming events and VOD content</li>
                <li>Process payments and manage your subscription or PPV purchases</li>
                <li>Enforce geographic blackout restrictions required by broadcast agreements</li>
                <li>Send transactional emails (purchase confirmations, account verification, password resets)</li>
                <li>Respond to support inquiries submitted through the contact form</li>
                <li>Improve the Service through aggregated, anonymized analytics</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-4">
                We do not sell your personal information to third parties. We do not use your data for targeted advertising.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">4. Third-Party Services</h2>
              <p className="mb-3">We use the following third-party providers who may process your data on our behalf:</p>
              <div className="space-y-4">
                {[
                  {
                    name: 'Supabase',
                    desc: 'Authentication and database hosting. Stores your account credentials and purchase records.',
                    link: 'https://supabase.com/privacy',
                  },
                  {
                    name: 'Stripe',
                    desc: 'Payment processing. Handles all credit/debit card transactions and subscription billing. Stripe is PCI-DSS compliant.',
                    link: 'https://stripe.com/privacy',
                  },
                  {
                    name: 'Google',
                    desc: 'Optional sign-in via Google OAuth. If used, Google shares your name and email with us.',
                    link: 'https://policies.google.com/privacy',
                  },
                  {
                    name: 'Amazon Web Services (AWS)',
                    desc: 'Video storage and delivery for VOD content via Amazon S3 and Amazon IVS.',
                    link: 'https://aws.amazon.com/privacy',
                  },
                  {
                    name: 'Vercel',
                    desc: 'Website hosting and edge infrastructure.',
                    link: 'https://vercel.com/legal/privacy-policy',
                  },
                ].map((p) => (
                  <div key={p.name} className="pl-4 border-l border-white/10">
                    <span className="text-white font-semibold">{p.name}:</span>{' '}
                    {p.desc}{' '}
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-white hover:underline text-sm">
                      Privacy policy &rarr;
                    </a>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">5. Cookies</h2>
              <p>
                We use cookies and similar technologies for authentication (keeping you logged in), session management, and basic analytics. You can disable cookies in your browser settings, but doing so may prevent you from logging in or accessing purchased content.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">6. Data Retention</h2>
              <p>
                We retain your account information for as long as your account is active. Purchase records are retained as required for tax and legal compliance (typically 7 years). If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">7. Your Rights</h2>
              <p className="mb-3">You have the right to:</p>
              <ul className="list-none space-y-2 pl-4 border-l border-white/10">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and personal data</li>
                <li>Opt out of any marketing communications</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, email us at{' '}
                <a href="mailto:hunter@boxstreamtv.com" className="text-white hover:underline">hunter@boxstreamtv.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">8. Children&apos;s Privacy</h2>
              <p>
                The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">9. Security</h2>
              <p>
                We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the Service after changes are posted constitutes your acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">11. Contact</h2>
              <p>
                Questions or concerns about this Privacy Policy? Contact us at{' '}
                <a href="mailto:hunter@boxstreamtv.com" className="text-white hover:underline">
                  hunter@boxstreamtv.com
                </a>{' '}
                or use the{' '}
                <a href="/contact" className="text-white hover:underline">contact form</a>.
              </p>
            </section>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

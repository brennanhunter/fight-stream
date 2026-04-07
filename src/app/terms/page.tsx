import type { Metadata } from 'next';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | BoxStreamTV',
  description: 'Read the BoxStreamTV Terms of Service governing use of our live boxing streaming and pay-per-view platform.',
  alternates: { canonical: 'https://boxstreamtv.com/terms' },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <div className="min-h-screen bg-black pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto sm:px-6">

          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Terms of Service</h1>
            <div className="w-16 h-[2px] bg-white mt-6" />
            <p className="text-sm text-gray-500 mt-4">Last updated: April 5, 2025</p>
          </div>

          <div className="space-y-10 text-gray-400 leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using BoxStreamTV (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all visitors, registered users, and anyone who purchases or accesses content through BoxStreamTV.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">2. Eligibility</h2>
              <p>
                You must be at least 13 years of age to create an account. By using the Service you represent that you meet this requirement. If you are under 18, you represent that a parent or legal guardian has reviewed and agreed to these terms on your behalf.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">3. Accounts</h2>
              <p className="mb-3">
                You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use.
              </p>
              <p>
                Accounts are personal and non-transferable. Sharing account credentials to allow others to access purchased content is prohibited and may result in account termination.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">4. Pay-Per-View Purchases</h2>
              <p className="mb-3">
                PPV event purchases grant you a limited, non-exclusive, non-transferable license to stream the specific event for personal, non-commercial use. All purchases are final.
              </p>
              <p className="mb-3">
                <span className="text-white font-semibold">Refund Policy.</span> PPV purchases are non-refundable except where a technical issue on our end prevented you from accessing the stream. If you were unable to watch due to a platform or streaming failure, contact us at{' '}
                <a href="mailto:hunter@boxstreamtv.com" className="text-white hover:underline">hunter@boxstreamtv.com</a>{' '}
                and we will issue a full refund. Refunds are not issued for issues caused by your internet connection, device, or browser.
              </p>
              <p className="mb-3">
                Prices are listed in US dollars and are subject to change without notice. Applicable taxes may be added at checkout.
              </p>
              <p>
                <span className="text-white font-semibold">Event Cancellation &amp; Interruption.</span> If a purchased event is cancelled by the promoter, we will issue a full refund. If an event is significantly delayed or interrupted due to circumstances outside our control (weather, venue issues, broadcast failure), we will make reasonable efforts to provide replay access. If replay access cannot be provided, refund requests will be reviewed on a case-by-case basis. Streaming quality may vary based on your internet connection and is not grounds for a refund.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">5. Fight Pass Subscriptions</h2>
              <p className="mb-3">
                Fight Pass is a recurring subscription that grants access to VOD replays and discounted PPV pricing. Subscriptions renew automatically at the end of each billing cycle unless cancelled.
              </p>
              <p className="mb-3">
                You may cancel your subscription at any time through your account settings or by contacting us. Cancellation takes effect at the end of the current billing period — you will retain access until that date. No partial refunds are issued for unused subscription time.
              </p>
              <p>
                We reserve the right to modify subscription pricing with reasonable advance notice. Continued use of the Service after a price change constitutes acceptance of the new price.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">6. Blackout &amp; Geographic Restrictions</h2>
              <p>
                Certain live events may be subject to geographic blackout restrictions due to local broadcast agreements. If an event is blacked out in your area, your purchase will be honored for replay access once the blackout window has ended. No refunds are issued solely due to a geographic blackout.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">7. Acceptable Use</h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="list-none space-y-2 pl-4 border-l border-white/10">
                <li>Record, reproduce, redistribute, or rebroadcast any streamed content</li>
                <li>Use screen capture, bots, or automated tools to download content</li>
                <li>Share login credentials or purchased event access with others</li>
                <li>Use the Service for any commercial purpose without prior written consent</li>
                <li>Attempt to circumvent geo-restrictions through VPNs or proxies to access blacked-out content</li>
                <li>Interfere with or disrupt the Service or servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">8. Intellectual Property</h2>
              <p>
                All content on BoxStreamTV — including video streams, event footage, logos, graphics, and text — is owned by BoxStreamTV or its licensed content partners and is protected by copyright. Nothing in these terms grants you any ownership interest in any content.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">9. Third-Party Services</h2>
              <p>
                The Service uses third-party providers including Stripe (payment processing) and Google (authentication). Your use of those features is also subject to those providers&apos; respective terms and privacy policies. We are not responsible for the practices of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">10. Disclaimer of Warranties</h2>
              <p>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied. We do not warrant that streams will be uninterrupted, error-free, or free from technical issues. Live streaming is subject to internet conditions, broadcasting limitations, and other factors outside our control.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">11. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, BoxStreamTV and its founders, employees, and partners shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability to you for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">12. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at our discretion if you violate these terms. Upon termination, your right to access the Service ceases immediately. Provisions that by their nature should survive termination will do so.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">13. Changes to These Terms</h2>
              <p>
                We may update these Terms at any time. We will post the revised version with an updated date. Continued use of the Service after changes are posted constitutes your acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">14. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of Florida, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Volusia County, Florida.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">15. Contact</h2>
              <p>
                Questions about these Terms? Email us at{' '}
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

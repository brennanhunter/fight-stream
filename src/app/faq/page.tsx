'use client';

import { useState } from 'react';
import Link from 'next/link';

const faqs = [
  {
    category: 'Watching',
    items: [
      {
        q: 'Where do I watch the fight?',
        a: 'Head to the home page at boxstreamtv.com — when the event is live, the stream will appear automatically. You\'ll need to have purchased PPV access or have an active Fight Pass subscription.',
      },
      {
        q: 'Does it work on mobile and tablet?',
        a: 'Yes. BoxStreamTV works on any modern browser — iPhone, Android, iPad, laptop, or desktop. No app download required.',
      },
      {
        q: 'Can I watch on my TV?',
        a: 'Yes. Use AirPlay on Apple devices, Chromecast on Android, or simply mirror your screen. You can also open the site directly in a smart TV browser.',
      },
      {
        q: 'What video quality can I expect?',
        a: 'We stream in up to 1080p HD. Quality may adjust automatically based on your internet connection. We recommend at least 10 Mbps for the best experience.',
      },
      {
        q: 'The stream is buffering or not loading — what do I do?',
        a: 'Try refreshing the page first. If that doesn\'t help: check your internet connection, disable a VPN if you\'re using one, try a different browser, or switch from Wi-Fi to a wired connection. If the issue persists, email hunter@boxstreamtv.com.',
      },
    ],
  },
  {
    category: 'Access & Purchases',
    items: [
      {
        q: 'I purchased but can\'t access the stream. What do I do?',
        a: 'Go to the Recover Access page and enter the email you used to purchase. We\'ll send you a 6-digit code to instantly restore your access — no account required.',
        link: { label: 'Recover Access →', href: '/recover-access' },
      },
      {
        q: 'I switched devices or browsers and lost access. How do I get back in?',
        a: 'Your access is tied to your browser session. If you\'re on a new device, use the Recover Access flow — enter your purchase email, get the code, and you\'re back in.',
        link: { label: 'Recover Access →', href: '/recover-access' },
      },
      {
        q: 'Can I watch on multiple devices at the same time?',
        a: 'Each purchase is for one active session at a time. If you log in on a new device, your previous session will be invalidated. Use Recover Access to move between devices.',
      },
      {
        q: 'When does my PPV access expire?',
        a: 'PPV access is valid for 48 hours from the event start time, giving you time to watch the replay if you miss the live show.',
      },
      {
        q: 'Do I need an account to purchase PPV?',
        a: 'No. You can purchase as a guest using just your email. Creating an account makes it easier to manage purchases and recover access.',
      },
    ],
  },
  {
    category: 'Fight Pass Subscription',
    items: [
      {
        q: 'What\'s the difference between PPV and Fight Pass?',
        a: 'PPV is a one-time purchase for a single event. Fight Pass is a monthly subscription that gives you unlimited access to our VOD library of past events, plus discounted PPV pricing on future live events.',
        link: { label: 'View Plans →', href: '/pricing' },
      },
      {
        q: 'What\'s included in Fight Pass Basic vs Premium?',
        a: 'Both tiers include unlimited VOD replays and discounted PPV pricing. Premium adds early access to new events and additional exclusive perks as we grow.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Account → Subscription → Manage Billing. You can cancel anytime — you\'ll keep access until the end of your current billing period.',
        link: { label: 'Manage Subscription →', href: '/account/subscription' },
      },
      {
        q: 'When am I charged?',
        a: 'You\'re charged on the same date each month from when you first subscribed. You\'ll receive an email confirmation after each successful payment.',
      },
    ],
  },
  {
    category: 'Billing & Refunds',
    items: [
      {
        q: 'Can I get a refund on a PPV purchase?',
        a: 'If a technical issue on our end prevented you from accessing the stream, we\'ll issue a full refund — just email us with your purchase email and a description of the problem. Refunds don\'t apply to issues caused by your internet connection, device, or browser.',
        link: { label: 'Terms of Service →', href: '/terms' },
      },
      {
        q: 'My payment failed. Will I lose access?',
        a: 'Not immediately. Stripe will retry your card automatically. You\'ll receive an email with the retry date. Update your payment method in your account before the retry to avoid any interruption.',
        link: { label: 'Update Payment Method →', href: '/account/subscription' },
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. All payments are processed by Stripe — we never store your card details. Stripe is PCI DSS Level 1 certified, the highest level of payment security.',
      },
    ],
  },
  {
    category: 'Support',
    items: [
      {
        q: 'How do I contact support?',
        a: 'Email hunter@boxstreamtv.com. Include your purchase email and a brief description of the issue and we\'ll get back to you as quickly as possible.',
      },
      {
        q: 'What are your support hours?',
        a: 'We monitor support emails daily. For event-night issues, we prioritize responses around event start times. For the fastest help during a live event, include "URGENT" in your subject line.',
      },
    ],
  },
];

function FaqItem({ q, a, link }: { q: string; a: string; link?: { label: string; href: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-sm font-bold text-white group-hover:text-gray-300 transition-colors pr-8">
          {q}
        </span>
        <span className={`shrink-0 w-5 h-5 border border-white/30 flex items-center justify-center text-white transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>

      {open && (
        <div className="pb-5">
          <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
          {link && (
            <Link
              href={link.href}
              className="inline-block mt-3 text-[10px] font-bold tracking-[0.15em] uppercase text-white hover:text-gray-300 transition-colors"
            >
              {link.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-black pt-32 pb-24 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
            Support
          </p>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <div className="w-12 h-[2px] bg-white mb-6" />
          <p className="text-sm text-gray-400 leading-relaxed">
            Can&apos;t find what you&apos;re looking for?{' '}
            <a
              href="mailto:hunter@boxstreamtv.com"
              className="text-white underline underline-offset-2 hover:text-gray-300 transition-colors"
            >
              Email us
            </a>{' '}
            and we&apos;ll get back to you.
          </p>
        </div>

        {/* FAQ sections */}
        <div className="space-y-12">
          {faqs.map((section) => (
            <div key={section.category}>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-1">
                {section.category}
              </p>
              <div>
                {section.items.map((item) => (
                  <FaqItem key={item.q} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 border border-white/10 p-8 text-center">
          <p className="text-sm font-bold text-white mb-2">Still need help?</p>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;re a small team and we read every email.
          </p>
          <a
            href="mailto:hunter@boxstreamtv.com"
            className="inline-block px-8 py-3 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
          >
            Contact Support
          </a>
        </div>

      </div>
    </div>
  );
}

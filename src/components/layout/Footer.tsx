import Link from 'next/link';
import Image from 'next/image';

const nav = [
  {
    label: 'Watch',
    links: [
      { name: 'Live Events', href: '/' },
      { name: 'VOD Library', href: '/vod' },
      { name: 'Fight Pass', href: '/pricing' },
    ],
  },
  {
    label: 'Account',
    links: [
      { name: 'My Account', href: '/account' },
      { name: 'Purchases', href: '/account/purchases' },
      { name: 'Fight Pass', href: '/account/subscription' },
      { name: 'Recover Access', href: '/recover-access' },
    ],
  },
  {
    label: 'Company',
    links: [
      { name: 'Work With Us', href: '/work-with-us' },
      { name: 'Contact', href: '/contact' },
      { name: 'Help / FAQ', href: '/faq' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">

        {/* Top: Logo + tagline + nav */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8 mb-14">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/logos/BoxStreamVerticalLogo.png"
                alt="BoxStreamTV"
                width={140}
                height={56}
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
              Independent boxing, streamed live. No cable required.
            </p>

            {/* Social */}
            <div className="flex gap-3 mt-6">
              <a
                href="https://www.instagram.com/boxstreamtv/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="group flex items-center justify-center w-9 h-9 border border-white/20 hover:border-white hover:bg-white transition-all duration-300"
              >
                <svg aria-hidden="true" className="w-4 h-4 text-white group-hover:text-black transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@BoxStreamTV"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="group flex items-center justify-center w-9 h-9 border border-white/20 hover:border-white hover:bg-white transition-all duration-300"
              >
                <svg aria-hidden="true" className="w-4 h-4 text-white group-hover:text-black transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@boxstream_tv"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="group flex items-center justify-center w-9 h-9 border border-white/20 hover:border-white hover:bg-white transition-all duration-300"
              >
                <svg aria-hidden="true" className="w-4 h-4 text-white group-hover:text-black transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.78 1.54V6.84a4.84 4.84 0 0 1-1.02-.15z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/box-stream-tv"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="group flex items-center justify-center w-9 h-9 border border-white/20 hover:border-white hover:bg-white transition-all duration-300"
              >
                <svg aria-hidden="true" className="w-4 h-4 text-white group-hover:text-black transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {nav.map((col) => (
            <div key={col.label}>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-4">
                {col.label}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Legal + copyright */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-600">
            <span>© {new Date().getFullYear()} BoxStreamTV</span>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <a href="mailto:hunter@boxstreamtv.com" className="hover:text-white transition-colors">
              hunter@boxstreamtv.com
            </a>
          </div>

          {/* Credit */}
          <p className="text-xs text-gray-700">
            <a
              href="https://xtremery.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-500 transition-colors"
            >
              fight ready by Xtremery · Deland, FL
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}

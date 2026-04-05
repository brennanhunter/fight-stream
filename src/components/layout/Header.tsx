'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import UserMenu from '@/components/auth/UserMenu';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const supabase = createBrowserClient();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'VOD', href: '/vod' },
    { name: 'Fight Pass', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Help', href: '/faq' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isMobileMenuOpen
          ? 'bg-black/90 backdrop-blur-md border-b border-white/10 shadow-[0_1px_20px_rgba(0,0,0,0.5)]'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logos/BoxStreamVerticalLogo.png"
              alt="Box Stream TV"
              width={420}
              height={168}
              className="h-[120px] w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-4 py-2 text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-4 right-4 h-px bg-white" />
                )}
              </Link>
            ))}
          </div>

          {/* Auth / CTA - Desktop */}
          <div className="hidden md:block">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link
                href="/login"
                className="text-[10px] font-bold tracking-[0.2em] uppercase px-5 py-2 border border-white text-white hover:bg-white hover:text-black transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Auth + Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link
                href="/login"
                className="text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-1.5 border border-white text-white hover:bg-white hover:text-black transition-all duration-200"
              >
                Sign In
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-gray-300 transition-colors p-2"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-6 border-t border-white/10 flex flex-col gap-1 bg-black">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-2 py-3 text-xs font-bold tracking-[0.2em] uppercase transition-colors ${
                  isActive(item.href)
                    ? 'text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-2 py-3 text-xs font-bold tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors"
                >
                  My Account
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsMobileMenuOpen(false);
                    window.location.href = '/';
                  }}
                  className="mt-3 text-center text-[10px] font-bold tracking-[0.2em] uppercase px-5 py-3 border border-white/20 text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-all duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}

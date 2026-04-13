'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    { name: 'Work With Us', href: '/work-with-us' },
    { name: 'Contact', href: '/contact' },
    { name: 'Help', href: '/faq' },
  ];

  const isActive = (href: string) => pathname === href;

  if (pathname.startsWith('/report/')) return null;

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
          {/* Site Name */}
          <div className="flex items-center gap-8">
            <a
              href="https://www.instagram.com/boxstreamtv/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-[27px] h-[27px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@BoxStreamTV"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-[27px] h-[27px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
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
                aria-current={isActive(item.href) ? 'page' : undefined}
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

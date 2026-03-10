'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'VOD', href: '/vod' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
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

          {/* CTA Button - Desktop */}
          <div className="hidden md:block">
            <Link
              href="/contact"
              className="text-[10px] font-bold tracking-[0.2em] uppercase px-5 py-2 border border-white text-white hover:bg-white hover:text-black transition-all duration-200"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white hover:text-gray-300 transition-colors p-2"
            aria-label="Toggle menu"
          >
            <div className="w-5 flex flex-col gap-[5px]">
              <span
                className={`block h-px bg-white transition-all duration-300 ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-[3px]' : ''
                }`}
              />
              <span
                className={`block h-px bg-white transition-all duration-300 ${
                  isMobileMenuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-px bg-white transition-all duration-300 ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-[3px]' : ''
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
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
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-3 text-center text-[10px] font-bold tracking-[0.2em] uppercase px-5 py-3 border border-white text-white hover:bg-white hover:text-black transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

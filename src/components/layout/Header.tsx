'use client';

import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-accent/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-white">
                FIGHTSTREAM<span className="text-accent">.COM</span>
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#home" className="text-white hover:text-accent px-3 py-2 text-sm font-medium transition-colors">
                Home
              </a>
              <a href="#fighters" className="text-gray-300 hover:text-accent px-3 py-2 text-sm font-medium transition-colors">
                Fighters
              </a>
              <a href="#card" className="text-gray-300 hover:text-accent px-3 py-2 text-sm font-medium transition-colors">
                Fight Card
              </a>
              <a href="#pricing" className="text-gray-300 hover:text-accent px-3 py-2 text-sm font-medium transition-colors">
                Pricing
              </a>
            </div>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <button className="text-gray-300 hover:text-accent px-3 py-2 text-sm font-medium transition-colors">
                Sign In
              </button>
              <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Buy PPV
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-black/95 rounded-lg mt-2">
              <a href="#home" className="text-white hover:text-accent block px-3 py-2 text-base font-medium">
                Home
              </a>
              <a href="#fighters" className="text-gray-300 hover:text-accent block px-3 py-2 text-base font-medium">
                Fighters
              </a>
              <a href="#card" className="text-gray-300 hover:text-accent block px-3 py-2 text-base font-medium">
                Fight Card
              </a>
              <a href="#pricing" className="text-gray-300 hover:text-accent block px-3 py-2 text-base font-medium">
                Pricing
              </a>
              <div className="border-t border-gray-700 pt-4 mt-4">
                <button className="text-gray-300 hover:text-accent block px-3 py-2 text-base font-medium w-full text-left">
                  Sign In
                </button>
                <button className="bg-primary hover:bg-primary/90 text-white block px-3 py-2 rounded-lg text-base font-medium w-full mt-2">
                  Buy PPV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
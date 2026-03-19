'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Account';

  const avatarUrl = user.user_metadata?.avatar_url;
  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  const menuItems = [
    { name: 'Dashboard', href: '/account' },
    { name: 'Subscription', href: '/account/subscription' },
    { name: 'Profile', href: '/account/profile' },
    { name: 'Purchases', href: '/account/purchases' },
    { name: 'Watchlist', href: '/account/watchlist' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        aria-label="User menu"
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-7 h-7 rounded-full object-cover border border-white/20"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
            {initials}
          </div>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-black/95 backdrop-blur-md border border-white/10 shadow-xl z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-white font-bold truncate">{displayName}</p>
            <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="border-t border-white/10 py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

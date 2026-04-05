'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

const links = [
  { href: '/account', label: 'Overview' },
  { href: '/account/subscription', label: 'Subscription' },
  { href: '/account/purchases', label: 'Purchases' },
  { href: '/account/watchlist', label: 'Watchlist' },
  { href: '/account/profile', label: 'Profile' },
];

export default function AccountNav({ displayName, email }: { displayName: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <aside className="w-full md:w-52 shrink-0">
      <div className="hidden md:block mb-8">
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-1">
          Signed in as
        </p>
        <p className="text-sm font-bold text-white truncate">{displayName}</p>
        <p className="text-[11px] text-gray-500 truncate">{email}</p>
      </div>

      {/* Mobile: horizontal scroll tabs */}
      {/* Desktop: vertical nav */}
      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-6 px-6 md:mx-0 md:px-0">
        {links.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap px-3 py-2 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors ${
                isActive
                  ? 'text-white bg-white/10'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:block mt-8 pt-6 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-600 hover:text-red-400 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

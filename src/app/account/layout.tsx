import type { Metadata } from 'next';
import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import AccountNav from './AccountNav';

export const metadata: Metadata = {
  title: 'My Account | BoxStreamTV',
  description: 'Manage your BoxStreamTV account, purchases, watchlist, and profile settings.',
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  let displayName = 'Fighter';
  if (user) {
    const adminClient = createServerClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    displayName =
      profile?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Fighter';
  }

  return (
    <div className="min-h-screen bg-black pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        {/* Mobile: name above nav */}
        <div className="md:hidden mb-4">
          <p className="text-sm font-bold text-white">{displayName}</p>
          <p className="text-[11px] text-gray-500">{user?.email}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <AccountNav
            displayName={displayName}
            email={user?.email ?? ''}
          />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

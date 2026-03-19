import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Account | BoxStreamTV',
  description: 'Manage your BoxStreamTV account, purchases, watchlist, and profile settings.',
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black pt-32 pb-16 px-6">
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  );
}

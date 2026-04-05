'use client';

import { useRouter } from 'next/navigation';

export default function AdminLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors"
    >
      Sign Out
    </button>
  );
}

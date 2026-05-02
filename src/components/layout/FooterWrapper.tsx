'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function FooterWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith('/report/')) return null;
  if (pathname.startsWith('/overlays/')) return null;
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/control')) return null;
  return <Footer />;
}

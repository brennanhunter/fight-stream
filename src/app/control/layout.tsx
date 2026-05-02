import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { Toaster } from '@/components/ui/sonner';

export default async function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/login');
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {children}
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

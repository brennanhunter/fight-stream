import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import AdminSidebarNav from '../_components/AdminSidebarNav';
import AdminLogout from '../AdminLogout';

export default async function AdminLayout({
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
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center bg-foreground text-background text-[10px] font-bold tracking-[0.15em]">
                BS
              </div>
              <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
                  BoxStreamTV
                </span>
                <span className="text-sm font-semibold">Admin</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <AdminSidebarNav />
          </SidebarContent>
          <SidebarFooter>
            <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <AdminLogout />
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <div className="px-4 pt-4">
            <SidebarTrigger className="-ml-1" />
          </div>
          <main className="flex-1 px-6 py-4">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

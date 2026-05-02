'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  History,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Radio,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Events', href: '/admin/events', icon: CalendarDays },
      { label: 'Purchases', href: '/admin/purchases', icon: ShoppingCart },
      { label: 'Subscribers', href: '/admin/subscribers', icon: Users },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
      { label: 'Marketing', href: '/admin/marketing', icon: Megaphone },
      { label: 'Overlays', href: '/admin/overlays', icon: Radio },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Legacy Panel', href: '/admin/legacy', icon: History },
    ],
  },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

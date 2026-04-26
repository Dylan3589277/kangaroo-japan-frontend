'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DashboardOutlined,
  UserOutlined,
  AccountBookOutlined,
  InboxOutlined,
  SettingOutlined,
  StarOutlined,
  BellOutlined,
} from '@ant-design/icons';
import type { ModuleType } from '@/types/admin';

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: '全局总览', href: '/admin' },
  { key: '/admin/module/hr', icon: <UserOutlined />, label: '人事模块', href: '/admin/module/hr' },
  { key: '/admin/module/finance', icon: <AccountBookOutlined />, label: '财务模块', href: '/admin/module/finance' },
  { key: '/admin/module/supply_chain', icon: <InboxOutlined />, label: '供应链模块', href: '/admin/module/supply_chain' },
  { key: '/admin/module/operation', icon: <SettingOutlined />, label: '运营模块', href: '/admin/module/operation' },
  { key: '/admin/module/influencer', icon: <StarOutlined />, label: '红人模块', href: '/admin/module/influencer' },
  { key: '/admin/alerts', icon: <BellOutlined />, label: '告警中心', href: '/admin/alerts' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-52 border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <span className="text-2xl">🦘</span>
        <span className="font-medium">袋鼠君</span>
      </div>

      <nav className="p-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.key || (item.key !== '/admin' && pathname.startsWith(item.key));
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

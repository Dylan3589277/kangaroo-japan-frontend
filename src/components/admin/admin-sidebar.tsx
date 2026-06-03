"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AccountBookOutlined,
  AppstoreOutlined,
  BellOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FileSearchOutlined,
  InboxOutlined,
  PartitionOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { cn } from "@/lib/utils";

const menuItems = [
  {
    key: "/admin",
    icon: <DashboardOutlined />,
    label: "全局总览",
    href: "/admin",
  },
  {
    key: "/admin/module/hr",
    icon: <UserOutlined />,
    label: "人事模块",
    href: "/admin/module/hr",
  },
  {
    key: "/admin/module/finance",
    icon: <AccountBookOutlined />,
    label: "财务模块",
    href: "/admin/module/finance",
  },
  {
    key: "/admin/module/supply_chain",
    icon: <InboxOutlined />,
    label: "供应链模块",
    href: "/admin/module/supply_chain",
  },
  {
    key: "/admin/module/operation",
    icon: <SettingOutlined />,
    label: "运营模块",
    href: "/admin/module/operation",
  },
  {
    key: "/admin/module/influencer",
    icon: <StarOutlined />,
    label: "红人模块",
    href: "/admin/module/influencer",
  },
  {
    key: "/admin/exchange",
    icon: <DollarOutlined />,
    label: "汇率管理",
    href: "/admin/exchange",
  },
  {
    key: "/admin/platforms",
    icon: <CloudServerOutlined />,
    label: "平台健康",
    href: "/admin/platforms",
  },
  {
    key: "/admin/workflows",
    icon: <PartitionOutlined />,
    label: "工作流总览",
    href: "/admin/workflows",
  },
  {
    key: "/admin/legacy",
    icon: <AppstoreOutlined />,
    label: "小程序矩阵",
    href: "/admin/legacy",
  },
  {
    key: "/admin/orders",
    icon: <ShoppingCartOutlined />,
    label: "订单只读",
    href: "/admin/orders",
  },
  {
    key: "/admin/warehouse",
    icon: <DatabaseOutlined />,
    label: "仓库后台",
    href: "/admin/warehouse",
  },
  {
    key: "/admin/payments",
    icon: <DollarOutlined />,
    label: "支付流水",
    href: "/admin/payments",
  },
  {
    key: "/admin/support",
    icon: <InboxOutlined />,
    label: "客服工作台",
    href: "/admin/support",
  },
  {
    key: "/admin/audit",
    icon: <FileSearchOutlined />,
    label: "审计日志",
    href: "/admin/audit",
  },
  {
    key: "/admin/alerts",
    icon: <BellOutlined />,
    label: "告警中心",
    href: "/admin/alerts",
  },
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
          const isActive =
            pathname === item.key ||
            (item.key !== "/admin" && pathname.startsWith(item.key));
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
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

'use client';

import { BellOutlined, UserOutlined } from '@ant-design/icons';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <span className="text-lg font-medium">老板经营仪表盘</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 hover:bg-muted">
          <BellOutlined className="text-lg" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            5
          </span>
        </button>
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-muted">
          <UserOutlined />
          <span className="text-sm">管理层</span>
        </div>
      </div>
    </header>
  );
}

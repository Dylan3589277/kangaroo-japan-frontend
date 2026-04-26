'use client';

import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="ml-52 flex-1 flex flex-col">
        <AdminHeader />
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

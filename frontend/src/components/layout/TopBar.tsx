'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'Overview of your email campaigns' },
  '/dashboard/contacts': { title: 'Contacts', description: 'Manage your contact lists' },
  '/dashboard/campaigns': { title: 'Campaigns', description: 'Create and manage email campaigns' },
  '/dashboard/settings/smtp': { title: 'SMTP Settings', description: 'Configure your email server' }, // ✅ Fixed path
  '/dashboard/settings': { title: 'Account Settings', description: 'Manage your account preferences' },
};

export function TopBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const pageInfo = Object.entries(pageTitles).find(([path]) =>
    pathname === path || (path !== '/dashboard' && pathname?.startsWith(path))
  )?.[1] ?? { title: 'MailFlow', description: '' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-900">{pageInfo.title}</h1>
        {pageInfo.description && (
          <p className="text-xs text-slate-500">{pageInfo.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <Bell className="w-4.5 h-4.5" />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-sm font-medium text-slate-900 hidden sm:block">
            {user?.name || user?.email?.split('@')[0] || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}
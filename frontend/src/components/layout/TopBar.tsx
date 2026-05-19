'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'Overview of your email campaigns' },
  '/dashboard/contacts': { title: 'Contacts', description: 'Manage your contact lists' },
  '/dashboard/campaigns': { title: 'Campaigns', description: 'Create and manage email campaigns' },
  '/dashboard/smtp-settings': { title: 'SMTP Settings', description: 'Configure your email server' },
  '/dashboard/settings': { title: 'Account Settings', description: 'Manage your account preferences' },
};

export function TopBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const pageInfo = Object.entries(pageTitles).find(([path]) =>
    pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
  )?.[1] ?? { title: 'MailFlow', description: '' };

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="font-display text-lg font-bold text-ink">{pageInfo.title}</h1>
        {pageInfo.description && (
          <p className="text-xs text-ink-faint">{pageInfo.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-surface-100 transition-colors text-ink-muted">
          <Bell className="w-4.5 h-4.5" />
        </button>
        <div className="w-px h-6 bg-surface-200" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-ink hidden sm:block">{user?.username}</span>
        </div>
      </div>
    </header>
  );
}

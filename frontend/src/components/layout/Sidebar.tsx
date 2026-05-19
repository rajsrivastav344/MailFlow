'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Send,
  Settings,
  Mail,
  Server,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
  { href: '/dashboard/campaigns', icon: Send, label: 'Campaigns' },
  { href: '/dashboard/smtp-settings', icon: Server, label: 'SMTP Settings' },
  { href: '/dashboard/settings', icon: Settings, label: 'Account' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-surface-200 min-h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-surface-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-brand-700 transition-colors">
            <Mail className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold text-ink">MailFlow</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider px-3 pb-2 pt-1">
          Menu
        </p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-link', isActive ? 'sidebar-link-active' : 'sidebar-link-inactive')}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-surface-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand-700">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{user?.username}</p>
            <p className="text-xs text-ink-faint capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="sidebar-link sidebar-link-inactive w-full mt-1 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

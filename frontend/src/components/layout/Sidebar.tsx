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
  { href: '/dashboard/settings/smtp', icon: Server, label: 'SMTP Settings' }, // Fixed path
  { href: '/dashboard/settings', icon: Settings, label: 'Account' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Get initial for avatar
  const getAvatarInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-slate-200 min-h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors">
            <Mail className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold text-slate-900">MailFlow</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 pb-2 pt-1">
          Menu
        </p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard' 
            ? pathname === '/dashboard' 
            : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-blue-700">
              {getAvatarInitial()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {getDisplayName()}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email || ''}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full mt-1 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
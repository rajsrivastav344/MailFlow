'use client';

import { useEffect, useState } from 'react';
import {
  Users, Send, Mail, TrendingUp, ArrowUpRight, Clock, CheckCircle2, XCircle, FileEdit, Activity,
} from 'lucide-react';
import { formatNumber, formatPercent, timeAgo, getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { dashboardApi } from '@/lib/api'; // ← use the shared api client

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold font-display text-slate-900 mt-2">{value}</p>
          {trend && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
              <ArrowUpRight className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse">
      <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-8 w-16 bg-slate-100 rounded" />
    </div>
  );
}

function CampaignStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'sent':      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'sending':   return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
    case 'failed':    return <XCircle className="w-4 h-4 text-red-500" />;
    case 'draft':     return <FileEdit className="w-4 h-4 text-slate-400" />;
    case 'scheduled': return <Clock className="w-4 h-4 text-amber-500" />;
    default:          return <Activity className="w-4 h-4 text-slate-400" />;
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardApi.getStats()           // ← single line replaces 20 lines of raw fetch
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to load dashboard</h3>
          <p className="text-slate-500">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Contacts',
      value: formatNumber(stats?.totalContacts ?? 0),
      icon: Users,
      trend: stats?.contactsGrowth ? `+${stats.contactsGrowth} this month` : undefined,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Campaigns',
      value: formatNumber(stats?.totalCampaigns ?? 0),
      icon: Send,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Emails Sent',
      value: formatNumber(stats?.totalEmailsSent ?? 0),
      icon: Mail,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Success Rate',
      value: formatPercent(stats?.successRate ?? 0),
      icon: TrendingUp,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back to your email campaign hub</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="font-display font-bold text-slate-900 text-lg">Recent Campaigns</h2>
            <p className="text-sm text-slate-500 mt-0.5">Your latest email campaigns and their performance</p>
          </div>
          <Link href="/dashboard/campaigns" className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
            View all
          </Link>
        </div>

        {!stats?.recentCampaigns?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-medium text-slate-900">No campaigns yet</p>
            <p className="text-sm text-slate-500 mt-1">Create your first campaign to get started</p>
            <Link href="/dashboard/campaigns/new" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all mt-5">
              <Mail className="w-4 h-4" />
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentCampaigns.map((campaign: any) => (
              <div key={campaign.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                <CampaignStatusIcon status={campaign.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {campaign.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{campaign.subject}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium capitalize',
                    getStatusColor(campaign.status)
                  )}>
                    {campaign.status}
                  </span>
                  <p className="text-xs text-slate-400 mt-1.5">{timeAgo(campaign.created_at)}</p>
                </div>
                {campaign.status === 'sent' && (
                  <div className="text-right shrink-0 hidden md:block min-w-[80px]">
                    <p className="text-sm font-semibold text-emerald-600">{formatNumber(campaign.sent_count)}</p>
                    <p className="text-xs text-slate-400">delivered</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
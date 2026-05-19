'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import {
  Plus, Send, Trash2, Pencil, X, Loader2, Eye, TestTube, Clock,
  CheckCircle2, XCircle, FileEdit,
} from 'lucide-react';
import { campaignsApi, contactsApi } from '@/lib/api';
import { campaignSchema, type CampaignSchema } from '@/lib/validations';
import { formatDateTime, getStatusColor, cn, timeAgo } from '@/lib/utils';
import { RichEditor } from '@/components/email/RichEditor';
import type { Campaign } from '@/types';

function StatusIcon({ status }: { status: Campaign['status'] }) {
  switch (status) {
    case 'sent': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'sending': return <Clock className="w-4 h-4 text-blue-500 animate-spin-slow" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'scheduled': return <Clock className="w-4 h-4 text-amber-500" />;
    default: return <FileEdit className="w-4 h-4 text-slate-400" />;
  }
}

function CampaignModal({
  campaign,
  groups,
  onClose,
}: {
  campaign: Campaign | null;
  groups: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<CampaignSchema>({
    resolver: zodResolver(campaignSchema),
    defaultValues: campaign ? {
      name: campaign.name,
      subject: campaign.subject,
      body: campaign.body,
      recipientGroup: campaign.recipient_group || '',
    } : {},
  });

  const mutation = useMutation({
    mutationFn: (data: CampaignSchema) => {
      // Map recipientGroup to recipient_group for backend
      const payload = {
        name: data.name,
        subject: data.subject,
        body: data.body,
        recipient_group: data.recipientGroup,
      };
      return campaign ? campaignsApi.update(campaign.id, payload) : campaignsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(campaign ? 'Campaign updated' : 'Campaign created');
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 backdrop-blur-sm animate-fade-in overflow-y-auto py-6 px-4">
      <div className="card w-full max-w-2xl shadow-modal animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <h2 className="font-display font-bold text-ink">{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Campaign Name</label>
            <input {...register('name')} className={cn('input', errors.name && 'border-red-300')} placeholder="e.g. Monthly Newsletter" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Email Subject</label>
            <input {...register('subject')} className={cn('input', errors.subject && 'border-red-300')} placeholder="e.g. Your Monthly Updates" />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Recipient Group</label>
            <select {...register('recipientGroup')} className="input">
              <option value="">All Contacts</option>
              {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Email Body</label>
            <Controller
              name="body"
              control={control}
              render={({ field }) => (
                <RichEditor value={field.value || ''} onChange={field.onChange} error={!!errors.body} />
              )}
            />
            {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : campaign ? 'Update' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SendModal({ campaign, groups, onClose }: { campaign: Campaign; groups: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [recipientGroup, setRecipientGroup] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [mode, setMode] = useState<'send' | 'test'>('send');

  const sendMutation = useMutation({
    mutationFn: () => campaignsApi.send(campaign.id, recipientGroup || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign sent!');
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send'),
  });

  const testMutation = useMutation({
    mutationFn: () => campaignsApi.sendTest(campaign.id, testEmail),
    onSuccess: () => {
      toast.success('Test email sent!');
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="card w-full max-w-md shadow-modal animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <h2 className="font-display font-bold text-ink">Send Campaign</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="p-3 bg-surface-50 rounded-lg">
            <p className="text-sm font-medium text-ink">{campaign.name}</p>
            <p className="text-xs text-ink-muted mt-0.5">{campaign.subject}</p>
          </div>

          <div className="flex rounded-lg border border-surface-200 overflow-hidden">
            {(['send', 'test'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn('flex-1 py-2 text-sm font-medium transition-colors capitalize',
                  mode === m ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface-50'
                )}
              >
                {m === 'send' ? 'Send to All' : 'Send Test'}
              </button>
            ))}
          </div>

          {mode === 'send' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Recipient Group</label>
                <select value={recipientGroup} onChange={(e) => setRecipientGroup(e.target.value)} className="input">
                  <option value="">All Contacts</option>
                  {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">This will send to all selected contacts. This action cannot be undone.</p>
              </div>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="btn-primary w-full justify-center"
              >
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Now</>}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Test Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="input"
                  placeholder="test@example.com"
                />
              </div>
              <button
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !testEmail}
                className="btn-secondary w-full justify-center"
              >
                {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><TestTube className="w-4 h-4" /> Send Test</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalCampaign, setModalCampaign] = useState<Campaign | null | 'new'>(null);
  const [sendCampaign, setSendCampaign] = useState<Campaign | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', page, statusFilter],
    queryFn: () => campaignsApi.getAll({ page, limit: 15, status: statusFilter || undefined }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: contactsApi.getGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id), // Changed to string
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const groups = groupsData?.groups?.map((g) => g.name) ?? [];
  const statuses = ['draft', 'scheduled', 'sending', 'sent', 'failed'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input w-auto text-sm py-1.5"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <button onClick={() => setModalCampaign('new')} className="btn-primary">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Campaigns list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-surface-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-surface-200 rounded" />
                  <div className="h-3 w-64 bg-surface-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="card flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center mb-4">
            <Send className="w-6 h-6 text-ink-faint" />
          </div>
          <p className="font-display font-bold text-ink">No campaigns yet</p>
          <p className="text-sm text-ink-muted mt-1">Create your first campaign to start sending</p>
          <button onClick={() => setModalCampaign('new')} className="btn-primary mt-5">
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((campaign) => (
            <div key={campaign.id} className="card p-5 hover:shadow-card-hover transition-shadow animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <StatusIcon status={campaign.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink truncate">{campaign.name}</h3>
                      <p className="text-sm text-ink-muted truncate mt-0.5">{campaign.subject}</p>
                    </div>
                    <span className={cn('badge shrink-0', getStatusColor(campaign.status))}>
                      {campaign.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-3 text-xs text-ink-faint">
                      {/* FIXED: Use created_at instead of createdAt */}
                      <span>{timeAgo(campaign.created_at)}</span>
                      {campaign.status === 'sent' && (
                        <>
                          <span>·</span>
                          {/* FIXED: Use sent_count instead of sentCount */}
                          <span className="text-emerald-600 font-medium">{campaign.sent_count} sent</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                      {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                        <>
                          <button
                            onClick={() => setSendCampaign(campaign)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                          >
                            <Send className="w-3 h-3" /> Send
                          </button>
                          <button
                            onClick={() => setModalCampaign(campaign)}
                            className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {campaign.status === 'sent' && (
                        <button
                          onClick={() => setSendCampaign(campaign)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors text-ink-muted"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Delete this campaign?')) deleteMutation.mutate(campaign.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-ink-muted hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs">Previous</button>
          <span className="text-sm text-ink-muted">Page {page} of {data.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary py-1.5 px-3 text-xs">Next</button>
        </div>
      )}

      {modalCampaign !== null && (
        <CampaignModal campaign={modalCampaign === 'new' ? null : modalCampaign} groups={groups} onClose={() => setModalCampaign(null)} />
      )}
      {sendCampaign && (
        <SendModal campaign={sendCampaign} groups={groups} onClose={() => setSendCampaign(null)} />
      )}
    </div>
  );
}
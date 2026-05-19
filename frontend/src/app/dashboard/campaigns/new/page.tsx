// frontend/app/dashboard/campaigns/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { campaignsApi } from '@/lib/api';
import { campaignSchema, type CampaignSchema } from '@/lib/validations';
import { cn } from '@/lib/utils';

export default function NewCampaignPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CampaignSchema>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      subject: '',
      body: '',
      recipientGroup: '',
    },
  });

  const onSubmit = async (data: CampaignSchema) => {
    setIsSubmitting(true);
    try {
      await campaignsApi.create({
        name: data.name,
        subject: data.subject,
        body: data.body,
        recipient_group: data.recipientGroup,
      });
      toast.success('Campaign created successfully!');
      router.push('/dashboard/campaigns');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
          <p className="text-slate-500 mt-1">Create a new email campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border p-6">
          <label className="block text-sm font-semibold mb-2">Campaign Name *</label>
          <input
            {...register('name')}
            className={cn('w-full rounded-xl border-2 px-4 py-3', errors.name && 'border-red-500')}
            placeholder="Summer Newsletter"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <label className="block text-sm font-semibold mb-2">Subject *</label>
          <input
            {...register('subject')}
            className={cn('w-full rounded-xl border-2 px-4 py-3', errors.subject && 'border-red-500')}
            placeholder="Your email subject"
          />
          {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <label className="block text-sm font-semibold mb-2">Recipient Group</label>
          <input
            {...register('recipientGroup')}
            className="w-full rounded-xl border-2 px-4 py-3"
            placeholder="All Contacts"
          />
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <label className="block text-sm font-semibold mb-2">Email Body *</label>
          <textarea
            {...register('body')}
            rows={10}
            className={cn('w-full rounded-xl border-2 px-4 py-3', errors.body && 'border-red-500')}
            placeholder="Write your email content here..."
          />
          {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/campaigns" className="px-6 py-2.5 rounded-xl border hover:bg-slate-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Create Campaign
          </button>
        </div>
      </form>
    </div>
  );
}
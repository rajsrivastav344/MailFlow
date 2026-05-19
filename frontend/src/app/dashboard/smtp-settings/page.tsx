// frontend/app/dashboard/settings/smtp/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Server, TestTube, Save, Loader2, Eye, EyeOff, CheckCircle2, Mail, User } from 'lucide-react';
import { smtpApi } from '@/lib/api';
import { smtpSchema, type SmtpSchema } from '@/lib/validations';
import { cn } from '@/lib/utils';

export default function SmtpSettingsPage() {
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSuccess, setTestSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['smtp-config'],
    queryFn: smtpApi.getConfig,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<SmtpSchema>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      from_name: '',
      from_email: '',
    },
  });

  useEffect(() => {
    if (data?.config) {
      reset({
        host: data.config.host || '',
        port: data.config.port || 587,
        secure: data.config.secure || false,
        user: data.config.user || '',
        pass: data.config.pass || '',
        from_name: data.config.from_name || '',
        from_email: data.config.from_email || '',
      });
    }
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SmtpSchema) => {
      const backendPayload = {
        host: payload.host,
        port: payload.port,
        secure: payload.secure,
        user: payload.user,
        pass: payload.pass,
        from_email: payload.from_email,
        from_name: payload.from_name,
        name: "Default SMTP Config",
        isDefault: true,
      };
      return smtpApi.saveConfig(backendPayload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['smtp-config'] });
      toast.success('SMTP settings saved successfully!');
    },
    onError: (err) => {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save SMTP settings');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      // Get current form values
      const host = (document.querySelector('[name="host"]') as HTMLInputElement)?.value;
      const port = (document.querySelector('[name="port"]') as HTMLInputElement)?.value;
      const secure = (document.querySelector('[name="secure"]') as HTMLInputElement)?.checked;
      const user = (document.querySelector('[name="user"]') as HTMLInputElement)?.value;
      const pass = (document.querySelector('[name="pass"]') as HTMLInputElement)?.value;
      
      if (!host || !user || !pass) {
        throw new Error('Please fill in all SMTP settings before testing');
      }
      
      return smtpApi.testConfig(testEmail, { host, port: parseInt(port), secure, user, pass });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Test email sent successfully!');
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    },
    onError: (err) => {
      console.error('Test error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-100 rounded mb-4" />
          <div className="space-y-3">
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900">SMTP Settings</h1>
        <p className="text-slate-500 mt-1">Configure your email server settings</p>
      </div>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
        {/* Server Settings Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">Server Configuration</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register('host')} 
                  type="text"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition',
                    errors.host ? 'border-red-300' : 'border-slate-200'
                  )} 
                  placeholder="smtp.gmail.com" 
                />
                {errors.host && <p className="text-red-500 text-xs mt-1">{errors.host.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Port <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register('port', { valueAsNumber: true })} 
                  type="number" 
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition',
                    errors.port ? 'border-red-300' : 'border-slate-200'
                  )} 
                  placeholder="587" 
                />
                {errors.port && <p className="text-red-500 text-xs mt-1">{errors.port.message}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input 
                {...register('secure')} 
                type="checkbox" 
                id="secure" 
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
              />
              <label htmlFor="secure" className="text-sm font-medium text-slate-700 cursor-pointer">
                Use SSL/TLS
              </label>
              <span className="text-xs text-slate-500">(Enable for port 465, disable for port 587)</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username / Email <span className="text-red-500">*</span>
              </label>
              <input 
                {...register('user')}
                type="email"
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition',
                  errors.user ? 'border-red-300' : 'border-slate-200'
                )} 
                placeholder="your-email@gmail.com" 
              />
              {errors.user && <p className="text-red-500 text-xs mt-1">{errors.user.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password / App Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('pass')}
                  type={showPassword ? 'text' : 'password'}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition pr-10',
                    errors.pass ? 'border-red-300' : 'border-slate-200'
                  )}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.pass && <p className="text-red-500 text-xs mt-1">{errors.pass.message}</p>}
            </div>
          </div>
        </div>

        {/* Sender Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">Sender Identity</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                From Name <span className="text-red-500">*</span>
              </label>
              <input 
                {...register('from_name')}
                type="text"
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition',
                  errors.from_name ? 'border-red-300' : 'border-slate-200'
                )} 
                placeholder="Your Company Name" 
              />
              {errors.from_name && <p className="text-red-500 text-xs mt-1">{errors.from_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                From Email <span className="text-red-500">*</span>
              </label>
              <input 
                {...register('from_email')}
                type="email" 
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition',
                  errors.from_email ? 'border-red-300' : 'border-slate-200'
                )} 
                placeholder="noreply@yourcompany.com" 
              />
              {errors.from_email && <p className="text-red-500 text-xs mt-1">{errors.from_email.message}</p>}
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || !isDirty} 
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
      </form>

      {/* Test SMTP Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Test Connection</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              placeholder="recipient@example.com"
            />
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !testEmail}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors',
                testSuccess
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testSuccess ? (
                <><CheckCircle2 className="w-4 h-4" /> Sent!</>
              ) : (
                <><TestTube className="w-4 h-4" /> Send Test</>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            A test email will be sent to verify your SMTP configuration
          </p>
        </div>
      </div>
    </div>
  );
}
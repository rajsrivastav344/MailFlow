// frontend/app/dashboard/settings/page.tsx
'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Lock, Loader2, User as UserIcon, Shield, Mail } from 'lucide-react';
import { authApi } from '@/lib/api';
import { changePasswordSchema, type ChangePasswordSchema } from '@/lib/validations';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuth();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordSchema) => authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to change password'),
  });

  const getUserName = () => {
    return user?.name || user?.email?.split('@')[0] || 'User';
  };

  const getAvatarInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Profile Info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-display font-bold text-slate-900 text-lg">Profile Information</h2>
            <p className="text-sm text-slate-500">Your account details and settings</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-3xl font-bold text-white font-display">
                {getAvatarInitial()}
              </span>
            </div>
            
            <div className="flex-1">
              <p className="text-xl font-semibold text-slate-900">{getUserName()}</p>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                  <Shield className="w-3 h-3" />
                  Active Account
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/30 to-white">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-display font-bold text-slate-900 text-lg">Change Password</h2>
            <p className="text-sm text-slate-500">Update your account password to keep it secure</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
            <input
              {...register('currentPassword')}
              type="password"
              className={cn(
                'w-full rounded-xl border-2 bg-white px-4 py-3 text-sm',
                'transition-all duration-200 outline-none',
                'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
                errors.currentPassword 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-slate-200 hover:border-slate-300'
              )}
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
            {errors.currentPassword && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
            <input
              {...register('newPassword')}
              type="password"
              className={cn(
                'w-full rounded-xl border-2 bg-white px-4 py-3 text-sm',
                'transition-all duration-200 outline-none',
                'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
                errors.newPassword 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-slate-200 hover:border-slate-300'
              )}
              placeholder="Enter new password (min. 8 characters)"
              autoComplete="new-password"
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
            <input
              {...register('confirmPassword')}
              type="password"
              className={cn(
                'w-full rounded-xl border-2 bg-white px-4 py-3 text-sm',
                'transition-all duration-200 outline-none',
                'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
                errors.confirmPassword 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-slate-200 hover:border-slate-300'
              )}
              placeholder="Confirm your new password"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><Lock className="w-4 h-4" /> Update Password</>
            )}
          </button>
        </form>
      </div>

      {/* Security Tips */}
      <div className="bg-gradient-to-r from-blue-50/50 to-emerald-50/50 rounded-2xl border border-blue-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2">Security Best Practices</p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Use a strong, unique password with at least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Never share your credentials with anyone
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Sign out of shared devices after each session
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Enable two-factor authentication for added security (coming soon)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
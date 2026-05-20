// frontend/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, BarChart3, Users, Send, Shield, Zap, Target } from 'lucide-react';
import { loginSchema, type LoginSchema } from '@/lib/validations';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchema) => {
    setIsSubmitting(true);
    
    // Get API URL from environment variable
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mailflow-backend-tgjz.onrender.com';
    const BASE_URL = `${API_URL}/api`;
    
    console.log('📡 Logging in to:', `${BASE_URL}/auth/login`);
    
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();
      console.log('📦 Login response:', result);

      if (response.ok && result.success) {
        // Store token in localStorage or cookie
        if (result.token) {
          localStorage.setItem('auth_token', result.token);
          document.cookie = `auth_token=${result.token}; path=/; max-age=604800`; // 7 days
        }
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        toast.error(result.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.1) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }} 
          />
          
          {/* Floating orbs */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-float" />
          <div className="absolute bottom-32 right-20 w-3 h-3 bg-blue-300 rounded-full animate-float delay-700" />
          <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-500 rounded-full animate-float delay-300" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white tracking-tight">MailFlow</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="font-display text-5xl font-bold text-white leading-tight">
              Send smarter,
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
                reach farther.
              </span>
            </h1>
            <p className="text-slate-300/80 text-lg leading-relaxed max-w-md">
              The all-in-one email marketing platform that helps you connect with your audience and grow your business.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: Send, label: 'Emails Sent', value: '10M+', change: '+25%' },
              { icon: Target, label: 'Delivery Rate', value: '99.2%', change: '+2.1%' },
              { icon: Users, label: 'Active Users', value: '5K+', change: '+18%' },
            ].map((stat) => (
              <div key={stat.label} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/0 rounded-xl blur-xl group-hover:blur-2xl transition-all" />
                <div className="relative bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                  <stat.icon className="w-4 h-4 text-blue-400 mb-2" />
                  <div className="text-2xl font-bold text-white font-display">{stat.value}</div>
                  <div className="text-xs text-blue-300/80 mt-0.5">{stat.label}</div>
                  <div className="text-[10px] text-emerald-400/80 mt-1">{stat.change}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Features List */}
          <div className="flex flex-wrap gap-4 pt-4">
            {[
              { icon: Zap, text: 'Lightning Fast' },
              { icon: Shield, text: 'Secure Delivery' },
              { icon: BarChart3, text: 'Analytics' },
            ].map((feature) => (
              <div key={feature.text} className="flex items-center gap-2 text-slate-300/80 text-sm">
                <feature.icon className="w-3.5 h-3.5 text-blue-400" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-slate-400/60 text-sm">
          © 2025 MailFlow. All rights reserved.
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">MailFlow</span>
          </div>

          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="font-display text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-2">Sign in to your account to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className={cn(
                    'w-full rounded-xl border-2 bg-white/50 backdrop-blur-sm px-4 py-3 pl-10 text-sm',
                    'transition-all duration-200 outline-none',
                    'focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
                    errors.email 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-xl border-2 bg-white/50 backdrop-blur-sm px-4 py-3 pl-10 text-sm',
                    'transition-all duration-200 outline-none',
                    'focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                  autoComplete="current-password"
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-12 text-base font-semibold rounded-xl transition-all duration-300',
                'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
                'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
                'disabled:opacity-80 disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link 
                href="/register" 
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline underline-offset-4 transition-all"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Demo Note */}
          <div className="mt-6 p-4 bg-amber-50/50 rounded-xl border border-amber-200/50">
            <p className="text-xs text-amber-800/80 text-center">
              🔐 Demo credentials: demo@mailflow.com / demo123
            </p>
          </div>

          {/* Footer Note */}
          <p className="text-center text-slate-400 text-xs mt-8">
            Need help? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import type { User } from '@/types';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = useCallback(async () => {
    const token = Cookies.get('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      Cookies.remove('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // ✅ Add redirect logic but avoid loops
  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;
    
    const isPublicRoute = pathname === '/login' || pathname === '/register';
    
    // Redirect authenticated users away from login/register
    if (user && isPublicRoute) {
      router.replace('/dashboard'); // Use replace instead of push
    }
    // Redirect unauthenticated users to login (except on public routes)
    else if (!user && !isPublicRoute && pathname !== '/') {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

 const login = async (email: string, password: string) => {
  console.log('🔐 Login attempt with:', { email, password: '***' });
  
  try {
    const res = await authApi.login(email, password);
    console.log('📦 Login response:', res);
    
    if (res.token) {
      Cookies.set('auth_token', res.token, { expires: 7, sameSite: 'strict' });
      setUser(res.user);
      console.log('✅ Login successful');
    } else {
      console.log('❌ No token in response');
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      Cookies.remove('auth_token');
      setUser(null);
      router.replace('/login'); // Use replace instead of href
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
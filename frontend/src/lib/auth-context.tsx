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
      // ✅ Use the correct endpoint: /user/info
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid
        Cookies.remove('auth_token');
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      Cookies.remove('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Redirect logic to avoid loops
  useEffect(() => {
    if (isLoading) return;
    
    const isPublicRoute = pathname === '/login' || pathname === '/register';
    
    if (user && isPublicRoute) {
      router.replace('/dashboard');
    } else if (!user && !isPublicRoute && pathname !== '/') {
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
      router.replace('/login');
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
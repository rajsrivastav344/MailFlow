'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mailflow-backend-tgjz.onrender.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = useCallback(async () => {
    // ✅ Fix: Convert null to undefined using ?? undefined
    let token: string | undefined = Cookies.get('auth_token') ?? undefined;
    if (!token) {
      token = localStorage.getItem('token') ?? undefined;
    }
    
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          console.log('✅ User authenticated:', data.user.email);
        } else {
          Cookies.remove('auth_token');
          localStorage.removeItem('token');
        }
      } else {
        Cookies.remove('auth_token');
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      Cookies.remove('auth_token');
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;
    
    const isPublicRoute = pathname === '/login' || pathname === '/register';
    
    if (user && isPublicRoute) {
      router.replace('/dashboard');
    } else if (!user && !isPublicRoute && pathname !== '/' && pathname !== '/_not-found') {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    console.log('🔐 Login attempt with:', { email });
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      console.log('📦 Login response:', result);

      if (response.ok && result.success && result.token) {
        // ✅ Store token safely
        localStorage.setItem('token', result.token);
        Cookies.set('auth_token', result.token, { expires: 7, sameSite: 'strict' });
        
        if (result.user) {
          setUser(result.user);
        }
        
        console.log('✅ Login successful');
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token') ?? undefined;
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
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
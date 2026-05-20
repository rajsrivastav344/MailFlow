// frontend/lib/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>; // ← added
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mailflow-backend-tgjz.onrender.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('token');

    console.log('🔍 AuthContext - Token found:', !!token);

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 AuthContext - Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          console.log('✅ AuthContext - User loaded:', data.user.email);
        } else {
          localStorage.removeItem('token');
        }
      } else if (response.status === 401) {
        console.log('🔍 Token invalid, clearing');
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = pathname === '/login' || pathname === '/register';

    console.log('🔀 Redirect check:', { user: !!user, isLoading, pathname });

    if (user && isPublicRoute) {
      console.log('➡️ Redirecting to /dashboard');
      router.replace('/dashboard');
    } else if (!user && !isPublicRoute && pathname !== '/' && pathname !== '/_not-found') {
      console.log('➡️ Redirecting to /login');
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    console.log('🔐 Login attempt:', { email });

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      console.log('📦 Login response:', { success: result.success, hasToken: !!result.token });

      if (response.ok && result.success && result.token) {
        localStorage.setItem('token', result.token);
        await fetchMe(); // ← replaces setUser(result.user); ensures fresh user + triggers redirect
        console.log('✅ Login successful, token saved');
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const result = await response.json();

    if (response.status === 409) {
      throw new Error('An account with this email already exists.');
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Registration failed');
    }

    // Auto-login after successful registration → fetchMe → redirect
    await login(email, password);
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('token');
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
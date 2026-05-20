'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mailflow-backend-tgjz.onrender.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false); // ← prevents concurrent/repeated fetchMe calls
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = useCallback(async () => {
    if (isFetchingRef.current) return; // ← guard: already in-flight, skip
    isFetchingRef.current = true;

    const token = localStorage.getItem('token');

    if (!token) {
      setIsLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false; // ← release guard
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

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
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.token) {
        localStorage.setItem('token', result.token);
        isFetchingRef.current = false; // ← reset guard so fetchMe can run fresh
        await fetchMe();
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
// frontend/lib/api.ts
import Cookies from 'js-cookie';
import type { 
  User, 
  Contact, 
  ContactGroup, 
  CreateContactPayload,
  PaginatedResponse,
  Campaign,
  CreateCampaignPayload,
  SmtpConfig,
  DashboardStats
} from '@/types';

// Use environment variable for API URL, fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mailflow-backend-tgjz.onrender.com';
const BASE_URL = `${API_URL}/api`;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Try to get token from localStorage first
  let token: string | undefined;
  
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token');
    token = storedToken !== null ? storedToken : undefined;
  }
  
  // Fallback to cookie if not in localStorage
  if (!token) {
    const cookieToken = Cookies.get('auth_token');
    token = cookieToken !== undefined ? cookieToken : undefined;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    // Clear tokens on 401
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    Cookies.remove('auth_token');
    
    // Don't redirect if already on login page to avoid loops
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Unauthorized');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.message || data.error || 'An error occurred');
  }

  return data as T;
}

// =====================
// Auth API
// =====================
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; token?: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ success: boolean; token?: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// =====================
// Contacts API
// =====================
export const contactsApi = {
  getAll: (params?: { page?: number; limit?: number; group?: string; search?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString();
    return request<PaginatedResponse<Contact>>(`/contacts${qs ? `?${qs}` : ''}`);
  },

  getGroups: () =>
    request<{ groups: ContactGroup[] }>('/contacts/groups'),

  create: (payload: CreateContactPayload) =>
    request<{ success: boolean; contact: Contact }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<CreateContactPayload>) =>
    request<{ success: boolean; contact: Contact }>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/contacts/${id}`, { method: 'DELETE' }),

  importCsv: async (formData: FormData) => {
    let token: string | undefined;
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      token = storedToken !== null ? storedToken : undefined;
    }
    const response = await fetch(`${BASE_URL}/contacts/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      credentials: 'include',
    });
    return response.json();
  },

  exportCsv: () =>
    fetch(`${BASE_URL}/contacts/export/csv`, {
      headers: {
        Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
      },
      credentials: 'include',
    }),
};

// =====================
// Campaigns API
// =====================
export const campaignsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString();
    return request<PaginatedResponse<Campaign>>(`/campaigns${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) =>
    request<{ data: Campaign }>(`/campaigns/${id}`),

  create: (payload: CreateCampaignPayload) =>
    request<{ success: boolean; data: Campaign }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        subject: payload.subject,
        body: payload.body,
        recipient_group: payload.recipient_group,
        scheduled_at: payload.scheduled_at,
      }),
    }),

  update: (id: string, payload: Partial<CreateCampaignPayload>) =>
    request<{ success: boolean; data: Campaign }>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name,
        subject: payload.subject,
        body: payload.body,
        recipient_group: payload.recipient_group,
        scheduled_at: payload.scheduled_at,
      }),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/campaigns/${id}`, { method: 'DELETE' }),

  send: (id: string, recipientGroup?: string) =>
    request<{ success: boolean; message: string }>(`/campaigns/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ recipient_group: recipientGroup }),
    }),

  sendTest: (id: string, testEmail: string) =>
    request<{ success: boolean; message: string }>(`/campaigns/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ test_email: testEmail }),
    }),
};

// =====================
// SMTP API
// =====================
export const smtpApi = {
  getConfig: () =>
    request<{ config: SmtpConfig }>('/config/smtp'),

  saveConfig: (payload: any) =>
    request<{ success: boolean; config?: SmtpConfig }>('/config/smtp', {
      method: 'POST',
      body: JSON.stringify({
        host: payload.host,
        port: payload.port,
        secure: payload.secure,
        user: payload.user,
        pass: payload.pass,
        fromEmail: payload.from_email || payload.fromEmail,
        fromName: payload.from_name || payload.fromName,
        name: payload.name || "Default SMTP Config",
        isDefault: payload.isDefault !== undefined ? payload.isDefault : true,
      }),
    }),

  setDefault: (configId: string) =>
    request<{ success: boolean }>(`/config/smtp/${configId}/default`, {
      method: 'PUT',
    }),

  deleteConfig: (configId: string) =>
    request<{ success: boolean }>(`/config/smtp/${configId}`, {
      method: 'DELETE',
    }),

  testConfig: (email: string, smtpSettings?: any) => {
    const payload = smtpSettings ? { email, ...smtpSettings } : { email };
    return request<{ success: boolean; message: string }>('/config/smtp/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// =====================
// Dashboard API
// =====================
export const dashboardApi = {
  getStats: () =>
    request<DashboardStats>('/dashboard/stats'),
};

// =====================
// Reports API
// =====================
export const reportsApi = {
  getCampaignStats: (campaignId: string) =>
    request<{ data: any }>(`/report/campaign/${campaignId}`),

  getGlobalStats: () =>
    request<{ data: any }>('/report/stats'),

  getDeliveryStats: () =>
    request<{ data: any }>('/report/delivery'),
};

export { ApiError };
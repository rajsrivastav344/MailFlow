// src/types.ts

// =====================
// Auth Types
// =====================
export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;  
  last_login?: string;
  is_active?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface LoginPayload {
  email: string;  // Changed from username to email
  password: string;
}

// =====================
// Contact Types (Matching Backend)
// =====================
export interface Contact {
  id: string;              // Backend returns string like "cont_123456_abc"
  user_id: string;
  name: string;
  email: string;
  group_name: string | null;  // Changed from 'group' to 'group_name'
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;      // Changed from createdAt
  updated_at: string;      // Changed from updatedAt
}

export interface ContactGroup {
  name: string;
  count: number;
}

export interface CreateContactPayload {
  name: string;
  email: string;
  group_name?: string;     // Changed from 'group' to 'group_name'
  phone?: string;
  company?: string;
  notes?: string;
}

export interface ImportContactsPayload {
  contacts: CreateContactPayload[];
}

// =====================
// Campaign Types (Matching Backend)
// =====================
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface Campaign {
  id: string;              // Backend returns string like "camp_123456"
  user_id: string;
  name: string;
  subject: string;
  body: string;
  recipient_group: string | null;  // Changed from recipientGroup
  status: CampaignStatus;
  sent_count: number;      // Changed from sentCount
  open_count: number;
  click_count: number;
  scheduled_at: string | null;     // Changed from scheduledAt
  sent_at: string | null;
  created_at: string;      // Changed from createdAt
  updated_at: string;
}

export interface CreateCampaignPayload {
  name: string;
  subject: string;
  body: string;
  recipient_group?: string;  // Changed from recipientGroup
  scheduled_at?: string;     // Changed from scheduledAt
}

export interface SendCampaignPayload {
  campaignId: string;      // Changed from number to string
  recipientGroup?: string;
  testEmail?: string;
}

// =====================
// SMTP Types (Matching Backend)
// =====================
export interface SmtpConfig {
  id?: string;
  user_id?: string;
  name?: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;            // Backend uses 'user' not 'username'
  pass: string;            // Backend uses 'pass' not 'password'
  from_email: string;      // Changed from fromEmail
  from_name: string;       // Changed from fromName
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SmtpTestPayload {
  email: string;
}

// =====================
// Dashboard Types
// =====================
export interface DashboardStats {
  totalContacts: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  successRate: number;
  recentCampaigns: Campaign[];
  contactsGrowth: number;
}

// =====================
// API Response Types
// =====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;        // Backend includes this
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =====================
// Form State
// =====================
export interface FormState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

// =====================
// Legacy/Compatibility Types (for existing components)
// =====================
// These help transition old code that expects camelCase
export type LegacyContact = Omit<Contact, 'group_name' | 'created_at' | 'updated_at'> & {
  group?: string;
  createdAt?: string;
  updatedAt?: string;
};
// src/types.ts

// ==================== Contact Types (Updated for your backend) ====================
export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  group_name: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactPayload {
  name: string;
  email: string;
  group_name?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export interface ContactGroup {
  name: string;
  count: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== Dashboard Types ====================
export interface DashboardStats {
  totalContacts: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  successRate: number;
  contactsGrowth?: number;
  recentCampaigns?: Campaign[];
}

// ==================== Campaign Types ====================
export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  recipient_group: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sent_count: number;
  open_count: number;
  click_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  // Frontend convenience fields (optional)
  createdAt?: string;  // For compatibility with existing components
  sentCount?: number;  // For compatibility
}

export interface CreateCampaignPayload {
  name: string;
  subject: string;
  body: string;
  recipient_group?: string;
  scheduled_at?: string;
}

// ==================== SMTP Types ====================
export interface SmtpConfig {
  id?: string;
  name?: string;
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  user?: string;
  password?: string;
  pass?: string;
  fromName?: string;
  from_name?: string;
  fromEmail?: string;
  from_email?: string;
  isDefault?: boolean;
}

// ==================== User Types ====================
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

// ==================== Legacy Types (Keep for compatibility with existing code) ====================
export interface EmailLog {
  id: string;
  email: string;
  status: "Sent" | "Failed" | "Error";
  message?: string;
  timestamp: string;
  messageId?: string;
  firstName?: string;
  company?: string;
  subject?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailJob {
  contacts: Contact[];
  htmlContent: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  config: EmailConfig;
  delay: number;
}

export interface SMTPDefaults {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface BatchConfig {
  batchSize: number;
  emailDelay: number;
  batchDelay: number;
  enabled: boolean;
}

export interface BatchJob {
  id: string;
  totalContacts: number;
  currentBatch: number;
  totalBatches: number;
  emailsSent: number;
  emailsFailed: number;
  status: 'Running' | 'Paused' | 'Completed' | 'Failed';
  startTime: string;
  config: BatchConfig;
  emailJob: EmailJob;
  nextBatchTime?: string;
  notificationSettings?: {
    email: string;
    userId: string;
    configName?: string;
  };
  userId?: string;
  configName?: string;
}

export interface BatchStatus {
  isRunning: boolean;
  currentJob: BatchJob | null;
  totalJobs: number;
  completedJobs: number;
}

export interface ScheduledJob {
  id: string;
  userId: string;
  emailJob: EmailJob;
  batchConfig?: BatchConfig;
  scheduledTime: string;
  notifyEmail?: string;
  notifyBrowser?: boolean;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  contactCount: number;
  subject: string;
  useBatch: boolean;
  configName?: string;
}

export interface NotificationSettings {
  email?: string;
  browser?: boolean;
  userId?: string;
  configName?: string;
}

export interface NotificationConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
}

export interface ProviderLimits {
  dailyLimit: number;
  name: string;
  recommendedBatchSize: number;
  recommendedDelay: number;
}
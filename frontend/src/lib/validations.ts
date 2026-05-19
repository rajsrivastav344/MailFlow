// frontend/lib/validations.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  group: z.string().optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Email content is required'),
  recipientGroup: z.string().optional(),
  scheduled_at: z.string().optional(),
});

// Updated SMTP Schema to match backend
export const smtpSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  user: z.string().min(1, 'Username is required'),
  pass: z.string().min(1, 'Password is required'),
  from_name: z.string().min(1, 'From name is required'),  // Added from_name
  from_email: z.string().email('Invalid from email'),    // Added from_email
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Export types
export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type ContactSchema = z.infer<typeof contactSchema>;
export type CampaignSchema = z.infer<typeof campaignSchema>;
export type SmtpSchema = z.infer<typeof smtpSchema>;
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
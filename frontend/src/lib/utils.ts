// frontend/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined | null) {
  if (!date) return 'N/A';
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date | undefined | null) {
  if (!date) return 'N/A';
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function timeAgo(date: string | Date | undefined | null) {
  if (!date) return 'Never';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatNumber(n: number | undefined | null) {
  if (!n && n !== 0) return '0';
  return new Intl.NumberFormat().format(n);
}

export function formatPercent(n: number | undefined | null) {
  if (!n && n !== 0) return '0%';
  return `${Math.round(n)}%`;
}

export function truncate(str: string | undefined | null, length: number) {
  if (!str) return '';
  return str.length > length ? `${str.slice(0, length)}...` : str;
}

export function getStatusColor(status: string) {
  const statusMap: Record<string, string> = {
    sent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    sending: 'text-blue-700 bg-blue-50 border-blue-200',
    scheduled: 'text-amber-700 bg-amber-50 border-amber-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
    draft: 'text-slate-700 bg-slate-50 border-slate-200',
    pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    completed: 'text-green-700 bg-green-50 border-green-200',
    cancelled: 'text-gray-700 bg-gray-50 border-gray-200',
  };
  return statusMap[status] || statusMap.draft;
}

export function getStatusBadgeColor(status: string) {
  const badgeMap: Record<string, string> = {
    sent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sending: 'bg-blue-100 text-blue-800 border-blue-200',
    scheduled: 'bg-amber-100 text-amber-800 border-amber-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    draft: 'bg-slate-100 text-slate-800 border-slate-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return badgeMap[status] || badgeMap.draft;
}

// Fixed debounce function with more flexible typing
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Alternative: Simple debounce for common use cases
export function simpleDebounce(fn: (value: string) => void, delay: number) {
  let timer: NodeJS.Timeout | undefined;
  return (value: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(value), delay);
  };
}

// Throttle function for rate limiting
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// Copy to clipboard utility
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

// Download file utility
export function downloadFile(content: string | Blob, filename: string, type?: string) {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: type || 'text/plain' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate random ID
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Capitalize first letter
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Parse error message from API response
export function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
}
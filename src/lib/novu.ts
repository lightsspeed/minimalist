/**
 * Novu notification client configuration and utilities
 * Reference: https://github.com/novuhq/novu
 */

import { Task } from '@/hooks/useTasks';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '';

export interface NovuConfig {
  applicationIdentifier: string;
  apiKey?: string;
  workflowId: string;
  thresholdHours: number; // e.g. 24 hours before due date
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  emailNotificationsEnabled: boolean;
  targetEmail: string;
}

const STORAGE_KEY = 'minimalist_novu_config';

export const DEFAULT_NOVU_CONFIG: NovuConfig = {
  applicationIdentifier: (import.meta.env.VITE_NOVU_APP_IDENTIFIER as string) || '',
  apiKey: (import.meta.env.VITE_NOVU_API_KEY as string) || '',
  workflowId: 'task-due-alert',
  thresholdHours: 24, // Trigger alerts for tasks due within 24 hours
  browserNotificationsEnabled: true,
  soundEnabled: true,
  emailNotificationsEnabled: true,
  targetEmail: '',
};

export function getNovuConfig(): NovuConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_NOVU_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to read Novu config from localStorage:', e);
  }
  return DEFAULT_NOVU_CONFIG;
}

export function saveNovuConfig(config: Partial<NovuConfig>): NovuConfig {
  const current = getNovuConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save Novu config:', e);
  }
  return updated;
}

/**
 * Request permission for Desktop Web Notifications
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

/**
 * Trigger an In-Browser Desktop Notification
 */
export function sendBrowserDueNotification(title: string, body: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      silent: false,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (e) {
    console.error('Error showing browser notification:', e);
  }
}

/**
 * Send an Email Due Notification
 * Primary path: Supabase Edge Function (send-email) via Resend
 * Secondary path: Novu Cloud API (if apiKey configured)
 * Fallback: log to localStorage with a clear "not sent" notice
 */
export async function sendEmailDueNotification(
  task: Task,
  recipientEmail: string,
  timeLabel: string
): Promise<{ success: boolean; message: string; realEmailSent?: boolean }> {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { success: false, message: 'Invalid recipient email address' };
  }

  const config = getNovuConfig();

  // --- Path 1: Supabase Edge Function (Resend) ---
  if (SUPABASE_URL) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: recipientEmail,
          taskTitle: task.title,
          taskDescription: task.description || '',
          dueDate: task.due_date,
          timeLabel,
          appUrl: window.location.origin,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        logEmailDispatchEvent({
          taskId: task.id,
          taskTitle: task.title,
          email: recipientEmail,
          timeLabel,
          sentAt: new Date().toISOString(),
          provider: 'resend',
        });
        return {
          success: true,
          realEmailSent: true,
          message: `Email sent to ${recipientEmail} via Resend`,
        };
      }

      // If RESEND_API_KEY not configured in Supabase, fall through
      if (data.error && data.error.includes('RESEND_API_KEY')) {
        console.warn('Resend not configured:', data.error);
        // fall through to Novu or local log
      } else {
        return {
          success: false,
          realEmailSent: false,
          message: data.error || 'Email delivery failed',
        };
      }
    } catch (err) {
      console.warn('send-email edge function unavailable:', err);
    }
  }

  // --- Path 2: Novu Cloud API (optional, if apiKey configured) ---
  if (config.apiKey) {
    try {
      const response = await fetch('https://api.novu.co/v1/events/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${config.apiKey}`,
        },
        body: JSON.stringify({
          name: config.workflowId || 'task-due-alert',
          to: {
            subscriberId: task.user_id || 'user',
            email: recipientEmail,
          },
          payload: {
            taskTitle: task.title,
            taskDescription: task.description || '',
            dueDate: task.due_date,
            timeLabel,
            appUrl: window.location.origin,
          },
        }),
      });

      if (response.ok) {
        logEmailDispatchEvent({
          taskId: task.id,
          taskTitle: task.title,
          email: recipientEmail,
          timeLabel,
          sentAt: new Date().toISOString(),
          provider: 'novu',
        });
        return {
          success: true,
          realEmailSent: true,
          message: `Novu email dispatched to ${recipientEmail} for "${task.title}"`,
        };
      }
    } catch (err) {
      console.warn('Novu API dispatch failed:', err);
    }
  }

  // --- Fallback: no real email backend configured ---
  return {
    success: false,
    realEmailSent: false,
    message: 'Email not sent: RESEND_API_KEY not set in Supabase secrets. See setup instructions.',
  };
}

/**
 * Log email dispatch history in localStorage
 */
function logEmailDispatchEvent(event: {
  taskId: string;
  taskTitle: string;
  email: string;
  timeLabel: string;
  sentAt: string;
  provider?: string;
}) {
  try {
    const raw = localStorage.getItem('minimalist_email_dispatches') || '[]';
    const list = JSON.parse(raw);
    list.unshift(event);
    localStorage.setItem('minimalist_email_dispatches', JSON.stringify(list.slice(0, 30)));
  } catch (e) {
    console.error('Failed to log email dispatch event:', e);
  }
}

/**
 * Play a gentle alert sound for due task notifications
 */
export function playDueAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore audio context error if browser blocks autoplay
  }
}

/**
 * Notification utilities for Minimalist
 * Email delivery: EmailJS (browser-native, no backend needed)
 * Reference: https://www.emailjs.com/docs/
 */

import { Task } from '@/hooks/useTasks';
import emailjs from '@emailjs/browser';

export interface NovuConfig {
  applicationIdentifier: string;
  apiKey?: string;
  workflowId: string;
  thresholdHours: number;
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  emailNotificationsEnabled: boolean;
  targetEmail: string;
  // EmailJS credentials (no backend needed)
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string;
}

const STORAGE_KEY = 'minimalist_novu_config';

export const DEFAULT_NOVU_CONFIG: NovuConfig = {
  applicationIdentifier: (import.meta.env.VITE_NOVU_APP_IDENTIFIER as string) || '',
  apiKey: (import.meta.env.VITE_NOVU_API_KEY as string) || '',
  workflowId: 'task-due-alert',
  thresholdHours: 24,
  browserNotificationsEnabled: true,
  soundEnabled: true,
  emailNotificationsEnabled: true,
  targetEmail: '',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailjsPublicKey: '',
};

export function getNovuConfig(): NovuConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_NOVU_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to read config from localStorage:', e);
  }
  return DEFAULT_NOVU_CONFIG;
}

export function saveNovuConfig(config: Partial<NovuConfig>): NovuConfig {
  const current = getNovuConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
  return updated;
}

/**
 * Returns true if EmailJS is fully configured
 */
export function isEmailJsConfigured(): boolean {
  const c = getNovuConfig();
  return !!(c.emailjsServiceId && c.emailjsTemplateId && c.emailjsPublicKey);
}

/**
 * Request permission for Desktop Web Notifications
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/**
 * Trigger an in-browser desktop notification
 */
export function sendBrowserDueNotification(title: string, body: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
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
 * Send an email due-date alert via EmailJS (pure browser, no backend)
 *
 * Setup:
 *  1. Create a free account at https://emailjs.com
 *  2. Add an Email Service (Gmail, Outlook, etc.)
 *  3. Create an Email Template with variables:
 *       {{to_email}}, {{task_title}}, {{time_label}}, {{due_date}}, {{app_url}}
 *  4. Paste Service ID, Template ID, Public Key into Notification Settings
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

  // --- Path 1: EmailJS (no backend needed) ---
  if (config.emailjsServiceId && config.emailjsTemplateId && config.emailjsPublicKey) {
    try {
      const dueDateStr = task.due_date
        ? new Date(task.due_date).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Not set';

      const templateParams = {
        to_email: recipientEmail,
        to_name: recipientEmail.split('@')[0],
        task_title: task.title,
        task_description: task.description || 'No description',
        time_label: timeLabel,
        due_date: dueDateStr,
        app_url: window.location.origin,
        urgency: timeLabel.toLowerCase().includes('overdue')
          ? 'OVERDUE'
          : timeLabel.toLowerCase().includes('minute')
          ? 'CRITICAL'
          : 'UPCOMING',
      };

      const result = await emailjs.send(
        config.emailjsServiceId,
        config.emailjsTemplateId,
        templateParams,
        { publicKey: config.emailjsPublicKey }
      );

      if (result.status === 200) {
        logEmailDispatchEvent({
          taskId: task.id,
          taskTitle: task.title,
          email: recipientEmail,
          timeLabel,
          sentAt: new Date().toISOString(),
          provider: 'emailjs',
        });
        return {
          success: true,
          realEmailSent: true,
          message: `Email delivered to ${recipientEmail} via EmailJS`,
        };
      }

      return {
        success: false,
        realEmailSent: false,
        message: `EmailJS returned status ${result.status}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('EmailJS send error:', err);
      return {
        success: false,
        realEmailSent: false,
        message: `EmailJS error: ${msg}`,
      };
    }
  }

  // --- Path 2: Novu Cloud API (if API key configured) ---
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
          to: { subscriberId: task.user_id || 'user', email: recipientEmail },
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
          message: `Novu email dispatched to ${recipientEmail}`,
        };
      }
    } catch (err) {
      console.warn('Novu API dispatch failed:', err);
    }
  }

  // --- Not configured ---
  return {
    success: false,
    realEmailSent: false,
    message: 'EmailJS not configured. Open Notification Settings → Email to set it up.',
  };
}

/**
 * Log email dispatch history in localStorage (audit trail)
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
 * Play a gentle alert chime for due task notifications
 */
export function playDueAlertSound() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    // Ignore audio context errors
  }
}

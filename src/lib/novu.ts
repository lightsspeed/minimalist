import { Task } from '@/hooks/useTasks';

export interface NovuConfig {
  applicationIdentifier: string; // Novu App ID (public) — used for Inbox widget
  apiKey: string;                 // Novu API Key (secret) — used to trigger workflows
  subscriberId: string;           // Novu subscriber ID (defaults to user ID)
  thresholdHours: number;         // Alert window before due date
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  emailNotificationsEnabled: boolean;
  targetEmail: string;            // Recipient email for due alerts
}

const STORAGE_KEY = 'minimalist_novu_config';

export const DEFAULT_NOVU_CONFIG: NovuConfig = {
  applicationIdentifier: (import.meta.env.VITE_NOVU_APP_IDENTIFIER as string) || '',
  apiKey: (import.meta.env.VITE_NOVU_API_KEY as string) || '',
  subscriberId: '',
  thresholdHours: 24,
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
    console.error('Failed to read Novu config:', e);
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

export function isNovuConfigured(): boolean {
  const c = getNovuConfig();
  return !!(c.applicationIdentifier && c.apiKey);
}

/** Request browser push notification permission */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/** Fire a native browser desktop notification */
export function sendBrowserDueNotification(title: string, body: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
    });
    if (onClick) {
      n.onclick = () => { window.focus(); onClick(); n.close(); };
    }
  } catch (e) {
    console.error('Browser notification error:', e);
  }
}

/**
 * Trigger a Novu workflow event to send an email due-date alert.
 * Calls POST https://api.novu.co/v1/events/trigger
 * Requires:
 *  - Novu account at https://app.novu.co
 *  - A workflow with ID "task-due-alert" that has an Email step
 *  - subscriberId, API Key, and App Identifier configured in settings
 */
export async function sendEmailDueNotification(
  task: Task,
  recipientEmail: string,
  timeLabel: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { success: false, message: 'Invalid recipient email address' };
  }

  const config = getNovuConfig();

  if (!config.apiKey) {
    return {
      success: false,
      message: 'Novu API Key not configured. Open ⚙️ Notification Settings to add it.',
    };
  }

  const subscriberId = config.subscriberId || userId || recipientEmail;

  try {
    // We use a CORS proxy because Novu's API strictly blocks frontend requests.
    // This allows us to trigger workflows directly from the browser without a backend.
    const response = await fetch('https://corsproxy.io/?https://api.novu.co/v1/events/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${config.apiKey}`,
      },
      body: JSON.stringify({
        name: 'task-due-alert',
        to: {
          subscriberId,
          email: recipientEmail,
        },
        payload: {
          taskTitle: task.title,
          taskDescription: task.description || '',
          dueDate: task.due_date
            ? new Date(task.due_date).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : 'Not set',
          timeLabel,
          appUrl: window.location.origin,
          urgency: timeLabel.toLowerCase().includes('overdue')
            ? 'OVERDUE'
            : timeLabel.toLowerCase().includes('minute')
            ? 'CRITICAL'
            : 'UPCOMING',
        },
      }),
    });

    if (response.ok) {
      logEmailDispatch({ taskId: task.id, taskTitle: task.title, email: recipientEmail, timeLabel });
      return { success: true, message: `Novu alert sent to ${recipientEmail} for "${task.title}"` };
    }

    let errMsg = `Novu API error ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch { /* ignore */ }

    return { success: false, message: errMsg };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Novu trigger error:', err);
    return { success: false, message: `Trigger failed: ${msg}` };
  }
}

function logEmailDispatch(event: { taskId: string; taskTitle: string; email: string; timeLabel: string }) {
  try {
    const raw = localStorage.getItem('minimalist_novu_dispatches') || '[]';
    const list = JSON.parse(raw);
    list.unshift({ ...event, sentAt: new Date().toISOString() });
    localStorage.setItem('minimalist_novu_dispatches', JSON.stringify(list.slice(0, 30)));
  } catch { /* ignore */ }
}

/** Play a gentle chime for critical due alerts */
export function playDueAlertSound() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

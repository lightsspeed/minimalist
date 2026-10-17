import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Task } from './useTasks';
import { getNovuConfig, sendBrowserDueNotification, playDueAlertSound, sendEmailDueNotification } from '@/lib/novu';
import { differenceInMinutes, differenceInHours, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';

export type AlertUrgency = 'overdue' | 'critical' | 'imminent' | 'approaching';

export interface DueTaskAlert {
  task: Task;
  urgency: AlertUrgency;
  minutesRemaining: number;
  timeLabel: string;
  isOverdue: boolean;
}

export function useDueTaskAlerts(tasks: Task[], userEmail?: string, userId?: string) {
  const [config, setConfig] = useState(getNovuConfig());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [snoozedTaskIds, setSnoozedTaskIds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('minimalist_snoozed_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Ticker to refresh time-remaining calculations every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Prune stale dedup entries on mount (older than 7 days) to prevent
  // localStorage from growing forever with entries for old/deleted tasks.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('minimalist_notified_task_ids');
      if (!raw) return;
      const notified: Record<string, { at: number; dueDate: string | null } | number> = JSON.parse(raw);
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      let changed = false;
      for (const key of Object.keys(notified)) {
        const entry = notified[key];
        const at = typeof entry === 'number' ? entry : entry?.at || 0;
        if (at < cutoff) {
          delete notified[key];
          changed = true;
        }
      }
      if (changed) localStorage.setItem('minimalist_notified_task_ids', JSON.stringify(notified));
    } catch { /* ignore */ }
  }, []); // Run once on mount

  // Reload config when updated
  const refreshConfig = useCallback(() => {
    setConfig(getNovuConfig());
  }, []);

  // Compute approaching tasks
  const dueAlerts = useMemo<DueTaskAlert[]>(() => {
    const now = new Date(currentTime);
    const nowMs = now.getTime();
    const thresholdMinutes = config.thresholdHours * 60;

    return tasks
      .filter((task) => {
        if (task.is_completed || !task.due_date) return false;

        // Check if snoozed
        const snoozedUntil = snoozedTaskIds[task.id];
        if (snoozedUntil && snoozedUntil > nowMs) return false;

        const dueDate = new Date(task.due_date);
        const diffMinutes = differenceInMinutes(dueDate, now);

        // Alert condition: either overdue or due within threshold
        return diffMinutes <= thresholdMinutes;
      })
      .map((task) => {
        const dueDate = new Date(task.due_date!);
        const diffMinutes = differenceInMinutes(dueDate, now);
        const diffHours = differenceInHours(dueDate, now);
        const overdue = diffMinutes < 0;

        let urgency: AlertUrgency = 'approaching';
        if (overdue) {
          urgency = 'overdue';
        } else if (diffMinutes <= 60) {
          urgency = 'critical'; // < 1 hour
        } else if (diffMinutes <= 360) {
          urgency = 'imminent'; // < 6 hours
        } else {
          urgency = 'approaching'; // < threshold hours
        }

        let timeLabel = '';
        if (overdue) {
          timeLabel = `Overdue by ${formatDistanceToNow(dueDate)}`;
        } else if (diffMinutes < 60) {
          timeLabel = `Due in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
        } else if (diffHours < 24) {
          timeLabel = `Due in ~${diffHours} hour${diffHours === 1 ? '' : 's'}`;
        } else {
          timeLabel = `Due in ${formatDistanceToNow(dueDate)}`;
        }

        return {
          task,
          urgency,
          minutesRemaining: diffMinutes,
          timeLabel,
          isOverdue: overdue,
        };
      })
      .sort((a, b) => a.minutesRemaining - b.minutesRemaining);
  }, [tasks, config.thresholdHours, snoozedTaskIds, currentTime]);

  // --- Refs so the notification effect doesn't re-fire when settings change ---
  // ROOT BUG FIX: Previously config/userEmail/userId were direct effect dependencies.
  // Every time the user saved notification settings (refreshConfig() was called),
  // the config state changed → the effect re-ran → any task whose 30-min dedup
  // had elapsed received another email. Using refs means ONLY dueAlerts triggers
  // the effect, not settings changes.
  const configRef = useRef(config);
  const userEmailRef = useRef(userEmail);
  const userIdRef = useRef(userId);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Handle automatic notifications when new critical/approaching alerts arrive.
  // Depends ONLY on dueAlerts — config/email/userId accessed via refs so that
  // saving notification settings never re-triggers email sends.
  useEffect(() => {
    if (dueAlerts.length === 0) return;

    const cfg = configRef.current;
    const email = userEmailRef.current;
    const uid = userIdRef.current;

    // Use localStorage (not sessionStorage) so dedup persists across page
    // refreshes and new tabs — prevents re-emailing tasks on every reload.
    const notifiedKey = 'minimalist_notified_task_ids';
    let notified: Record<string, { at: number; dueDate: string | null } | number> = {};
    try {
      notified = JSON.parse(localStorage.getItem(notifiedKey) || '{}');
    } catch {
      notified = {};
    }

    const now = Date.now();
    let hasNewAlert = false;

    for (const alert of dueAlerts) {
      // Extra safety guard — completed tasks are filtered by dueAlerts useMemo
      // but we double-check here in case of any stale-state race condition.
      if (alert.task.is_completed) continue;

      const entry = notified[alert.task.id];
      const lastNotified = typeof entry === 'number' ? entry : entry?.at || 0;
      const recordedDueDate = typeof entry === 'object' && entry !== null ? entry.dueDate : null;
      const dueDateChanged = Boolean(alert.task.due_date && recordedDueDate && alert.task.due_date !== recordedDueDate);

      // Fire if not notified in the last 30 minutes, OR if the task's due date was updated
      if (dueDateChanged || now - lastNotified > 30 * 60 * 1000) {
        hasNewAlert = true;
        notified[alert.task.id] = { at: now, dueDate: alert.task.due_date };

        if (cfg.browserNotificationsEnabled) {
          sendBrowserDueNotification(
            `Task Due Alert: ${alert.task.title}`,
            `${alert.timeLabel}. Tap to view.`
          );
        }

        if (cfg.soundEnabled) {
          playDueAlertSound();
        }

        // Email notification dispatch
        const recipient = cfg.targetEmail || email;
        if (cfg.emailNotificationsEnabled && recipient) {
          sendEmailDueNotification(alert.task, recipient, alert.timeLabel, uid).then((res) => {
            if (res.success) {
              toast.info(`Email dispatched: ${alert.task.title}`, {
                description: `Sent to ${recipient}`,
              });
            }
          });
        }

        toast.warning(`Task approaching due date: "${alert.task.title}"`, {
          description: alert.timeLabel,
          duration: 5000,
        });
      }
    }

    if (hasNewAlert) {
      localStorage.setItem(notifiedKey, JSON.stringify(notified));
    }
  }, [dueAlerts]); // ← ONLY dueAlerts; refs hold current config/email/userId

  // Snooze an alert for N hours
  const snoozeAlert = useCallback((taskId: string, hours: number = 1) => {
    const snoozeUntil = Date.now() + hours * 60 * 60 * 1000;
    setSnoozedTaskIds((prev) => {
      const updated = { ...prev, [taskId]: snoozeUntil };
      localStorage.setItem('minimalist_snoozed_alerts', JSON.stringify(updated));
      return updated;
    });
    toast.info(`Alert snoozed for ${hours} hour${hours > 1 ? 's' : ''}`);
  }, []);

  return {
    dueAlerts,
    alertsCount: dueAlerts.length,
    overdueCount: dueAlerts.filter((a) => a.isOverdue).length,
    criticalCount: dueAlerts.filter((a) => a.urgency === 'critical').length,
    snoozeAlert,
    refreshConfig,
    config,
  };
}

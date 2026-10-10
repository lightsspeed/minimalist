import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task } from './useTasks';
import { getNovuConfig, sendBrowserDueNotification, playDueAlertSound } from '@/lib/novu';
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

export function useDueTaskAlerts(tasks: Task[]) {
  const [config, setConfig] = useState(getNovuConfig());
  const [snoozedTaskIds, setSnoozedTaskIds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('minimalist_snoozed_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Reload config when updated
  const refreshConfig = useCallback(() => {
    setConfig(getNovuConfig());
  }, []);

  // Compute approaching tasks
  const dueAlerts = useMemo<DueTaskAlert[]>(() => {
    const now = new Date();
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
  }, [tasks, config.thresholdHours, snoozedTaskIds]);

  // Handle automatic notifications when new critical/approaching alerts arrive
  useEffect(() => {
    if (dueAlerts.length === 0) return;

    // Check if any task needs an active notification firing
    const notifiedKey = 'minimalist_notified_task_ids';
    let notified: Record<string, number> = {};
    try {
      notified = JSON.parse(sessionStorage.getItem(notifiedKey) || '{}');
    } catch {
      notified = {};
    }

    const now = Date.now();
    let hasNewAlert = false;

    for (const alert of dueAlerts) {
      // Fire if not notified in the last 30 minutes
      const lastNotified = notified[alert.task.id] || 0;
      if (now - lastNotified > 30 * 60 * 1000) {
        hasNewAlert = true;
        notified[alert.task.id] = now;

        if (config.browserNotificationsEnabled) {
          sendBrowserDueNotification(
            `Task Due Alert: ${alert.task.title}`,
            `${alert.timeLabel}. Tap to view.`
          );
        }

        if (config.soundEnabled) {
          playDueAlertSound();
        }

        toast.warning(`Task approaching due date: "${alert.task.title}"`, {
          description: alert.timeLabel,
          duration: 5000,
        });
      }
    }

    if (hasNewAlert) {
      sessionStorage.setItem(notifiedKey, JSON.stringify(notified));
    }
  }, [dueAlerts, config.browserNotificationsEnabled, config.soundEnabled]);

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

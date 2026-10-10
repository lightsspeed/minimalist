import React, { useState } from 'react';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Settings,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDueTaskAlerts, DueTaskAlert } from '@/hooks/useDueTaskAlerts';
import { Task } from '@/hooks/useTasks';
import {
  getNovuConfig,
  saveNovuConfig,
  requestBrowserNotificationPermission,
  sendBrowserDueNotification,
  playDueAlertSound,
} from '@/lib/novu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Inbox } from '@novu/react';

interface NovuNotificationCenterProps {
  tasks: Task[];
  onCompleteTask?: (taskId: string) => Promise<unknown> | void;
  onSelectTask?: (task: Task) => void;
  userId?: string;
}

export function NovuNotificationCenter({
  tasks,
  onCompleteTask,
  onSelectTask,
  userId = 'default-user',
}: NovuNotificationCenterProps) {
  const {
    dueAlerts,
    alertsCount,
    overdueCount,
    criticalCount,
    snoozeAlert,
    refreshConfig,
    config,
  } = useDueTaskAlerts(tasks);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appIdInput, setAppIdInput] = useState(config.applicationIdentifier);
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey || '');
  const [thresholdHours, setThresholdHours] = useState(String(config.thresholdHours));
  const [browserNotifs, setBrowserNotifs] = useState(config.browserNotificationsEnabled);
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled);

  // Handle saving Novu settings
  const handleSaveSettings = () => {
    saveNovuConfig({
      applicationIdentifier: appIdInput.trim(),
      apiKey: apiKeyInput.trim(),
      thresholdHours: Number(thresholdHours) || 24,
      browserNotificationsEnabled: browserNotifs,
      soundEnabled: soundEnabled,
    });
    refreshConfig();
    setSettingsOpen(false);
    toast.success('Notification settings saved');
  };

  // Test notification trigger
  const handleTestAlert = async () => {
    if (browserNotifs) {
      const perm = await requestBrowserNotificationPermission();
      if (perm === 'granted') {
        sendBrowserDueNotification(
          '🔔 Novu Due Alert (Test)',
          'Task "Finalize Project Proposal" is due in 30 minutes!'
        );
      }
    }
    if (soundEnabled) {
      playDueAlertSound();
    }
    toast.info('Test alert triggered: Task nearing due date', {
      description: 'Triggered via Novu Notification Engine',
    });
  };

  const getUrgencyBadge = (urgency: DueTaskAlert['urgency']) => {
    switch (urgency) {
      case 'overdue':
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5">
            Overdue
          </Badge>
        );
      case 'critical':
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5">
            &lt; 1h Left
          </Badge>
        );
      case 'imminent':
        return (
          <Badge className="bg-amber-500/90 hover:bg-amber-600 text-white text-[10px] font-medium px-1.5 py-0.5">
            &lt; 6h Left
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0.5">
            Upcoming
          </Badge>
        );
    }
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Notifications & Due Alerts"
          >
            <Bell className={cn('h-5 w-5', alertsCount > 0 && 'text-foreground')} />
            {alertsCount > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-background',
                  overdueCount > 0 || criticalCount > 0
                    ? 'bg-rose-500 animate-pulse'
                    : 'bg-blue-600'
                )}
              >
                {alertsCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-[380px] sm:w-[420px] p-0 shadow-xl border-border bg-card overflow-hidden rounded-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <h3 className="font-semibold text-sm">Notifications</h3>
              {alertsCount > 0 && (
                <Badge variant="outline" className="text-xs h-5 px-1.5 border-primary/30 text-primary">
                  {alertsCount} due
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setPopoverOpen(false);
                  setSettingsOpen(true);
                }}
                title="Novu & Notification Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs for Due Alerts vs Novu Cloud Inbox */}
          <Tabs defaultValue="due-alerts" className="w-full">
            <div className="px-4 pt-2 border-b border-border/50">
              <TabsList className="grid grid-cols-2 h-8 w-full bg-muted/50 p-0.5">
                <TabsTrigger value="due-alerts" className="text-xs data-[state=active]:bg-background">
                  Due Alerts {alertsCount > 0 && `(${alertsCount})`}
                </TabsTrigger>
                <TabsTrigger value="novu-inbox" className="text-xs data-[state=active]:bg-background">
                  Novu Cloud
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Impending Due Tasks */}
            <TabsContent value="due-alerts" className="m-0 p-0">
              <div className="p-2 border-b border-border/40 bg-muted/10 text-[11px] text-muted-foreground flex items-center justify-between px-4">
                <span>Alerts triggered within {config.thresholdHours}h of due date</span>
                <span className="flex items-center gap-1 text-[10px] text-primary">
                  <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-500" /> Active Monitor
                </span>
              </div>

              <ScrollArea className="max-h-[360px] min-h-[160px]">
                {dueAlerts.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      No tasks are nearing their due dates within the next {config.thresholdHours} hours.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {dueAlerts.map((alert) => (
                      <div
                        key={alert.task.id}
                        className={cn(
                          'p-3.5 hover:bg-muted/40 transition-colors flex flex-col gap-2',
                          alert.isOverdue && 'bg-rose-500/5',
                          alert.urgency === 'critical' && 'bg-orange-500/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {getUrgencyBadge(alert.urgency)}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {alert.timeLabel}
                              </span>
                            </div>
                            <h4
                              onClick={() => {
                                onSelectTask?.(alert.task);
                                setPopoverOpen(false);
                              }}
                              className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer mt-1 truncate"
                            >
                              {alert.task.title}
                            </h4>
                            {alert.task.tags && alert.task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {alert.task.tags.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[11px] gap-1 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/40"
                              onClick={async () => {
                                if (onCompleteTask) {
                                  await onCompleteTask(alert.task.id);
                                  toast.success(`Completed "${alert.task.title}"`);
                                }
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Mark Done
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => snoozeAlert(alert.task.id, 1)}
                            >
                              Snooze 1h
                            </Button>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(alert.task.due_date!).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Tab 2: Novu Cloud Inbox */}
            <TabsContent value="novu-inbox" className="m-0 p-4">
              {config.applicationIdentifier ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/50">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Novu Connected
                    </span>
                    <a
                      href="https://dashboard.novu.co"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Dashboard <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  {/* Novu Official Inbox Widget */}
                  <div className="rounded-lg overflow-hidden border border-border min-h-[220px]">
                    <Inbox
                      applicationIdentifier={config.applicationIdentifier}
                      subscriberId={userId}
                    />
                  </div>
                </div>
              ) : (
                <div className="py-6 px-2 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Novu Notifications</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Powered by Novu's open-source notification infrastructure. Connect your Novu App ID for multi-channel & cloud notifications.
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg text-left text-xs space-y-1.5 border border-border/60">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Active Local Due-Monitor
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Tasks nearing due dates trigger native in-app alerts and desktop browser push immediately.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        setPopoverOpen(false);
                        setSettingsOpen(true);
                      }}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Settings className="h-3.5 w-3.5" /> Configure Novu ID
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestAlert}
                      className="h-8 text-xs"
                    >
                      Test Alert
                    </Button>
                  </div>

                  <div className="pt-2">
                    <a
                      href="https://github.com/novuhq/novu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      Explore Novu on GitHub <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      {/* Novu Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Settings className="h-4 w-4" />
              </div>
              <DialogTitle>Notification & Novu Settings</DialogTitle>
            </div>
            <DialogDescription>
              Configure due date notification thresholds and connect your Novu account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Novu Application Identifier */}
            <div className="space-y-1.5">
              <Label htmlFor="appId" className="text-xs font-medium flex items-center justify-between">
                <span>Novu Application Identifier</span>
                <a
                  href="https://github.com/novuhq/novu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  Novu Docs <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </Label>
              <Input
                id="appId"
                placeholder="e.g. YOUR_NOVU_APP_IDENTIFIER"
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Found in your Novu Dashboard settings. If empty, local notifications continue seamlessly.
              </p>
            </div>

            {/* Threshold Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="threshold" className="text-xs font-medium">
                Due Date Alert Proximity
              </Label>
              <Select value={thresholdHours} onValueChange={setThresholdHours}>
                <SelectTrigger id="threshold" className="h-9 text-xs">
                  <SelectValue placeholder="Select alert proximity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour before due date</SelectItem>
                  <SelectItem value="3">3 hours before due date</SelectItem>
                  <SelectItem value="6">6 hours before due date</SelectItem>
                  <SelectItem value="12">12 hours before due date</SelectItem>
                  <SelectItem value="24">24 hours before due date (Default)</SelectItem>
                  <SelectItem value="48">48 hours before due date</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Only triggers notifications when tasks come within this time of their due date.
              </p>
            </div>

            {/* Desktop Web Notifications */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium cursor-pointer">Desktop Push Notifications</Label>
                <p className="text-[11px] text-muted-foreground">
                  Receive browser notifications when a task is due soon
                </p>
              </div>
              <Switch
                checked={browserNotifs}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    const perm = await requestBrowserNotificationPermission();
                    if (perm === 'granted') {
                      setBrowserNotifs(true);
                      toast.success('Desktop notifications enabled');
                    } else {
                      setBrowserNotifs(false);
                      toast.error('Permission denied by browser');
                    }
                  } else {
                    setBrowserNotifs(false);
                  }
                }}
              />
            </div>

            {/* Sound alert */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium cursor-pointer">Sound Alert</Label>
                <p className="text-[11px] text-muted-foreground">
                  Play gentle chime for critical due alerts
                </p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>

            {/* Test button */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1.5"
                onClick={handleTestAlert}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Test Due Alert Notification
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

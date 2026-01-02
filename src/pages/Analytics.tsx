import { useMemo, useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ListTodo, CircleCheck, Clock, BarChart3, AlertTriangle, TrendingUp, TrendingDown, Flame, Plus, Target, Zap, Award, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, isAfter, isBefore, format, startOfWeek, startOfMonth, differenceInDays, startOfDay } from 'date-fns';
import { AnimatedNumber } from '@/components/AnimatedNumber';

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface Subtask {
  id: string;
  task_id: string;
  is_completed: boolean;
  created_at: string;
}

interface OverdueTask {
  id: string;
  title: string;
  daysOverdue: number;
}

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useTasks();
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtasksLoading, setSubtasksLoading] = useState(true);

  useEffect(() => {
    const fetchSubtasks = async () => {
      if (!user) {
        setSubtasks([]);
        setSubtasksLoading(false);
        return;
      }
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) {
        setSubtasks([]);
        setSubtasksLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('subtasks')
        .select('id, task_id, is_completed, created_at')
        .in('task_id', taskIds);
      if (error) {
        console.error('Error fetching subtasks:', error);
      } else {
        setSubtasks(data || []);
      }
      setSubtasksLoading(false);
    };
    if (!tasksLoading) {
      fetchSubtasks();
    }
  }, [user, tasks, tasksLoading]);

  const overdueTasks = useMemo((): OverdueTask[] => {
    const now = new Date();
    return tasks
      .filter(t => !t.is_template && !t.is_completed && t.due_date && isBefore(new Date(t.due_date), now))
      .map(t => ({
        id: t.id,
        title: t.title,
        daysOverdue: differenceInDays(now, new Date(t.due_date!))
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);
  }, [tasks]);

  const streak = useMemo(() => {
    const now = new Date();
    let currentStreak = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(now, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const completedOnDay = tasks.some(t => t.completed_at && format(new Date(t.completed_at), 'yyyy-MM-dd') === dateStr);
      if (completedOnDay) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
    return currentStreak;
  }, [tasks]);

  const weeklyPriorities = useMemo(() => {
    const weekEnd = subDays(startOfWeek(new Date()), -7);
    return tasks
      .filter(t => !t.is_template && !t.is_completed && (t.is_pinned || (t.due_date && isBefore(new Date(t.due_date), weekEnd))))
      .slice(0, 5);
  }, [tasks]);

  const stats = useMemo(() => {
    const totalTasks = tasks.filter(t => !t.is_template).length;
    const totalSubtasks = subtasks.length;
    const total = totalTasks + totalSubtasks;
    const completedTasks = tasks.filter(t => t.is_completed && !t.is_template).length;
    const completedSubtasks = subtasks.filter(s => s.is_completed).length;
    const completed = completedTasks + completedSubtasks;
    const incompleteTasks = tasks.filter(t => !t.is_completed && !t.is_template);
    const toDo = incompleteTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      totalTasks,
      totalSubtasks,
      completed,
      completedTasks,
      completedSubtasks,
      toDo,
      completionRate
    };
  }, [tasks, subtasks]);

  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; completed: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const weekEnd = i === 0 ? now : subDays(startOfWeek(subDays(now, (i - 1) * 7)), 1);
      const completed = tasks.filter(t => {
        if (!t.completed_at || t.is_template) return false;
        const completedDate = new Date(t.completed_at);
        return completedDate >= weekStart && completedDate <= weekEnd;
      }).length;
      weeks.push({ label: `Week ${4 - i}`, completed });
    }
    const avgCompleted = weeks.reduce((sum, w) => sum + w.completed, 0) / weeks.length;
    const prevAvg = (weeks[0].completed + weeks[1].completed) / 2;
    const currAvg = (weeks[2].completed + weeks[3].completed) / 2;
    const trend = currAvg - prevAvg;
    return {
      weeks,
      avgCompleted: Math.round(avgCompleted * 10) / 10,
      trend: Math.round(trend * 10) / 10
    };
  }, [tasks]);

  const chartData = useMemo(() => {
    const now = new Date();
    const completedItems = [
      ...tasks.filter(t => !t.is_template && t.is_completed).map(t => ({
        completed_at: t.completed_at || t.created_at
      })),
      ...subtasks.filter(s => s.is_completed).map(s => ({
        completed_at: s.created_at
      }))
    ];

    switch (period) {
      case 'day': {
        const data: { label: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const hour = new Date(now);
          hour.setHours(now.getHours() - i, 0, 0, 0);
          const nextHour = new Date(hour);
          nextHour.setHours(hour.getHours() + 1);
          const count = completedItems.filter(item => {
            const completed = new Date(item.completed_at);
            return completed >= hour && completed < nextHour;
          }).length;
          data.push({ label: format(hour, 'ha'), count });
        }
        return data;
      }
      case 'week': {
        const data: { label: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(now, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const count = completedItems.filter(item => format(new Date(item.completed_at), 'yyyy-MM-dd') === dateStr).length;
          data.push({ label: format(date, 'EEE'), count });
        }
        return data;
      }
      case 'month': {
        const data: { label: string; count: number }[] = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = startOfWeek(subDays(now, i * 7));
          const weekEnd = subDays(startOfWeek(subDays(now, (i - 1) * 7)), 1);
          const count = completedItems.filter(item => {
            const completed = new Date(item.completed_at);
            return completed >= weekStart && completed <= (i === 0 ? now : weekEnd);
          }).length;
          data.push({ label: `Week ${4 - i}`, count });
        }
        return data;
      }
      case 'year': {
        const data: { label: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(now, i));
          const monthEnd = i === 0 ? now : subDays(startOfMonth(subMonths(now, i - 1)), 1);
          const count = completedItems.filter(item => {
            const completed = new Date(item.completed_at);
            return completed >= monthStart && completed <= monthEnd;
          }).length;
          data.push({ label: format(monthStart, 'MMM'), count });
        }
        return data;
      }
    }
  }, [tasks, subtasks, period]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = tasksLoading || subtasksLoading;

  return (
    <div className="min-h-screen bg-background transition-theme">
      <NavBar />

      <main className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Your Progress</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Track your productivity and stay motivated</p>
            </div>

            {/* Hero Stats - Main Focus */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="pt-6 pb-5">
                  <div className="flex flex-col">
                    <div className="p-2.5 bg-primary/15 rounded-xl w-fit mb-3">
                      <CircleCheck className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold text-foreground">
                      <AnimatedNumber value={stats.completionRate} duration={800} suffix="%" />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Completion Rate</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {stats.completed} of {stats.total} done
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent via-accent/50 to-transparent border-accent-foreground/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-accent-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="pt-6 pb-5">
                  <div className="flex flex-col">
                    <div className="p-2.5 bg-accent-foreground/10 rounded-xl w-fit mb-3">
                      <Clock className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold text-foreground">
                      <AnimatedNumber value={stats.toDo} duration={800} />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Tasks Remaining</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Keep going!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Productivity Streak */}
            {streak > 0 && (
              <Card className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border-orange-500/20 overflow-hidden">
                <CardContent className="py-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl">
                      <Flame className="h-7 w-7 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-foreground">{streak}</p>
                        <p className="text-sm font-medium text-muted-foreground">Day Streak</p>
                      </div>
                      <div className="mt-2.5">
                        <Progress value={(streak / 14) * 100} className="h-2" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {streak < 14 ? `${14 - streak} more days to hit 2 weeks!` : '🎉 Amazing streak!'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overdue Tasks Alert */}
            {overdueTasks.length > 0 && (
              <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-destructive/10 rounded-xl shrink-0">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-destructive mb-2 text-sm sm:text-base">
                        {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
                      </h3>
                      <ul className="space-y-1.5">
                        {overdueTasks.map(task => (
                          <li key={task.id} className="flex items-center gap-2 text-sm">
                            <span className="truncate flex-1 text-muted-foreground">{task.title}</span>
                            <span className="text-xs text-destructive font-medium whitespace-nowrap px-2 py-0.5 bg-destructive/10 rounded-full">
                              {task.daysOverdue}d
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link to="/" className="text-xs text-primary hover:underline mt-3 inline-flex items-center gap-1 font-medium">
                        View Tasks <span>→</span>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weekly Priorities */}
            {weeklyPriorities.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 pt-5">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      This Week's Focus
                    </span>
                    <Button asChild variant="ghost" size="sm" className="text-xs h-7 text-primary hover:text-primary">
                      <Link to="/planning">View All</Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <ul className="space-y-2">
                    {weeklyPriorities.map(task => (
                      <li key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="w-4 h-4 rounded-full border-2 border-primary/40 shrink-0" />
                        <span className="flex-1 text-sm truncate">{task.title}</span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Completion Trend */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <div className="flex items-end justify-between gap-3 h-28 mb-4">
                  {weeklyTrend.weeks.map((week, i) => {
                    const maxWeek = Math.max(...weeklyTrend.weeks.map(w => w.completed), 1);
                    const height = (week.completed / maxWeek) * 70;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {week.completed > 0 ? week.completed : '-'}
                        </span>
                        <div 
                          className="w-full bg-gradient-to-t from-primary to-primary/70 rounded-lg transition-all duration-500" 
                          style={{
                            height: `${height}px`,
                            minHeight: week.completed > 0 ? '12px' : '4px',
                            opacity: week.completed > 0 ? 1 : 0.2
                          }} 
                        />
                        <span className="text-xs text-muted-foreground">{week.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-border/50 pt-4">
                  <span className="text-muted-foreground">
                    Average: <span className="font-semibold text-foreground">{weeklyTrend.avgCompleted}</span> / week
                  </span>
                  <span className={`flex items-center gap-1 font-medium ${weeklyTrend.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {weeklyTrend.trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {weeklyTrend.trend >= 0 ? '+' : ''}{weeklyTrend.trend}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Activity Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Activity
                  </CardTitle>
                  <Tabs value={period} onValueChange={v => setPeriod(v as TimePeriod)}>
                    <TabsList className="h-8 bg-muted/50">
                      <TabsTrigger value="day" className="text-xs px-3 h-6 data-[state=active]:bg-background">Day</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs px-3 h-6 data-[state=active]:bg-background">Week</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs px-3 h-6 data-[state=active]:bg-background">Month</TabsTrigger>
                      <TabsTrigger value="year" className="text-xs px-3 h-6 data-[state=active]:bg-background">Year</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="pb-5">
                <div className="flex items-end justify-between gap-1.5 h-36">
                  {chartData.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{item.count > 0 ? item.count : ''}</span>
                      <div 
                        className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-md transition-all duration-300 hover:from-primary hover:to-primary/80" 
                        style={{
                          height: `${(item.count / maxCount) * 90}px`,
                          minHeight: item.count > 0 ? '8px' : '3px',
                          opacity: item.count > 0 ? 1 : 0.15
                        }} 
                      />
                      <span className="text-[10px] sm:text-xs text-muted-foreground mt-1">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

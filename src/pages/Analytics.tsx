import { useMemo, useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ListTodo, CircleCheck, Clock, CalendarDays, BarChart3, AlertTriangle, TrendingUp, TrendingDown, Flame, Plus, Target, Play, Calendar, Focus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, isAfter, isBefore, format, startOfWeek, startOfMonth, getMonth, getYear, differenceInDays, startOfDay, endOfDay } from 'date-fns';
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
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    tasks,
    loading: tasksLoading
  } = useTasks();
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtasksLoading, setSubtasksLoading] = useState(true);

  // Fetch all subtasks
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
      const {
        data,
        error
      } = await supabase.from('subtasks').select('id, task_id, is_completed, created_at').in('task_id', taskIds);
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

  // Overdue tasks
  const overdueTasks = useMemo((): OverdueTask[] => {
    const now = new Date();
    return tasks.filter(t => !t.is_template && !t.is_completed && t.due_date && isBefore(new Date(t.due_date), now)).map(t => ({
      id: t.id,
      title: t.title,
      daysOverdue: differenceInDays(now, new Date(t.due_date!))
    })).sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 5);
  }, [tasks]);

  // Today & This Week stats (including subtasks for today)
  const quickStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const lastWeekStart = subDays(weekStart, 7);

    // Today's tasks
    const todayTasks = tasks.filter(t => !t.is_template);
    const todayCompleted = todayTasks.filter(t => t.completed_at && isAfter(new Date(t.completed_at), todayStart)).length;
    const todayTotal = todayTasks.filter(t => isAfter(new Date(t.created_at), todayStart) || t.due_date && format(new Date(t.due_date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')).length || todayCompleted + todayTasks.filter(t => !t.is_completed).length;
    const todayRemaining = Math.max(0, todayTotal - todayCompleted);

    // Today's subtasks
    const todaySubtasksCompleted = subtasks.filter(s => s.is_completed && isAfter(new Date(s.created_at), todayStart)).length;
    const todaySubtasksTotal = subtasks.filter(s => isAfter(new Date(s.created_at), todayStart)).length;

    // This week's tasks
    const weekTasks = tasks.filter(t => !t.is_template);
    const weekCompleted = weekTasks.filter(t => t.completed_at && isAfter(new Date(t.completed_at), weekStart)).length;
    const weekTotal = weekTasks.filter(t => isAfter(new Date(t.created_at), weekStart)).length || weekCompleted;

    // Last week comparison
    const lastWeekCompleted = weekTasks.filter(t => t.completed_at && isAfter(new Date(t.completed_at), lastWeekStart) && isBefore(new Date(t.completed_at), weekStart)).length;
    const weekDiff = weekCompleted - lastWeekCompleted;
    return {
      todayCompleted,
      todayTotal: Math.max(todayTotal, todayCompleted),
      todayRemaining,
      todaySubtasksCompleted,
      todaySubtasksTotal,
      weekCompleted,
      weekTotal: Math.max(weekTotal, weekCompleted),
      weekDiff
    };
  }, [tasks, subtasks]);

  // Productivity streak
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

  // Weekly priorities (pinned or due this week)
  const weeklyPriorities = useMemo(() => {
    const weekEnd = subDays(startOfWeek(new Date()), -7);
    return tasks.filter(t => !t.is_template && !t.is_completed && (t.is_pinned || t.due_date && isBefore(new Date(t.due_date), weekEnd))).slice(0, 5);
  }, [tasks]);
  const stats = useMemo(() => {
    const totalTasks = tasks.filter(t => !t.is_template).length;
    const totalSubtasks = subtasks.length;
    const total = totalTasks + totalSubtasks;
    const completedTasks = tasks.filter(t => t.is_completed && !t.is_template).length;
    const completedSubtasks = subtasks.filter(s => s.is_completed).length;
    const completed = completedTasks + completedSubtasks;

    // Separate to-do and in-progress (not completed)
    const incompleteTasks = tasks.filter(t => !t.is_completed && !t.is_template);
    const toDo = incompleteTasks.length; // All incomplete are "to do" for now

    const completionRate = total > 0 ? Math.round(completed / total * 100) : 0;
    const last7DaysTasks = tasks.filter(t => !t.is_template && isAfter(new Date(t.created_at), subDays(new Date(), 7))).length;
    const last7DaysSubtasks = subtasks.filter(s => isAfter(new Date(s.created_at), subDays(new Date(), 7))).length;
    const last7Days = last7DaysTasks + last7DaysSubtasks;
    return {
      total,
      totalTasks,
      totalSubtasks,
      completed,
      completedTasks,
      completedSubtasks,
      toDo,
      completionRate,
      last7Days
    };
  }, [tasks, subtasks]);

  // Weekly completion trend (last 4 weeks)
  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const weeks: {
      label: string;
      completed: number;
    }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const weekEnd = i === 0 ? now : subDays(startOfWeek(subDays(now, (i - 1) * 7)), 1);
      const completed = tasks.filter(t => {
        if (!t.completed_at || t.is_template) return false;
        const completedDate = new Date(t.completed_at);
        return completedDate >= weekStart && completedDate <= weekEnd;
      }).length;
      weeks.push({
        label: `Week ${4 - i}`,
        completed
      });
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
    const completedItems = [...tasks.filter(t => !t.is_template && t.is_completed).map(t => ({
      completed_at: t.completed_at || t.created_at
    })), ...subtasks.filter(s => s.is_completed).map(s => ({
      completed_at: s.created_at
    }))];
    switch (period) {
      case 'day':
        {
          const data: {
            label: string;
            count: number;
          }[] = [];
          for (let i = 11; i >= 0; i--) {
            const hour = new Date(now);
            hour.setHours(now.getHours() - i, 0, 0, 0);
            const nextHour = new Date(hour);
            nextHour.setHours(hour.getHours() + 1);
            const count = completedItems.filter(item => {
              const completed = new Date(item.completed_at);
              return completed >= hour && completed < nextHour;
            }).length;
            data.push({
              label: format(hour, 'ha'),
              count
            });
          }
          return data;
        }
      case 'week':
        {
          const data: {
            label: string;
            count: number;
          }[] = [];
          for (let i = 6; i >= 0; i--) {
            const date = subDays(now, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const count = completedItems.filter(item => format(new Date(item.completed_at), 'yyyy-MM-dd') === dateStr).length;
            data.push({
              label: format(date, 'EEE'),
              count
            });
          }
          return data;
        }
      case 'month':
        {
          const data: {
            label: string;
            count: number;
          }[] = [];
          for (let i = 3; i >= 0; i--) {
            const weekStart = startOfWeek(subDays(now, i * 7));
            const weekEnd = subDays(startOfWeek(subDays(now, (i - 1) * 7)), 1);
            const count = completedItems.filter(item => {
              const completed = new Date(item.completed_at);
              return completed >= weekStart && completed <= (i === 0 ? now : weekEnd);
            }).length;
            data.push({
              label: `Week ${4 - i}`,
              count
            });
          }
          return data;
        }
      case 'year':
        {
          const data: {
            label: string;
            count: number;
          }[] = [];
          for (let i = 11; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(now, i));
            const monthEnd = i === 0 ? now : subDays(startOfMonth(subMonths(now, i - 1)), 1);
            const count = completedItems.filter(item => {
              const completed = new Date(item.completed_at);
              return completed >= monthStart && completed <= monthEnd;
            }).length;
            data.push({
              label: format(monthStart, 'MMM'),
              count
            });
          }
          return data;
        }
    }
  }, [tasks, subtasks, period]);
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  const isLoading = tasksLoading || subtasksLoading;
  return <div className="min-h-screen bg-background transition-theme">
      <NavBar />

      <main className="container max-w-5xl mx-auto px-4 py-6">
        {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading analytics...</div> : <div className="space-y-6">
            {/* Overdue Tasks Alert */}
            {overdueTasks.length > 0 && <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-destructive mb-2">
                        {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {overdueTasks.map(task => <li key={task.id} className="flex items-center gap-2 text-muted-foreground">
                            <span className="truncate flex-1">{task.title}</span>
                            <span className="text-xs text-destructive font-medium whitespace-nowrap">
                              {task.daysOverdue} day{task.daysOverdue > 1 ? 's' : ''} ago
                            </span>
                          </li>)}
                      </ul>
                      <Link to="/" className="text-xs text-primary hover:underline mt-2 inline-block">
                        View All →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            {/* This Week Stats */}
            <Card className="hover:bg-hover-blue transition-colors">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-success/10 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">This Week</span>
                </div>
                <p className="text-2xl font-bold mb-1">
                  <AnimatedNumber value={quickStats.weekCompleted} duration={800} />
                  <span className="text-muted-foreground font-normal">/{quickStats.weekTotal}</span>
                  <span className="text-sm font-normal text-muted-foreground ml-1">completed</span>
                </p>
                <p className="text-xs flex items-center gap-1">
                  {quickStats.weekDiff >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span className={quickStats.weekDiff >= 0 ? 'text-success' : 'text-destructive'}>
                    {quickStats.weekDiff >= 0 ? '+' : ''}{quickStats.weekDiff}
                  </span>
                  <span className="text-muted-foreground">from last week</span>
                </p>
              </CardContent>
            </Card>

            {/* Productivity Streak */}
            {streak > 0 && <Card className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <Flame className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-foreground">
                        {streak} Day Streak
                      </p>
                      <div className="mt-2">
                        <Progress value={streak / 14 * 100} className="h-2" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {streak < 14 ? `${14 - streak} more days for 2-week streak!` : 'Amazing streak! Keep it going!'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            {/* Quick Actions Bar */}
            

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="hover:bg-hover-blue transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-success/10 rounded-xl">
                      <CircleCheck className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        <AnimatedNumber value={stats.completionRate} duration={800} suffix="%" />
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-xs text-muted-foreground">{stats.completed}/{stats.total} items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:bg-hover-blue transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent rounded-xl">
                      <Clock className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        <AnimatedNumber value={stats.toDo} duration={800} delay={100} />
                      </p>
                      <p className="text-xs text-muted-foreground">To Do</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:bg-hover-blue transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        <AnimatedNumber value={stats.last7Days} duration={800} delay={200} />
                      </p>
                      <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:bg-hover-blue transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <ListTodo className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        <AnimatedNumber value={stats.totalSubtasks} duration={800} delay={300} />
                      </p>
                      <p className="text-xs text-muted-foreground">Subtasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* This Week's Priorities */}
            {weeklyPriorities.length > 0 && <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      This Week's Priorities
                    </span>
                    <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                      <Link to="/planning">View Planning →</Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {weeklyPriorities.map(task => <li key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
                        <span className="flex-1 text-sm truncate">{task.title}</span>
                        {task.due_date && <span className="text-xs text-muted-foreground">
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>}
                      </li>)}
                  </ul>
                  <Button asChild variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground">
                    <Link to="/">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Priority
                    </Link>
                  </Button>
                </CardContent>
              </Card>}



            {/* Completion Trend (replaces Monthly Breakdown) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Completion Trend (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-24 mb-4">
                  {weeklyTrend.weeks.map((week, i) => {
                const maxWeek = Math.max(...weeklyTrend.weeks.map(w => w.completed), 1);
                return <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {week.completed > 0 ? week.completed : ''}
                        </span>
                        <div className="w-full bg-primary rounded-t transition-all" style={{
                    height: `${week.completed / maxWeek * 60}px`,
                    minHeight: week.completed > 0 ? '8px' : '2px',
                    opacity: week.completed > 0 ? 1 : 0.3
                  }} />
                        <span className="text-xs text-muted-foreground">{week.label}</span>
                      </div>;
              })}
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground">
                    Avg: <span className="font-medium text-foreground">{weeklyTrend.avgCompleted}</span> tasks/week
                  </span>
                  <span className={`flex items-center gap-1 ${weeklyTrend.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {weeklyTrend.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {weeklyTrend.trend >= 0 ? '+' : ''}{weeklyTrend.trend}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Items Completed Chart with Time Period Tabs */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Items Completed
                  </CardTitle>
                  <Tabs value={period} onValueChange={v => setPeriod(v as TimePeriod)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="day" className="text-xs px-3 h-6">Day</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs px-3 h-6">Week</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs px-3 h-6">Month</TabsTrigger>
                      <TabsTrigger value="year" className="text-xs px-3 h-6">Year</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-1 h-32">
                  {chartData.map((item, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground mb-1">{item.count > 0 ? item.count : ''}</span>
                      <div className="w-full bg-primary rounded-t transition-all hover:bg-primary/80" style={{
                  height: `${item.count / maxCount * 80}px`,
                  minHeight: item.count > 0 ? '8px' : '2px',
                  opacity: item.count > 0 ? 1 : 0.3
                }} />
                      <span className="text-xs text-muted-foreground mt-1">{item.label}</span>
                    </div>)}
                </div>
              </CardContent>
            </Card>
          </div>}
      </main>
    </div>;
}
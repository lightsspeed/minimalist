import { useMemo, useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { 
  ListTodo, CircleCheck, Clock, CalendarDays, BarChart3, AlertTriangle,
  TrendingUp, TrendingDown, Flame, Plus, Target, Calendar, ChevronDown, ChevronUp,
  PartyPopper, Zap, Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { 
  subDays, subMonths, isAfter, isBefore, format, startOfWeek, startOfMonth, 
  getMonth, getYear, differenceInDays, startOfDay, endOfDay, isToday, isFriday,
  getDay
} from 'date-fns';
import { AnimatedNumber } from '@/components/AnimatedNumber';

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface Subtask {
  id: string;
  task_id: string;
  is_completed: boolean;
  created_at: string;
}

interface TaskWithUrgency {
  id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
  urgency: 'overdue' | 'today' | 'week' | 'upcoming' | 'none';
  daysInfo: string;
}

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useTasks();
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtasksLoading, setSubtasksLoading] = useState(true);
  const [showAllPending, setShowAllPending] = useState(false);

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

  // Tasks with urgency classification
  const tasksWithUrgency = useMemo((): TaskWithUrgency[] => {
    const now = new Date();
    const todayEnd = endOfDay(now);
    const weekEnd = subDays(startOfWeek(now), -7);

    return tasks
      .filter(t => !t.is_template && !t.is_completed)
      .map(t => {
        let urgency: TaskWithUrgency['urgency'] = 'none';
        let daysInfo = '';

        if (t.due_date) {
          const dueDate = new Date(t.due_date);
          if (isBefore(dueDate, now)) {
            urgency = 'overdue';
            const days = differenceInDays(now, dueDate);
            daysInfo = `${days} day${days > 1 ? 's' : ''} overdue`;
          } else if (isToday(dueDate)) {
            urgency = 'today';
            daysInfo = 'Due today';
          } else if (isBefore(dueDate, weekEnd)) {
            urgency = 'week';
            const days = differenceInDays(dueDate, now);
            daysInfo = `Due in ${days} day${days > 1 ? 's' : ''}`;
          } else {
            urgency = 'upcoming';
            daysInfo = format(dueDate, 'MMM d');
          }
        }

        return {
          id: t.id,
          title: t.title,
          due_date: t.due_date,
          is_completed: t.is_completed,
          urgency,
          daysInfo
        };
      })
      .sort((a, b) => {
        const order = { overdue: 0, today: 1, week: 2, upcoming: 3, none: 4 };
        return order[a.urgency] - order[b.urgency];
      });
  }, [tasks]);

  // Weekly Review data
  const weeklyReview = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const lastWeekStart = subDays(weekStart, 7);
    
    // Completed this week
    const completedThisWeek = tasks.filter(t => 
      t.completed_at && isAfter(new Date(t.completed_at), weekStart) && !t.is_template
    );
    
    // Carried over (created before this week, not completed)
    const carriedOver = tasks.filter(t => 
      !t.is_completed && 
      !t.is_template && 
      isBefore(new Date(t.created_at), weekStart)
    ).length;

    // Most productive day
    const dayCompletions: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    completedThisWeek.forEach(t => {
      const day = getDay(new Date(t.completed_at!));
      dayCompletions[day]++;
    });
    const maxDay = Object.entries(dayCompletions).reduce((a, b) => 
      b[1] > a[1] ? b : a, ['0', 0]
    );
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostProductiveDay = dayCompletions[parseInt(maxDay[0])] > 0 ? dayNames[parseInt(maxDay[0])] : null;

    // Top achievement (longest task title completed, as proxy)
    const topAchievement = completedThisWeek.length > 0 
      ? completedThisWeek.sort((a, b) => b.title.length - a.title.length)[0]?.title
      : null;

    return {
      completed: completedThisWeek.length,
      carriedOver,
      mostProductiveDay,
      topAchievement: topAchievement?.slice(0, 30) + (topAchievement && topAchievement.length > 30 ? '...' : '')
    };
  }, [tasks]);

  // Today & This Week stats
  const quickStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const lastWeekStart = subDays(weekStart, 7);

    const todayCompleted = tasks.filter(t => 
      !t.is_template && t.completed_at && isAfter(new Date(t.completed_at), todayStart)
    ).length;

    const weekCompleted = tasks.filter(t => 
      !t.is_template && t.completed_at && isAfter(new Date(t.completed_at), weekStart)
    ).length;

    const lastWeekCompleted = tasks.filter(t => 
      !t.is_template && t.completed_at && 
      isAfter(new Date(t.completed_at), lastWeekStart) && 
      isBefore(new Date(t.completed_at), weekStart)
    ).length;

    return {
      todayCompleted,
      weekCompleted,
      weekDiff: weekCompleted - lastWeekCompleted
    };
  }, [tasks]);

  // Productivity streak
  const streak = useMemo(() => {
    const now = new Date();
    let currentStreak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(now, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      
      const completedOnDay = tasks.some(t => 
        t.completed_at && format(new Date(t.completed_at), 'yyyy-MM-dd') === dateStr
      );
      
      if (completedOnDay) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return currentStreak;
  }, [tasks]);

  const stats = useMemo(() => {
    const totalTasks = tasks.filter(t => !t.is_template).length;
    const totalSubtasks = subtasks.length;
    const total = totalTasks + totalSubtasks;

    const completedTasks = tasks.filter(t => t.is_completed && !t.is_template).length;
    const completedSubtasks = subtasks.filter(s => s.is_completed).length;
    const completed = completedTasks + completedSubtasks;

    const toDo = tasks.filter(t => !t.is_completed && !t.is_template).length;

    return { total, completed, toDo };
  }, [tasks, subtasks]);

  // Weekly completion trend
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
    const trend = weeks[3].completed - weeks[2].completed;
    
    return { weeks, avgCompleted: Math.round(avgCompleted * 10) / 10, trend };
  }, [tasks]);

  const chartData = useMemo(() => {
    const now = new Date();
    
    const completedItems = [
      ...tasks.filter(t => !t.is_template && t.is_completed).map(t => ({ completed_at: t.completed_at || t.created_at })),
      ...subtasks.filter(s => s.is_completed).map(s => ({ completed_at: s.created_at }))
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
          const count = completedItems.filter(item => 
            format(new Date(item.completed_at), 'yyyy-MM-dd') === dateStr
          ).length;
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

  // Urgency colors
  const getUrgencyStyles = (urgency: TaskWithUrgency['urgency']) => {
    switch (urgency) {
      case 'overdue':
        return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'today':
        return 'border-l-4 border-l-orange-500 bg-orange-500/5';
      case 'week':
        return 'border-l-4 border-l-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-4 border-l-muted';
    }
  };

  const getUrgencyBadge = (urgency: TaskWithUrgency['urgency']) => {
    switch (urgency) {
      case 'overdue':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Overdue</span>;
      case 'today':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium">Today</span>;
      case 'week':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium">This week</span>;
      default:
        return null;
    }
  };

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
  const overdueTasks = tasksWithUrgency.filter(t => t.urgency === 'overdue');
  const todayTasks = tasksWithUrgency.filter(t => t.urgency === 'today');
  const needsAttention = [...overdueTasks, ...todayTasks];
  const displayedPending = showAllPending ? tasksWithUrgency : tasksWithUrgency.slice(0, 3);

  return (
    <div className="min-h-screen bg-background transition-theme">
      <NavBar />

      <main className="container max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : (
          <div className="space-y-4">
            {/* Overdue Alert - Large & Prominent */}
            {overdueTasks.length > 0 && (
              <Card className="border-2 border-destructive/50 bg-destructive/5 shadow-lg">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-destructive/20 rounded-xl shrink-0">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-destructive mb-1">
                        {overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} need{overdueTasks.length === 1 ? 's' : ''} your attention!
                      </h3>
                      <ul className="space-y-2 mt-3">
                        {overdueTasks.slice(0, 3).map(task => (
                          <li key={task.id} className={`flex items-center gap-3 p-2 rounded-lg ${getUrgencyStyles(task.urgency)}`}>
                            <span className="flex-1 truncate font-medium">{task.title}</span>
                            <span className="text-xs text-destructive font-medium whitespace-nowrap">
                              {task.daysInfo}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {overdueTasks.length > 3 && (
                        <Link to="/" className="text-sm text-destructive hover:underline mt-3 inline-flex items-center gap-1">
                          +{overdueTasks.length - 3} more overdue →
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action-Oriented Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Today's Progress */}
              <Card className={`${quickStats.todayCompleted > 0 ? 'bg-success/5 border-success/30' : 'bg-muted/30'}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    {quickStats.todayCompleted > 0 ? (
                      <PartyPopper className="h-8 w-8 text-success" />
                    ) : (
                      <Zap className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div>
                      {quickStats.todayCompleted > 0 ? (
                        <>
                          <p className="text-lg font-bold text-success">
                            Great job! <AnimatedNumber value={quickStats.todayCompleted} duration={600} /> done today
                          </p>
                          <p className="text-xs text-muted-foreground">Keep the momentum going</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-muted-foreground">
                            Ready to start?
                          </p>
                          <p className="text-xs text-muted-foreground">Complete your first task today</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Week Progress */}
              <Card className={`${quickStats.weekCompleted > 0 ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-lg font-bold">
                        <AnimatedNumber value={quickStats.weekCompleted} duration={600} /> this week
                      </p>
                      <p className="text-xs flex items-center gap-1">
                        {quickStats.weekDiff >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={quickStats.weekDiff >= 0 ? 'text-success' : 'text-destructive'}>
                          {quickStats.weekDiff >= 0 ? '+' : ''}{quickStats.weekDiff}
                        </span>
                        <span className="text-muted-foreground">vs last week</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Productivity Streak - Compact */}
            {streak > 0 && (
              <Card className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <Flame className="h-6 w-6 text-orange-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{streak} Day Streak</span>
                        <span className="text-xs text-muted-foreground">
                          {streak < 7 ? `${7 - streak} more for weekly badge` : streak < 14 ? `${14 - streak} more for 2-week badge` : 'Amazing!'}
                        </span>
                      </div>
                      <Progress value={(streak / 14) * 100} className="h-1.5 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weekly Review Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Week in Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className="text-2xl font-bold text-success">
                      <AnimatedNumber value={weeklyReview.completed} duration={600} />
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className="text-2xl font-bold text-orange-500">
                      <AnimatedNumber value={weeklyReview.carriedOver} duration={600} />
                    </p>
                    <p className="text-xs text-muted-foreground">Carried over</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className="text-sm font-bold text-foreground truncate">
                      {weeklyReview.mostProductiveDay || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Most productive</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className="text-sm font-medium text-foreground truncate" title={weeklyReview.topAchievement || ''}>
                      {weeklyReview.topAchievement || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Top achievement</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full mt-3">
                  <Link to="/">
                    Start Next Week Planning →
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Tasks Needing Attention - Progressive Disclosure */}
            {tasksWithUrgency.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {needsAttention.length > 0 
                      ? `${needsAttention.length} task${needsAttention.length > 1 ? 's' : ''} need${needsAttention.length === 1 ? 's' : ''} attention`
                      : `${stats.toDo} pending task${stats.toDo > 1 ? 's' : ''}`
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {displayedPending.map(task => (
                      <li 
                        key={task.id} 
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${getUrgencyStyles(task.urgency)}`}
                      >
                        <div className="w-4 h-4 rounded border-2 border-muted-foreground/30 shrink-0" />
                        <span className="flex-1 text-sm truncate font-medium">{task.title}</span>
                        {getUrgencyBadge(task.urgency)}
                        {task.daysInfo && task.urgency !== 'overdue' && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {task.daysInfo}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  
                  {tasksWithUrgency.length > 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-3 text-muted-foreground"
                      onClick={() => setShowAllPending(!showAllPending)}
                    >
                      {showAllPending ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Show all {tasksWithUrgency.length} pending tasks
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button asChild variant="default" size="sm" className="gap-2 flex-1">
                <Link to="/">
                  <Plus className="h-4 w-4" />
                  New Task
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2 flex-1">
                <Link to="/archive">
                  <CircleCheck className="h-4 w-4" />
                  View Completed
                </Link>
              </Button>
            </div>

            {/* Completion Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Completion Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-20 mb-3">
                  {weeklyTrend.weeks.map((week, i) => {
                    const maxWeek = Math.max(...weeklyTrend.weeks.map(w => w.completed), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {week.completed > 0 ? week.completed : ''}
                        </span>
                        <div
                          className="w-full bg-primary rounded-t transition-all"
                          style={{
                            height: `${(week.completed / maxWeek) * 48}px`,
                            minHeight: week.completed > 0 ? '6px' : '2px',
                            opacity: week.completed > 0 ? 1 : 0.3,
                          }}
                        />
                        <span className="text-xs text-muted-foreground">{week.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs border-t pt-2">
                  <span className="text-muted-foreground">
                    Avg: <span className="font-medium text-foreground">{weeklyTrend.avgCompleted}</span>/week
                  </span>
                  <span className={`flex items-center gap-1 ${weeklyTrend.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {weeklyTrend.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {weeklyTrend.trend >= 0 ? '+' : ''}{weeklyTrend.trend}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Items Completed Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Activity
                  </CardTitle>
                  <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
                    <TabsList className="h-7">
                      <TabsTrigger value="day" className="text-xs px-2 h-5">Day</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs px-2 h-5">Week</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs px-2 h-5">Month</TabsTrigger>
                      <TabsTrigger value="year" className="text-xs px-2 h-5">Year</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-1 h-24">
                  {chartData.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">{item.count > 0 ? item.count : ''}</span>
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                        style={{
                          height: `${(item.count / maxCount) * 64}px`,
                          minHeight: item.count > 0 ? '6px' : '2px',
                          opacity: item.count > 0 ? 1 : 0.3,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compact Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xl font-bold"><AnimatedNumber value={stats.total} duration={600} /></p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <p className="text-xl font-bold text-success"><AnimatedNumber value={stats.completed} duration={600} /></p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xl font-bold"><AnimatedNumber value={stats.toDo} duration={600} /></p>
                <p className="text-xs text-muted-foreground">To Do</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

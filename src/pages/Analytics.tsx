import { useMemo, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ListTodo, CircleCheck, Clock, CalendarDays, Tag, BarChart3, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, isAfter, format, startOfWeek, startOfMonth, getMonth, getYear } from 'date-fns';

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface Subtask {
  id: string;
  task_id: string;
  is_completed: boolean;
  created_at: string;
}

interface MonthData {
  month: string;
  year: number;
  label: string;
  total: number;
  completed: number;
  pending: number;
}

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useTasks();
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

  const stats = useMemo(() => {
    // Combine tasks and subtasks
    const totalTasks = tasks.filter(t => !t.is_template).length;
    const totalSubtasks = subtasks.length;
    const total = totalTasks + totalSubtasks;

    const completedTasks = tasks.filter(t => t.is_completed && !t.is_template).length;
    const completedSubtasks = subtasks.filter(s => s.is_completed).length;
    const completed = completedTasks + completedSubtasks;

    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Items created in last 7 days (tasks + subtasks)
    const last7DaysTasks = tasks.filter(t => 
      !t.is_template && isAfter(new Date(t.created_at), subDays(new Date(), 7))
    ).length;
    const last7DaysSubtasks = subtasks.filter(s => 
      isAfter(new Date(s.created_at), subDays(new Date(), 7))
    ).length;
    const last7Days = last7DaysTasks + last7DaysSubtasks;

    // Tag distribution (from tasks only)
    const tagCounts: Record<string, number> = {};
    tasks.filter(t => !t.is_template).forEach(task => {
      task.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { 
      total, 
      totalTasks, 
      totalSubtasks, 
      completed, 
      completedTasks,
      completedSubtasks,
      pending, 
      completionRate, 
      last7Days, 
      topTags 
    };
  }, [tasks, subtasks]);

  // Monthly data - auto-generated from tasks
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, MonthData>();
    
    // Process tasks (excluding templates)
    tasks.filter(t => !t.is_template).forEach(task => {
      const date = new Date(task.created_at);
      const month = getMonth(date);
      const year = getYear(date);
      const key = `${year}-${month}`;
      const label = format(date, 'MMMM yyyy');
      
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: format(date, 'MMMM'),
          year,
          label,
          total: 0,
          completed: 0,
          pending: 0,
        });
      }
      
      const data = monthMap.get(key)!;
      data.total += 1;
      if (task.is_completed) {
        data.completed += 1;
      } else {
        data.pending += 1;
      }
    });
    
    // Process subtasks
    subtasks.forEach(subtask => {
      const date = new Date(subtask.created_at);
      const month = getMonth(date);
      const year = getYear(date);
      const key = `${year}-${month}`;
      const label = format(date, 'MMMM yyyy');
      
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: format(date, 'MMMM'),
          year,
          label,
          total: 0,
          completed: 0,
          pending: 0,
        });
      }
      
      const data = monthMap.get(key)!;
      data.total += 1;
      if (subtask.is_completed) {
        data.completed += 1;
      } else {
        data.pending += 1;
      }
    });
    
    // Sort by year and month (newest first)
    return Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
    });
  }, [tasks, subtasks]);

  const chartData = useMemo(() => {
    const now = new Date();
    
    // Combine tasks and subtasks for chart (excluding templates)
    const allItems = [
      ...tasks.filter(t => !t.is_template).map(t => ({ created_at: t.created_at })),
      ...subtasks.map(s => ({ created_at: s.created_at }))
    ];
    
    switch (period) {
      case 'day': {
        const data: { label: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const hour = new Date(now);
          hour.setHours(now.getHours() - i, 0, 0, 0);
          const nextHour = new Date(hour);
          nextHour.setHours(hour.getHours() + 1);
          
          const count = allItems.filter(item => {
            const created = new Date(item.created_at);
            return created >= hour && created < nextHour;
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
          const count = allItems.filter(item => 
            format(new Date(item.created_at), 'yyyy-MM-dd') === dateStr
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
          
          const count = allItems.filter(item => {
            const created = new Date(item.created_at);
            return created >= weekStart && created <= (i === 0 ? now : weekEnd);
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
          
          const count = allItems.filter(item => {
            const created = new Date(item.created_at);
            return created >= monthStart && created <= monthEnd;
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

      <main className="container max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="hover:bg-hover-blue transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <ListTodo className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Items</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 ml-12">
                    {stats.totalTasks} tasks · {stats.totalSubtasks} subtasks
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:bg-hover-blue transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-success/10 rounded-xl">
                      <CircleCheck className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 ml-12">
                    {stats.completedTasks} tasks · {stats.completedSubtasks} subtasks
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:bg-hover-blue transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent rounded-xl">
                      <Clock className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
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
                      <p className="text-2xl font-bold">{stats.last7Days}</p>
                      <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Completion Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{stats.completionRate}%</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            {monthlyData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Monthly Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthlyData.map((month) => {
                      const completionRate = month.total > 0 ? Math.round((month.completed / month.total) * 100) : 0;
                      return (
                        <div key={month.label} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{month.label}</span>
                            <span className="text-sm text-muted-foreground">
                              {month.completed}/{month.total} completed
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-success rounded-full transition-all duration-500"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{completionRate}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks Chart with Time Period Tabs */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Items Created
                  </CardTitle>
                  <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
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
                  {chartData.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground mb-1">{item.count > 0 ? item.count : ''}</span>
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                        style={{
                          height: `${(item.count / maxCount) * 80}px`,
                          minHeight: item.count > 0 ? '8px' : '2px',
                          opacity: item.count > 0 ? 1 : 0.3,
                        }}
                      />
                      <span className="text-xs text-muted-foreground mt-1">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Tags */}
            {stats.topTags.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Top Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topTags.map(([tag, count]) => (
                      <div key={tag} className="flex items-center gap-3">
                        <span className="text-sm font-medium min-w-[80px] truncate">{tag}</span>
                        <div className="flex-1">
                          <div
                            className="h-2 bg-primary/30 rounded"
                            style={{
                              width: `${(count / stats.topTags[0][1]) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

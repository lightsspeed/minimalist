import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ListTodo, CircleCheck, Clock, CalendarDays, Tag, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { subDays, subMonths, subYears, isAfter, format, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

type TimePeriod = 'day' | 'week' | 'month' | 'year';

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useTasks();
  const [period, setPeriod] = useState<TimePeriod>('week');

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.is_completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tasks created in last 7 days
    const last7Days = tasks.filter(t => 
      isAfter(new Date(t.created_at), subDays(new Date(), 7))
    ).length;

    // Tag distribution
    const tagCounts: Record<string, number> = {};
    tasks.forEach(task => {
      task.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, completed, pending, completionRate, last7Days, topTags };
  }, [tasks]);

  const chartData = useMemo(() => {
    const now = new Date();
    
    switch (period) {
      case 'day': {
        // Last 24 hours, grouped by hour (show last 12 hours)
        const data: { label: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const hour = new Date(now);
          hour.setHours(now.getHours() - i, 0, 0, 0);
          const nextHour = new Date(hour);
          nextHour.setHours(hour.getHours() + 1);
          
          const count = tasks.filter(t => {
            const created = new Date(t.created_at);
            return created >= hour && created < nextHour;
          }).length;
          
          data.push({ label: format(hour, 'ha'), count });
        }
        return data;
      }
      case 'week': {
        // Last 7 days
        const data: { label: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(now, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const count = tasks.filter(t => 
            format(new Date(t.created_at), 'yyyy-MM-dd') === dateStr
          ).length;
          data.push({ label: format(date, 'EEE'), count });
        }
        return data;
      }
      case 'month': {
        // Last 4 weeks
        const data: { label: string; count: number }[] = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = startOfWeek(subDays(now, i * 7));
          const weekEnd = subDays(startOfWeek(subDays(now, (i - 1) * 7)), 1);
          
          const count = tasks.filter(t => {
            const created = new Date(t.created_at);
            return created >= weekStart && created <= (i === 0 ? now : weekEnd);
          }).length;
          
          data.push({ label: `Week ${4 - i}`, count });
        }
        return data;
      }
      case 'year': {
        // Last 12 months
        const data: { label: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(now, i));
          const monthEnd = i === 0 ? now : subDays(startOfMonth(subMonths(now, i - 1)), 1);
          
          const count = tasks.filter(t => {
            const created = new Date(t.created_at);
            return created >= monthStart && created <= monthEnd;
          }).length;
          
          data.push({ label: format(monthStart, 'MMM'), count });
        }
        return data;
      }
    }
  }, [tasks, period]);

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

  return (
    <div className="min-h-screen bg-background transition-theme">
      <NavBar />

      <main className="container max-w-4xl mx-auto px-4 py-6">
        {tasksLoading ? (
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
                      <p className="text-xs text-muted-foreground">Total Tasks</p>
                    </div>
                  </div>
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

            {/* Tasks Chart with Time Period Tabs */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Tasks Created
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
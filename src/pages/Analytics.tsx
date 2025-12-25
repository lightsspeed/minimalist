import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Circle, Tag, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { subDays, isAfter, format } from 'date-fns';

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useTasks();

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

    // Tasks by day (last 7 days)
    const tasksByDay: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = tasks.filter(t => 
        format(new Date(t.created_at), 'yyyy-MM-dd') === dateStr
      ).length;
      tasksByDay.push({ date: format(date, 'EEE'), count });
    }

    return { total, completed, pending, completionRate, last7Days, topTags, tasksByDay };
  }, [tasks]);

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

  const maxDayCount = Math.max(...stats.tasksByDay.map(d => d.count), 1);

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
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
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

            {/* Tasks by Day */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Tasks Created (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-24">
                  {stats.tasksByDay.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t transition-all"
                        style={{
                          height: `${(day.count / maxDayCount) * 100}%`,
                          minHeight: day.count > 0 ? '4px' : '0px',
                        }}
                      >
                        <div
                          className="w-full h-full bg-primary rounded-t"
                          style={{ opacity: 0.3 + (day.count / maxDayCount) * 0.7 }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{day.date}</span>
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

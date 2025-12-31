import { useMemo, useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Calendar, CalendarDays, CalendarRange, Target, Plus, ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, Task } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, isWithinInterval, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

type PlanView = 'day' | 'week' | 'month';

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

export default function Planning() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading, updateTask } = useTasks();
  const [view, setView] = useState<PlanView>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [subtasksLoading, setSubtasksLoading] = useState(true);

  // Fetch subtasks for all tasks
  useEffect(() => {
    const fetchSubtasks = async () => {
      if (!user || tasks.length === 0) {
        setSubtasksMap({});
        setSubtasksLoading(false);
        return;
      }

      const taskIds = tasks.map(t => t.id);
      const { data, error } = await supabase
        .from('subtasks')
        .select('id, task_id, title, is_completed')
        .in('task_id', taskIds);

      if (error) {
        console.error('Error fetching subtasks:', error);
      } else {
        const map: Record<string, Subtask[]> = {};
        (data || []).forEach(st => {
          if (!map[st.task_id]) map[st.task_id] = [];
          map[st.task_id].push(st);
        });
        setSubtasksMap(map);
      }
      setSubtasksLoading(false);
    };

    if (!tasksLoading) {
      fetchSubtasks();
    }
  }, [user, tasks, tasksLoading]);

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (view) {
      case 'day':
        setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const dateRange = useMemo(() => {
    switch (view) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
          label: format(currentDate, 'EEEE, MMMM d, yyyy')
        };
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return {
          start: weekStart,
          end: weekEnd,
          label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
        };
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: monthStart,
          end: monthEnd,
          label: format(currentDate, 'MMMM yyyy')
        };
    }
  }, [view, currentDate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.is_template) return false;
      
      // Check if task has a due date within the range
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (view === 'day') {
          return isSameDay(dueDate, currentDate);
        }
        return isWithinInterval(dueDate, { start: dateRange.start, end: dateRange.end });
      }
      
      // Include pinned tasks in week/month view
      if (view !== 'day' && task.is_pinned && !task.is_completed) {
        return true;
      }
      
      return false;
    });
  }, [tasks, view, currentDate, dateRange]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.is_completed).length;
    const overdue = filteredTasks.filter(t => 
      !t.is_completed && t.due_date && isBefore(new Date(t.due_date), new Date())
    ).length;
    
    // Count subtasks
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    filteredTasks.forEach(task => {
      const taskSubtasks = subtasksMap[task.id] || [];
      totalSubtasks += taskSubtasks.length;
      completedSubtasks += taskSubtasks.filter(st => st.is_completed).length;
    });

    return { total, completed, overdue, totalSubtasks, completedSubtasks };
  }, [filteredTasks, subtasksMap]);

  const handleToggleComplete = async (task: Task) => {
    await updateTask(task.id, { is_completed: !task.is_completed });
  };

  // Group tasks by date for week/month view
  const groupedTasks = useMemo(() => {
    if (view === 'day') return null;

    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd');
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(task);
      }
    });
    
    // Sort dates
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tasks]) => ({
        date,
        label: format(new Date(date), view === 'week' ? 'EEEE, MMM d' : 'MMM d'),
        tasks: tasks.sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0))
      }));
  }, [filteredTasks, view]);

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

      <main className="container max-w-5xl mx-auto px-4 py-6">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Planning</h1>
              <p className="text-sm text-muted-foreground">Organize your day, week, and month</p>
            </div>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as PlanView)}>
            <TabsList>
              <TabsTrigger value="day" className="gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Day
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1.5">
                <CalendarRange className="h-4 w-4" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Date Navigation */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold text-lg">{dateRange.label}</p>
                <Button variant="link" size="sm" className="text-muted-foreground h-auto p-0" onClick={goToToday}>
                  Go to Today
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Tasks</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Subtasks</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {stats.completedSubtasks}/{stats.totalSubtasks}
              </p>
            </CardContent>
          </Card>
          {stats.overdue > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">Overdue</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-destructive">{stats.overdue}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
        ) : (
          <div className="space-y-4">
            {view === 'day' ? (
              // Day View - Simple list
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center justify-between">
                    <span>Tasks for {format(currentDate, 'MMMM d')}</span>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                      </Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No tasks scheduled for this day</p>
                      <Button asChild variant="link" className="mt-2">
                        <Link to="/">Add a task with a due date</Link>
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {filteredTasks
                        .sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0))
                        .map(task => {
                          const taskSubtasks = subtasksMap[task.id] || [];
                          const isOverdue = !task.is_completed && task.due_date && isBefore(new Date(task.due_date), new Date());
                          
                          return (
                            <li 
                              key={task.id} 
                              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                                task.is_completed ? 'bg-muted/30' : isOverdue ? 'bg-destructive/5 border border-destructive/20' : 'hover:bg-muted/50'
                              }`}
                            >
                              <Checkbox 
                                checked={task.is_completed}
                                onCheckedChange={() => handleToggleComplete(task)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                                )}
                                {taskSubtasks.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {taskSubtasks.filter(st => st.is_completed).length}/{taskSubtasks.length} subtasks
                                  </p>
                                )}
                              </div>
                              {isOverdue && (
                                <span className="text-xs text-destructive font-medium">Overdue</span>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Week/Month View - Grouped by date
              <>
                {groupedTasks && groupedTasks.length > 0 ? (
                  groupedTasks.map(group => (
                    <Card key={group.date}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {group.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {group.tasks.map(task => {
                            const taskSubtasks = subtasksMap[task.id] || [];
                            const isOverdue = !task.is_completed && task.due_date && isBefore(new Date(task.due_date), new Date());
                            
                            return (
                              <li 
                                key={task.id} 
                                className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                                  task.is_completed ? 'bg-muted/30' : isOverdue ? 'bg-destructive/5' : 'hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox 
                                  checked={task.is_completed}
                                  onCheckedChange={() => handleToggleComplete(task)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                  </p>
                                  {taskSubtasks.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {taskSubtasks.filter(st => st.is_completed).length}/{taskSubtasks.length} subtasks
                                    </p>
                                  )}
                                </div>
                                {isOverdue && (
                                  <span className="text-xs text-destructive">Overdue</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No tasks scheduled for this {view}</p>
                        <Button asChild variant="link" className="mt-2">
                          <Link to="/">Add tasks with due dates</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

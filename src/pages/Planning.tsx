import { useMemo, useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Calendar, CalendarDays, CalendarRange, Target, Plus, ChevronLeft, ChevronRight, Check, Clock, X, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, Task } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, isWithinInterval, isBefore, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TaskModal } from '@/components/TaskModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type PlanView = 'day' | 'week' | 'month';

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

export default function Planning() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading, updateTask, addTask, deleteTask } = useTasks();
  const [view, setView] = useState<PlanView>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [subtasksLoading, setSubtasksLoading] = useState(true);
  
  // Quick add task state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDate, setQuickTaskDate] = useState<Date | undefined>(undefined);
  const [quickTaskTime, setQuickTaskTime] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  
  // Edit/Delete state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Get current time as default
  const getCurrentTimeString = () => {
    const now = new Date();
    return format(now, 'HH:mm');
  };

  // Get minimum time for today (current time)
  const getMinTime = (selectedDate: Date | undefined) => {
    if (!selectedDate) return undefined;
    const now = new Date();
    if (isSameDay(selectedDate, now)) {
      return format(now, 'HH:mm');
    }
    return undefined;
  };

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
          label: format(currentDate, 'EEEE, MMM d')
        };
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return {
          start: weekStart,
          end: weekEnd,
          label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
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

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (deleteTaskId) {
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
      toast.success('Task deleted');
    }
  };

  const handleSaveTask = async (title: string, description: string, tags: string[], dueDate: Date | null) => {
    if (editingTask) {
      await updateTask(editingTask.id, { 
        title, 
        description, 
        tags, 
        due_date: dueDate?.toISOString() || null 
      });
      toast.success('Task updated');
    }
    setTaskModalOpen(false);
    setEditingTask(null);
  };

  // Quick add task handler
  const handleQuickAddTask = async () => {
    if (!quickTaskTitle.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setIsAddingTask(true);
    
    // Combine date and time
    let dueDate: Date | null = null;
    const targetDate = quickTaskDate || (view === 'day' ? currentDate : null);
    
    if (targetDate) {
      const [hours, minutes] = quickTaskTime.split(':').map(Number);
      dueDate = setMinutes(setHours(targetDate, hours), minutes);
      
      // Validate that the date/time is not in the past
      const now = new Date();
      if (isBefore(dueDate, now)) {
        toast.error('Cannot schedule tasks in the past');
        setIsAddingTask(false);
        return;
      }
    }

    const result = await addTask(quickTaskTitle.trim(), '', [], dueDate);
    
    if (!result?.error) {
      toast.success('Task added');
      setQuickTaskTitle('');
      setQuickTaskDate(undefined);
      setQuickTaskTime(getCurrentTimeString());
      setShowQuickAdd(false);
    }
    
    setIsAddingTask(false);
  };

  const openQuickAdd = () => {
    // Set default date based on current view
    if (view === 'day') {
      setQuickTaskDate(currentDate);
    } else {
      setQuickTaskDate(undefined);
    }
    // Set default time to current time
    setQuickTaskTime(getCurrentTimeString());
    setShowQuickAdd(true);
    setTimeout(() => quickAddInputRef.current?.focus(), 100);
  };

  // Check if selected date is valid (not in the past)
  const isDateDisabled = (date: Date) => {
    return isBefore(startOfDay(date), startOfDay(new Date()));
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
        tasks: [...tasks].sort((a, b) => {
          // First sort by completion status (pending first, completed last)
          const completionDiff = (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0);
          if (completionDiff !== 0) return completionDiff;
          // Then sort by due date time
          return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
        })
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
  const minTime = getMinTime(quickTaskDate || (view === 'day' ? currentDate : undefined));

  // Task item component for reuse
  const TaskItem = ({ task, compact = false }: { task: Task; compact?: boolean }) => {
    const taskSubtasks = subtasksMap[task.id] || [];
    const isOverdue = !task.is_completed && task.due_date && isBefore(new Date(task.due_date), new Date());
    
    return (
      <li 
        className={cn(
          'flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors',
          task.is_completed ? 'bg-muted/30' : isOverdue ? 'bg-destructive/5 border border-destructive/20' : 'hover:bg-muted/50'
        )}
      >
        <Checkbox 
          checked={task.is_completed}
          onCheckedChange={() => handleToggleComplete(task)}
          className="mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm sm:text-base font-medium break-words',
            task.is_completed && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </p>
          {!compact && task.description && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{task.description}</p>
          )}
          {task.due_date && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(task.due_date), 'h:mm a')}
            </p>
          )}
          {taskSubtasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {taskSubtasks.filter(st => st.is_completed).length}/{taskSubtasks.length} subtasks
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOverdue && (
            <span className="text-xs text-destructive font-medium hidden sm:inline">Overdue</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleEditTask(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeleteTaskId(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    );
  };

  // Quick add form JSX - inlined to prevent re-render issues
  const renderQuickAddForm = (showDateRequired = false) => (
    <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
      <div className="flex gap-2">
        <Input
          ref={quickAddInputRef}
          placeholder="Task title..."
          value={quickTaskTitle}
          onChange={(e) => setQuickTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleQuickAddTask();
            }
            if (e.key === 'Escape') {
              setShowQuickAdd(false);
              setQuickTaskTitle('');
            }
          }}
          className="flex-1 text-base"
          maxLength={200}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setShowQuickAdd(false);
            setQuickTaskTitle('');
          }}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 justify-start w-full sm:w-auto">
              <CalendarDays className="h-3.5 w-3.5" />
              {quickTaskDate ? format(quickTaskDate, 'MMM d') : 'Pick date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={quickTaskDate}
              onSelect={setQuickTaskDate}
              disabled={isDateDisabled}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Input
            type="time"
            value={quickTaskTime}
            onChange={(e) => setQuickTaskTime(e.target.value)}
            min={minTime}
            className="h-9 flex-1 sm:w-28 text-base"
          />
        </div>
        <Button
          size="sm"
          onClick={handleQuickAddTask}
          disabled={isAddingTask || !quickTaskTitle.trim() || (showDateRequired && !quickTaskDate)}
          className="w-full sm:w-auto sm:ml-auto h-9"
        >
          {isAddingTask ? 'Adding...' : 'Add Task'}
        </Button>
      </div>
      {showDateRequired && !quickTaskDate && (
        <p className="text-xs text-muted-foreground">Please select a date for the task</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background transition-theme">
      <NavBar />

      <main className="container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header with Navigation */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Planning</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Organize your day, week, and month</p>
              </div>
            </div>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as PlanView)} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="day" className="gap-1 text-xs sm:text-sm">
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Day</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1 text-xs sm:text-sm">
                <CalendarRange className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Week</span>
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-1 text-xs sm:text-sm">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Month</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Date Navigation */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')} className="h-8 w-8 sm:h-9 sm:w-9">
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold text-sm sm:text-lg">{dateRange.label}</p>
                <Button variant="link" size="sm" className="text-muted-foreground h-auto p-0 text-xs sm:text-sm" onClick={goToToday}>
                  Go to Today
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateDate('next')} className="h-8 w-8 sm:h-9 sm:w-9">
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs sm:text-sm text-muted-foreground">Tasks</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                <span className="text-xs sm:text-sm text-muted-foreground">Done</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">Subtasks</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">
                {stats.completedSubtasks}/{stats.totalSubtasks}
              </p>
            </CardContent>
          </Card>
          {stats.overdue > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                  <span className="text-xs sm:text-sm text-destructive">Overdue</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 text-destructive">{stats.overdue}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">Loading tasks...</div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {view === 'day' ? (
              // Day View - Simple list
              <Card>
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-sm sm:text-base font-medium flex items-center justify-between">
                    <span>Tasks for {format(currentDate, 'MMM d')}</span>
                    <Button variant="outline" size="sm" onClick={openQuickAdd} className="h-8 text-xs sm:text-sm">
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      Add
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {filteredTasks.length === 0 && !showQuickAdd ? (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                      <p className="text-sm sm:text-base">No tasks scheduled for this day</p>
                      <Button variant="link" className="mt-1 sm:mt-2 text-sm" onClick={openQuickAdd}>
                        Add a task
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {/* Quick Add Form */}
                      {showQuickAdd && renderQuickAddForm()}
                      
                      {/* Task List */}
                      {filteredTasks.length > 0 && (
                        <ul className="space-y-1.5 sm:space-y-2">
                          {filteredTasks
                            .sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0))
                            .map(task => <TaskItem key={task.id} task={task} />)}
                        </ul>
                      )}
                      
                      {/* Add another task button when list is not empty */}
                      {filteredTasks.length > 0 && !showQuickAdd && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-muted-foreground text-sm"
                          onClick={openQuickAdd}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add another task
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Week/Month View - Grouped by date
              <>
                {/* Quick Add Form for Week/Month View */}
                {showQuickAdd && (
                  <Card>
                    <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4 px-3 sm:px-6">
                      {renderQuickAddForm(true)}
                    </CardContent>
                  </Card>
                )}

                {/* Add Task Button for Week/Month View */}
                {!showQuickAdd && (
                  <Button 
                    variant="outline" 
                    className="w-full h-10 sm:h-11"
                    onClick={openQuickAdd}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                )}

                {groupedTasks && groupedTasks.length > 0 ? (
                  groupedTasks.map(group => (
                    <Card key={group.date}>
                      <CardHeader className="pb-2 px-3 sm:px-6">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                          {group.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6">
                        <ul className="space-y-1.5 sm:space-y-2">
                          {group.tasks.map(task => <TaskItem key={task.id} task={task} compact />)}
                        </ul>
                      </CardContent>
                    </Card>
                  ))
                ) : !showQuickAdd && (
                  <Card>
                    <CardContent className="py-8 sm:py-12">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                        <p className="text-sm sm:text-base">No tasks scheduled for this {view}</p>
                        <Button variant="link" className="mt-1 sm:mt-2 text-sm" onClick={openQuickAdd}>
                          Add a task
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

      {/* Edit Task Modal */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          setTaskModalOpen(open);
          if (!open) setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        task={editingTask}
        mode="edit"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

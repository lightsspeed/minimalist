import { useMemo, useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { 
  CheckCircle2, Flame, TrendingUp, TrendingDown, 
  Target, ChevronDown, Lightbulb, BarChart3, CalendarDays, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { 
  subDays, subMonths, subYears, startOfWeek, startOfMonth, startOfYear,
  endOfWeek, endOfMonth, format, differenceInDays, isBefore, isAfter,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval
} from 'date-fns';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TimePeriod = 'today' | 'last7days' | 'thisWeek' | 'thisMonth' | 'thisYear';

interface Subtask {
  id: string;
  task_id: string;
  is_completed: boolean;
  created_at: string;
}

const periodLabels: Record<TimePeriod, string> = {
  today: 'Today',
  last7days: 'Last 7 days',
  thisWeek: 'This Week',
  thisMonth: 'Month',
  thisYear: 'Year'
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useTasks();
  const [period, setPeriod] = useState<TimePeriod>('last7days');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtasksLoading, setSubtasksLoading] = useState(true);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Available months and years based on actual task data
  const { availableMonths, availableYears } = useMemo(() => {
    const monthsSet = new Set<string>();
    const yearsSet = new Set<number>();
    
    // Collect all dates from tasks (created_at and completed_at)
    const allDates: Date[] = [];
    tasks.forEach(t => {
      if (!t.is_template) {
        allDates.push(new Date(t.created_at));
        if (t.completed_at) {
          allDates.push(new Date(t.completed_at));
        }
      }
    });
    
    allDates.forEach(date => {
      const year = date.getFullYear();
      const month = date.getMonth();
      yearsSet.add(year);
      monthsSet.add(`${year}-${month}`);
    });
    
    // Always include current month/year
    const now = new Date();
    yearsSet.add(now.getFullYear());
    monthsSet.add(`${now.getFullYear()}-${now.getMonth()}`);
    
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    const monthsArray = Array.from(monthsSet).map(key => {
      const [year, month] = key.split('-').map(Number);
      return { year, month };
    });
    
    return { 
      availableMonths: monthsArray,
      availableYears: sortedYears 
    };
  }, [tasks]);

  // Only fetch subtasks for non-template tasks
  const nonTemplateTasks = useMemo(() => tasks.filter(t => !t.is_template), [tasks]);
  
  useEffect(() => {
    const fetchSubtasks = async () => {
      if (!user) {
        setSubtasks([]);
        setSubtasksLoading(false);
        return;
      }
      // Only get subtasks for non-template tasks
      const taskIds = nonTemplateTasks.map(t => t.id);
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
  }, [user, nonTemplateTasks, tasksLoading]);

  // Get date ranges for current and previous periods
  const dateRanges = useMemo(() => {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;

    switch (period) {
      case 'today':
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        currentEnd = now;
        prevStart = subDays(currentStart, 1);
        prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate(), 23, 59, 59);
        break;
      case 'last7days':
        currentStart = subDays(now, 6);
        currentEnd = now;
        prevStart = subDays(currentStart, 7);
        prevEnd = subDays(currentEnd, 7);
        break;
      case 'thisWeek':
        currentStart = startOfWeek(now, { weekStartsOn: 1 });
        currentEnd = now;
        prevStart = startOfWeek(subDays(currentStart, 1), { weekStartsOn: 1 });
        prevEnd = endOfWeek(prevStart, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        // Use selected month and year
        currentStart = new Date(selectedYear, selectedMonth, 1);
        currentEnd = endOfMonth(currentStart);
        // If selected month is current month, use now as end
        if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
          currentEnd = now;
        }
        prevStart = startOfMonth(subMonths(currentStart, 1));
        prevEnd = endOfMonth(prevStart);
        break;
      case 'thisYear':
        // Use selected year
        currentStart = new Date(selectedYear, 0, 1);
        currentEnd = new Date(selectedYear, 11, 31, 23, 59, 59);
        // If selected year is current year, use now as end
        if (selectedYear === now.getFullYear()) {
          currentEnd = now;
        }
        prevStart = new Date(selectedYear - 1, 0, 1);
        prevEnd = new Date(selectedYear - 1, 11, 31, 23, 59, 59);
        break;
    }

    return { currentStart, currentEnd, prevStart, prevEnd };
  }, [period, selectedMonth, selectedYear]);

  // Calculate streak
  const streak = useMemo(() => {
    const now = new Date();
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
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

  // Calculate metrics for a period
  const calculateMetrics = (start: Date, end: Date) => {
    const periodTasks = tasks.filter(t => {
      if (t.is_template) return false;
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      return completedDate >= start && completedDate <= end;
    });

    const periodSubtasks = subtasks.filter(s => {
      if (!s.is_completed) return false;
      const completedDate = new Date(s.created_at);
      return completedDate >= start && completedDate <= end;
    });

    const totalCompleted = periodTasks.length + periodSubtasks.length;

    return { completed: totalCompleted };
  };

  // Current and previous period metrics
  const metrics = useMemo(() => {
    const { currentStart, currentEnd, prevStart, prevEnd } = dateRanges;
    const current = calculateMetrics(currentStart, currentEnd);
    const previous = calculateMetrics(prevStart, prevEnd);

    const completedChange = previous.completed > 0 
      ? Math.round(((current.completed - previous.completed) / previous.completed) * 100)
      : current.completed > 0 ? 100 : 0;

    // Completion rate for the current period (tasks created within the period)
    const periodTasks = tasks.filter(t => {
      if (t.is_template) return false;
      const createdDate = new Date(t.created_at);
      return createdDate >= currentStart && createdDate <= currentEnd;
    });
    const periodSubtasksAll = subtasks.filter(s => {
      const createdDate = new Date(s.created_at);
      return createdDate >= currentStart && createdDate <= currentEnd;
    });
    
    const periodCompletedTasks = periodTasks.filter(t => t.is_completed).length;
    const periodCompletedSubtasks = periodSubtasksAll.filter(s => s.is_completed).length;
    const totalPeriodItems = periodTasks.length + periodSubtasksAll.length;
    const totalPeriodCompleted = periodCompletedTasks + periodCompletedSubtasks;
    
    const completionRate = totalPeriodItems > 0 
      ? Math.round((totalPeriodCompleted / totalPeriodItems) * 100)
      : 0;

    // Previous period completion rate for comparison
    const prevPeriodTasks = tasks.filter(t => {
      if (t.is_template) return false;
      const createdDate = new Date(t.created_at);
      return createdDate >= prevStart && createdDate <= prevEnd;
    });
    const prevPeriodSubtasksAll = subtasks.filter(s => {
      const createdDate = new Date(s.created_at);
      return createdDate >= prevStart && createdDate <= prevEnd;
    });
    
    const prevCompletedTasks = prevPeriodTasks.filter(t => t.is_completed).length;
    const prevCompletedSubtasks = prevPeriodSubtasksAll.filter(s => s.is_completed).length;
    const totalPrevItems = prevPeriodTasks.length + prevPeriodSubtasksAll.length;
    const totalPrevCompleted = prevCompletedTasks + prevCompletedSubtasks;
    
    const prevCompletionRate = totalPrevItems > 0 
      ? Math.round((totalPrevCompleted / totalPrevItems) * 100)
      : 0;

    const completionRateChange = prevCompletionRate > 0 
      ? completionRate - prevCompletionRate
      : completionRate > 0 ? completionRate : 0;

    // Pending tasks (not completed main tasks + subtasks)
    const pendingMainTasks = tasks.filter(t => !t.is_template && !t.is_completed).length;
    const pendingSubtasks = subtasks.filter(s => !s.is_completed).length;
    const totalPending = pendingMainTasks + pendingSubtasks;

    return {
      completed: current.completed,
      completedChange,
      streak,
      completionRate,
      completionRateChange,
      pendingTasks: totalPending,
      pendingMainTasks,
      pendingSubtasks
    };
  }, [dateRanges, tasks, subtasks, streak]);

  // Generate chart data based on period
  const chartData = useMemo(() => {
    const { currentStart, currentEnd } = dateRanges;
    const completedItems = [
      ...tasks.filter(t => !t.is_template && t.is_completed).map(t => ({
        completed_at: t.completed_at || t.created_at
      })),
      ...subtasks.filter(s => s.is_completed).map(s => ({
        completed_at: s.created_at
      }))
    ];

    switch (period) {
      case 'today': {
        const data: { label: string; count: number }[] = [];
        for (let i = 0; i < 24; i++) {
          const hourStart = new Date(currentStart);
          hourStart.setHours(i, 0, 0, 0);
          const hourEnd = new Date(hourStart);
          hourEnd.setHours(i + 1, 0, 0, 0);
          const count = completedItems.filter(item => {
            const completed = new Date(item.completed_at);
            return completed >= hourStart && completed < hourEnd;
          }).length;
          data.push({ label: format(hourStart, 'ha'), count });
        }
        return data;
      }
      case 'last7days':
      case 'thisWeek': {
        const days = eachDayOfInterval({ start: currentStart, end: currentEnd });
        return days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = completedItems.filter(item => 
            format(new Date(item.completed_at), 'yyyy-MM-dd') === dateStr
          ).length;
          return { label: format(day, 'EEE'), count };
        });
      }
      case 'thisMonth': {
        const weeks = eachWeekOfInterval({ start: currentStart, end: currentEnd }, { weekStartsOn: 1 });
        return weeks.map((weekStart, idx) => {
          const weekEnd = idx === weeks.length - 1 ? currentEnd : subDays(weeks[idx + 1], 1);
          const count = completedItems.filter(item => {
            const completed = new Date(item.completed_at);
            return completed >= weekStart && completed <= weekEnd;
          }).length;
          return { label: `Week ${idx + 1}`, count };
        });
      }
      case 'thisYear': {
        const months = eachMonthOfInterval({ start: currentStart, end: currentEnd });
        return months.map(monthStart => {
          const monthEnd = endOfMonth(monthStart);
          const actualEnd = monthEnd > currentEnd ? currentEnd : monthEnd;
          const count = completedItems.filter(item => {
            const completed = new Date(item.completed_at);
            return completed >= monthStart && completed <= actualEnd;
          }).length;
          return { label: format(monthStart, 'MMM'), count };
        });
      }
    }
  }, [period, dateRanges, tasks, subtasks]);

  // Last 4 weeks comparison (for week view) - with actual date ranges
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; dateRange: string; completed: number; isCurrent: boolean }[] = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
      const weekEnd = i === 0 ? now : endOfWeek(weekStart, { weekStartsOn: 1 });
      const completed = tasks.filter(t => {
        if (!t.completed_at || t.is_template) return false;
        const completedDate = new Date(t.completed_at);
        return completedDate >= weekStart && completedDate <= weekEnd;
      }).length;
      
      // Format as "Jan 1 - Jan 7"
      const dateRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
      
      weeks.push({ 
        label: i === 0 ? 'This Week' : `Week ${4 - i}`,
        dateRange,
        completed,
        isCurrent: i === 0
      });
    }
    
    return weeks;
  }, [tasks]);

  // Calculate weekly average
  const weeklyAverage = useMemo(() => {
    const total = weeklyComparison.reduce((sum, w) => sum + w.completed, 0);
    return Math.round(total / weeklyComparison.length);
  }, [weeklyComparison]);

  // Insights based on data
  const insights = useMemo(() => {
    const insightsList: string[] = [];
    
    if (metrics.completedChange > 20) {
      insightsList.push(`Great momentum! You completed ${metrics.completedChange}% more tasks than the previous period.`);
    } else if (metrics.completedChange < -20) {
      insightsList.push(`Your productivity dipped ${Math.abs(metrics.completedChange)}%. Consider breaking tasks into smaller pieces.`);
    }

    if (streak >= 7) {
      insightsList.push(`Amazing ${streak}-day streak! Consistency is your superpower.`);
    } else if (streak === 0) {
      insightsList.push('Start a new streak today by completing one small task.');
    }

    if (metrics.completionRate >= 80) {
      insightsList.push('Excellent completion rate! You\'re crushing your goals.');
    } else if (metrics.completionRate < 50) {
      insightsList.push('Try prioritizing fewer tasks each day to improve your completion rate.');
    }

    return insightsList.slice(0, 2);
  }, [metrics, streak]);

  const maxChartValue = Math.max(...chartData.map(d => d.count), 1);
  const maxWeeklyValue = Math.max(...weeklyComparison.map(w => w.completed), 1);

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

  const MetricCard = ({ 
    title, 
    value, 
    suffix = '', 
    change, 
    icon: Icon,
    id 
  }: { 
    title: string; 
    value: number; 
    suffix?: string; 
    change?: number; 
    icon: React.ElementType;
    id: string;
  }) => (
    <Card 
      className={`bg-card border border-border/50 transition-all duration-300 cursor-pointer hover:border-border ${
        expandedMetric === id ? 'ring-2 ring-primary/20' : ''
      }`}
      onClick={() => setExpandedMetric(expandedMetric === id ? null : id)}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {change !== undefined && (
            <span className={`text-xs font-medium flex items-center gap-0.5 ${
              change >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change >= 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
        <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          <AnimatedNumber value={value} duration={800} suffix={suffix} />
        </p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );

  const HorizontalBar = ({ 
    label, 
    value, 
    maxValue, 
    showValue = true,
    subtitle,
    highlight = false,
    average
  }: { 
    label: string; 
    value: number; 
    maxValue: number; 
    showValue?: boolean;
    subtitle?: string;
    highlight?: boolean;
    average?: number;
  }) => {
    const isAboveAverage = average !== undefined && value >= average;
    const isBelowAverage = average !== undefined && value < average && value > 0;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`group cursor-pointer p-3 rounded-lg transition-colors ${highlight ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/30'}`}>
            <div className="flex items-center justify-between text-sm mb-2">
              <div>
                <span className={`font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                {subtitle && <span className="text-xs text-muted-foreground ml-2">{subtitle}</span>}
              </div>
              {showValue && (
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
                  {isAboveAverage && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                  {isBelowAverage && <TrendingDown className="h-3.5 w-3.5 text-amber-500" />}
                </div>
              )}
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${highlight ? 'bg-primary' : 'bg-primary/70'} group-hover:bg-primary`}
                style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{value} tasks completed</p>
          {average !== undefined && <p className="text-xs text-muted-foreground">Average: {average}/week</p>}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="min-h-screen bg-background transition-all duration-300">
      <NavBar />

      <main className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header with Period Selector */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
              <div className="flex items-center gap-2">
                {/* Month selector - shown when thisMonth is selected */}
                {period === 'thisMonth' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 text-sm">
                        {monthNames[selectedMonth]}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 max-h-64 overflow-y-auto bg-popover">
                      {availableMonths
                        .filter(m => m.year === selectedYear)
                        .sort((a, b) => b.month - a.month)
                        .map(({ month }) => (
                          <DropdownMenuItem 
                            key={month} 
                            onClick={() => setSelectedMonth(month)}
                            className={selectedMonth === month ? 'bg-accent' : ''}
                          >
                            {monthNames[month]}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Year selector - shown when thisMonth or thisYear is selected */}
                {(period === 'thisMonth' || period === 'thisYear') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 text-sm">
                        {selectedYear}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-28 max-h-64 overflow-y-auto bg-popover">
                      {availableYears.map(year => (
                        <DropdownMenuItem 
                          key={year} 
                          onClick={() => {
                            setSelectedYear(year);
                            // Reset month to first available month in that year
                            const monthsInYear = availableMonths.filter(m => m.year === year);
                            if (monthsInYear.length > 0 && !monthsInYear.some(m => m.month === selectedMonth)) {
                              setSelectedMonth(monthsInYear[0].month);
                            }
                          }}
                          className={selectedYear === year ? 'bg-accent' : ''}
                        >
                          {year}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Period selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 text-sm">
                      {periodLabels[period]}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {(Object.keys(periodLabels) as TimePeriod[]).map(p => (
                      <DropdownMenuItem 
                        key={p} 
                        onClick={() => setPeriod(p)}
                        className={period === p ? 'bg-accent' : ''}
                      >
                        {periodLabels[p]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard 
                id="completed"
                title="Tasks Completed" 
                value={metrics.completed} 
                change={metrics.completedChange}
                icon={CheckCircle2}
              />
              <MetricCard 
                id="pending"
                title="Pending Tasks" 
                value={metrics.pendingTasks}
                icon={Clock}
              />
              <MetricCard 
                id="streak"
                title="Current Streak" 
                value={streak}
                suffix=" days"
                icon={Flame}
              />
              <MetricCard 
                id="rate"
                title="Completion Rate" 
                value={metrics.completionRate}
                suffix="%"
                change={metrics.completionRateChange}
                icon={Target}
              />
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/30"
                  >
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{insight}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Week View - Daily Activity + Comparison */}
            {(period === 'last7days' || period === 'thisWeek') && (
              <>
                {/* Daily Activity Bars */}
                <Card className="border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Daily Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="flex items-end justify-between gap-2 h-32 mb-4">
                      {chartData.map((item, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group">
                              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                {item.count > 0 ? item.count : ''}
                              </span>
                              <div 
                                className="w-full bg-primary/80 rounded-md transition-all duration-300 group-hover:bg-primary" 
                                style={{
                                  height: `${maxChartValue > 0 ? (item.count / maxChartValue) * 80 : 0}px`,
                                  minHeight: item.count > 0 ? '8px' : '3px',
                                  opacity: item.count > 0 ? 1 : 0.2
                                }} 
                              />
                              <span className="text-xs text-muted-foreground">{item.label}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.count} tasks completed</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Progress */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Weekly Progress
                      </CardTitle>
                      <div className="text-xs text-muted-foreground">
                        Avg: <span className="font-medium text-foreground">{weeklyAverage}</span>/week
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5 space-y-2">
                    {weeklyComparison.map((week, i) => (
                      <HorizontalBar 
                        key={i}
                        label={week.label}
                        subtitle={week.dateRange}
                        value={week.completed}
                        maxValue={maxWeeklyValue}
                        highlight={week.isCurrent}
                        average={weeklyAverage}
                      />
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Month View */}
            {period === 'thisMonth' && (
              <>
                {/* Weekly Breakdown */}
                <Card className="border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Weekly Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5 space-y-4">
                    {chartData.map((item, i) => (
                      <HorizontalBar 
                        key={i}
                        label={item.label}
                        value={item.count}
                        maxValue={maxChartValue}
                      />
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Year View */}
            {period === 'thisYear' && (
              <>
                {/* Monthly Breakdown */}
                <Card className="border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Monthly Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {chartData.map((item, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                              <p className="text-lg sm:text-xl font-bold text-foreground">{item.count}</p>
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.count} tasks completed</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Goal Achievement */}
                <Card className="border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Goal Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5 space-y-4">
                    <HorizontalBar 
                      label="Tasks Completed"
                      value={metrics.completed}
                      maxValue={Math.max(metrics.completed, 100)}
                    />
                    <HorizontalBar 
                      label="Completion Rate"
                      value={metrics.completionRate}
                      maxValue={100}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {/* Activity Heatmap */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Activity Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <ActivityHeatmap tasks={tasks} subtasks={subtasks} months={4} />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

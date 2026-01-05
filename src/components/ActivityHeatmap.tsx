import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Task {
  id: string;
  completed_at: string | null;
  is_template?: boolean;
}

interface Subtask {
  id: string;
  is_completed: boolean;
  created_at: string;
}

interface ActivityHeatmapProps {
  tasks: Task[];
  subtasks: Subtask[];
  months?: number;
}

export function ActivityHeatmap({ tasks, subtasks, months = 4 }: ActivityHeatmapProps) {
  const heatmapData = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, months - 1));
    const endDate = now;
    
    // Get all days in range
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Count completions per day
    const completionMap: Record<string, number> = {};
    
    // Count task completions
    tasks.forEach(task => {
      if (task.completed_at && !task.is_template) {
        const dateKey = format(new Date(task.completed_at), 'yyyy-MM-dd');
        completionMap[dateKey] = (completionMap[dateKey] || 0) + 1;
      }
    });
    
    // Count subtask completions (using created_at as proxy for completion)
    subtasks.forEach(subtask => {
      if (subtask.is_completed) {
        const dateKey = format(new Date(subtask.created_at), 'yyyy-MM-dd');
        completionMap[dateKey] = (completionMap[dateKey] || 0) + 1;
      }
    });
    
    // Find max for color scaling
    const counts = Object.values(completionMap);
    const maxCount = Math.max(...counts, 1);
    
    // Group days by week for grid display
    const weeks: { date: Date; count: number; dateKey: string }[][] = [];
    let currentWeek: { date: Date; count: number; dateKey: string }[] = [];
    
    // Pad first week with empty cells
    const firstDayOfWeek = getDay(days[0]);
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: subDays(days[0], firstDayOfWeek - i), count: -1, dateKey: '' });
    }
    
    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const count = completionMap[dateKey] || 0;
      
      currentWeek.push({ date: day, count, dateKey });
      
      if (getDay(day) === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return { weeks, maxCount };
  }, [tasks, subtasks, months]);

  const getIntensityClass = (count: number, maxCount: number) => {
    if (count < 0) return 'bg-transparent';
    if (count === 0) return 'bg-muted/30';
    
    const intensity = count / maxCount;
    if (intensity <= 0.25) return 'bg-primary/25';
    if (intensity <= 0.5) return 'bg-primary/50';
    if (intensity <= 0.75) return 'bg-primary/75';
    return 'bg-primary';
  };

  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    heatmapData.weeks.forEach((week, weekIndex) => {
      const validDay = week.find(d => d.count >= 0);
      if (validDay) {
        const month = validDay.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ label: format(validDay.date, 'MMM'), weekIndex });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [heatmapData.weeks]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-fit">
          {/* Month labels */}
          <div className="flex ml-8 sm:ml-10">
            {monthLabels.map(({ label, weekIndex }, i) => (
              <span
                key={i}
                className="text-[10px] sm:text-xs text-muted-foreground"
                style={{ 
                  marginLeft: i === 0 ? `${weekIndex * 14}px` : undefined,
                  width: i < monthLabels.length - 1 
                    ? `${(monthLabels[i + 1].weekIndex - weekIndex) * 14}px` 
                    : 'auto'
                }}
              >
                {label}
              </span>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col justify-between py-0.5 w-6 sm:w-8">
              {dayLabels.map((day, i) => (
                <span key={day} className={cn(
                  "text-[9px] sm:text-[10px] text-muted-foreground h-3",
                  i % 2 === 1 && "invisible sm:visible"
                )}>
                  {day.slice(0, 2)}
                </span>
              ))}
            </div>
            
            {/* Weeks grid */}
            <div className="flex gap-[3px]">
              {heatmapData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => (
                    <Tooltip key={`${weekIndex}-${dayIndex}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-sm transition-colors",
                            getIntensityClass(day.count, heatmapData.maxCount),
                            day.count >= 0 && "hover:ring-1 hover:ring-foreground/30"
                          )}
                        />
                      </TooltipTrigger>
                      {day.count >= 0 && (
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{format(day.date, 'MMM d, yyyy')}</p>
                          <p className="text-muted-foreground">
                            {day.count} {day.count === 1 ? 'task' : 'tasks'} completed
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-2 mt-2 ml-8 sm:ml-10">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Less</span>
            <div className="flex gap-[3px]">
              <div className="w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-sm bg-muted/30" />
              <div className="w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-sm bg-primary/25" />
              <div className="w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-sm bg-primary/50" />
              <div className="w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-sm bg-primary/75" />
              <div className="w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-sm bg-primary" />
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

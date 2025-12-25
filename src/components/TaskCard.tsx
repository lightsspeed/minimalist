import { useState } from 'react';
import { Pencil, Trash2, Share2, Check, Circle, ChevronDown, ChevronUp, GripVertical, Pin, FileText, Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TagBadge } from './TagBadge';
import { SubtaskList } from './SubtaskList';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onShare: (task: Task) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onTogglePin: (id: string) => void;
  onConvertToNote: (task: Task) => void;
  onTagClick?: (tag: string) => void;
}

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onShare, 
  onToggleComplete,
  onTogglePin,
  onConvertToNote,
  onTagClick 
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAllSubtasksCompleted = () => {
    if (!task.is_completed) {
      onToggleComplete(task.id, true);
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getDueDateStyles = (dateStr: string) => {
    const date = new Date(dateStr);
    if (task.is_completed) return 'text-muted-foreground';
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-primary font-medium';
    return 'text-muted-foreground';
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all duration-200 hover:shadow-md hover:bg-hover-blue animate-fade-in',
        task.is_completed && 'opacity-60',
        task.is_pinned && 'border-primary/30 bg-primary/[0.02]',
        isDragging && 'opacity-50 shadow-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              className="mt-1 flex-shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <button
              onClick={() => onToggleComplete(task.id, !task.is_completed)}
              className="mt-1 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
            >
              {task.is_completed ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {task.is_pinned && (
                  <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
                <h3 className={cn(
                  'font-semibold text-foreground truncate',
                  task.is_completed && 'line-through text-muted-foreground'
                )}>
                  {task.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(task.created_at), 'MMM d, yyyy • h:mm a')}
                </p>
                {task.due_date && (
                  <span className={cn('text-xs flex items-center gap-1', getDueDateStyles(task.due_date))}>
                    <Calendar className="h-3 w-3" />
                    {formatDueDate(task.due_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={cn(
            'flex gap-0.5 transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-100'
          )}>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowSubtasks(!showSubtasks)}
                  >
                    {showSubtasks ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Subtasks</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8', task.is_pinned && 'text-primary')}
                    onClick={() => onTogglePin(task.id)}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{task.is_pinned ? 'Unpin' : 'Pin'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(task)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onConvertToNote(task)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Convert to Note</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:text-primary"
                    onClick={() => onShare(task)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && (
          <p className={cn(
            'text-sm text-muted-foreground mb-3 ml-12',
            task.is_completed && 'line-through'
          )}>
            {task.description}
          </p>
        )}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 ml-12">
            {task.tags.map((tag) => (
              <TagBadge 
                key={tag} 
                tag={tag} 
                onClick={() => onTagClick?.(tag)}
              />
            ))}
          </div>
        )}
        {showSubtasks && (
          <div className="ml-12">
            <SubtaskList taskId={task.id} onAllCompleted={handleAllSubtasksCompleted} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { Pencil, Trash2, Share2, Check, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TagBadge } from './TagBadge';
import { SubtaskList } from './SubtaskList';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onShare: (task: Task) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onTagClick?: (tag: string) => void;
}

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onShare, 
  onToggleComplete,
  onTagClick 
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md animate-fade-in',
        task.is_completed && 'opacity-60'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
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
              <h3 className={cn(
                'font-semibold text-card-foreground truncate',
                task.is_completed && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(task.created_at), 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
          </div>
          <div className={cn(
            'flex gap-1 transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-100'
          )}>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(task)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary"
              onClick={() => onShare(task)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && (
          <p className={cn(
            'text-sm text-muted-foreground mb-3',
            task.is_completed && 'line-through'
          )}>
            {task.description}
          </p>
        )}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <TagBadge 
                key={tag} 
                tag={tag} 
                onClick={() => onTagClick?.(tag)}
              />
            ))}
          </div>
        )}
        {showSubtasks && <SubtaskList taskId={task.id} />}
      </CardContent>
    </Card>
  );
}
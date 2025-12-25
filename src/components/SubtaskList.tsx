import { useState, useEffect } from 'react';
import { Plus, X, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubtasks, Subtask } from '@/hooks/useSubtasks';
import { cn } from '@/lib/utils';

interface SubtaskListProps {
  taskId: string;
}

export function SubtaskList({ taskId }: SubtaskListProps) {
  const { subtasks, loading, addSubtask, updateSubtask, deleteSubtask } = useSubtasks(taskId);
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newSubtask.trim()) return;
    
    await addSubtask(newSubtask.trim());
    setNewSubtask('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewSubtask('');
      setIsAdding(false);
    }
  };

  const handleToggle = async (subtask: Subtask) => {
    await updateSubtask(subtask.id, { is_completed: !subtask.is_completed });
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-2">Loading subtasks...</div>;
  }

  const completedCount = subtasks.filter(s => s.is_completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {totalCount > 0 && (
        <div className="text-xs text-muted-foreground mb-2">
          Subtasks: {completedCount}/{totalCount}
        </div>
      )}
      
      <div className="space-y-1.5">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 group"
          >
            <button
              onClick={() => handleToggle(subtask)}
              className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
            >
              {subtask.is_completed ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
            </button>
            <span
              className={cn(
                'flex-1 text-sm',
                subtask.is_completed && 'line-through text-muted-foreground'
              )}
            >
              {subtask.title}
            </span>
            <button
              onClick={() => deleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Subtask title"
            className="h-7 text-sm"
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAdd}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => {
              setNewSubtask('');
              setIsAdding(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs mt-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add subtask
        </Button>
      )}
    </div>
  );
}

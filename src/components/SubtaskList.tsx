import { useState } from 'react';
import { Plus, X, Check, Circle, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubtasks, Subtask } from '@/hooks/useSubtasks';
import { cn } from '@/lib/utils';

interface SubtaskListProps {
  taskId: string;
  onAllCompleted?: () => void;
}

function SortableSubtask({
  subtask,
  onToggle,
  onDelete,
}: {
  subtask: Subtask;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 group',
        isDragging && 'opacity-50'
      )}
    >
      <button
        className="flex-shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggle}
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
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SubtaskList({ taskId, onAllCompleted }: SubtaskListProps) {
  const { subtasks, loading, addSubtask, updateSubtask, deleteSubtask, reorderSubtasks } = useSubtasks(taskId, {
    onAllCompleted,
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = subtasks.findIndex(s => s.id === active.id);
      const newIndex = subtasks.findIndex(s => s.id === over.id);
      const reordered = arrayMove(subtasks, oldIndex, newIndex);
      reorderSubtasks(reordered);
    }
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
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {subtasks.map((subtask) => (
              <SortableSubtask
                key={subtask.id}
                subtask={subtask}
                onToggle={() => handleToggle(subtask)}
                onDelete={() => deleteSubtask(subtask.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
